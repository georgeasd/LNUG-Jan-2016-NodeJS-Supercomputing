# Demo
---

## **DO NOT PUT THIS IN (OR NEAR) PRODUCTION**

## The Goal

Node is single threaded. It supports fork'ing to allow multiple instances of node to be run at the same time, but both instances run in total isolation.

Lets hack it around to let us automagically offload compute intensive tasks to other node instances on both the local machine AND other remote machine(s).

## The Theory

1. Node's EventLoop is great at scheduling work within a single process. This is important, because we can run multiple "processes" within the one node process and avoid the costs associated with context switching.
2. Node's Cluster module uses the OS to load balance traffic amongst clustered Node instances.

Suppose we start with a load balancer. This acts as our distributed multithreaded node instance. Behind the load balancer exists 1+ servers, each server is running a node Cluster containing 1+ workers.

At runtime, if we can:

1. Identify which functions are computationally expensive.
2. Convert those into async network requests out and back into the load balancer.
3. The load balancer will pick a server and forward the request on to a server.
4. The server's OS will chose the least busy Node instance in it's Cluster and forward the request on.
5. Node will recieve the request, smash away at the CPU intensive task and respond with the result.
6. The result will be sent back to the original thread (#2).

When each Node Cluster starts, it should ping both localhost and the address of the loadbalancer with a fixed size payload to calculate the cost of traversing the network stack and/or the physical network.

When each Node Cluster starts, it should identify which functions exist at a high level, are asynchronous, pass relatively small amounts of data in/out, (scoping issues) and generally identify good candidates for offloading to another process. Once potential functions have been identified, the first time they are executed it should time each one and attempt to establish how "blocking" each one is.

Following each functions first run, if the cost of handing the work off to the cluster is vastly cheaper than handling the work in the current process, it will be sent out the cluster for computation.

## Running the demo

By default, the demo starts a HTTP server which waits for a request for `http://localhost:8000/go` and proceeds to schedule 10x compute intensive tasks in parallel. They're so intensive that in reality they run one after the other.

If we include this experiment in `server.js`:
```
var multi = require('./multi.js');
multi.loadBalancer('10.9.8.70');
if (multi._isMaster) return;
```

And re-try the demo, it will be significantly faster. Here's the debug output:
```
// Sending in the first request. It goes to Worker #7
Worker 7 Testing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Cost: 191 /repos/multithreaded-node/tasks.js:exports._slowComputation
// The _slowComputation function is benchmarked to take 191ms on the first run
// so it gets exposed out to the cluster. There are still 9x executions to go
// and we're ~200ms in
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
// All 9 subsequent executions are pushed out onto the cluster
Worker 7 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 2 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 3 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 4 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 1 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 5 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 6 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
// At this point, all 7 threads are running the compute heavy function. Since
// these all run in parallel, they should take the same amount of time as running
// one, so we're now ~400ms in. There are still 2x calls left to make. They'll
// get scheduled up on the least busy Node process by the OS.
Worker 2 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 3 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
// The final 2x invocations finish, by the end we've executed the heavy function
// at most 3x times in one thread, so the total time is 3x 190ms + networking overhead
Response Took 773

[ Sending in the second request ]
// Sending in another request without restarting the server results in even
// fast execution as we don't have to benchmark the function again.
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Requesting: 10.9.8.70 /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 1 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 2 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 5 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 6 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 4 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 7 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 3 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
// The first 7x get executed in parallel, then the other 3 follow
Worker 4 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 6 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
Worker 1 Executing: /repos/multithreaded-node/tasks.js:exports._slowComputation
// Total compute time: 2x 190ms + networking overhead
Response Took 579

// The cost of performing this in one thread is 10x 190ms == 1900ms
// If we add more computation power into the cluster we could get the total
// time down to 1x 190ms == 190ms
```
