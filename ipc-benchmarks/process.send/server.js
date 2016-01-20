var cluster = require('cluster');

console.log("Starting process.send IPC Benchmark:");
console.log("(1MB transferred in both directions 100 times)");


cluster.setupMaster({
  exec : "worker.js",
  args : [ ]
});

var i = 0;

var worker = cluster.fork();
worker.on('message', function(data) {
  if (i++ <100) {
    worker.send(data);
    process.stdout.write(".");
  } else {
    done();
  }
});

start = new Date();
worker.send(JSON.stringify(new Buffer(1048576)));

function done() {
  console.log("\nResults:", (new Date())-start, "ms");
  process.exit(0);
};
