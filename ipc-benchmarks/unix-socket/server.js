var cluster = require('cluster');

console.log("Starting Unix-socket IPC Benchmark:");
console.log("(1MB transferred in both directions 100 times)");

cluster.setupMaster({
  exec : "worker.js",
  args : [ ]
});

var j = 0;
var buffers = [];
var start;

var net = require('net');
var server = net.createServer(function(c) { 
  c.on('end', function() {
    console.log('server disconnected');
  });
  c.on('data', function(buffer) {
    var last4 = buffer.slice(buffer.length-4).toString('ascii', 0, 4);
    if (last4 == "done") {
      buffers.push(buffer.slice(0, buffer.length-4));
      if (j++ < 100) {
        c.write(Buffer.concat(buffers));
        buffers = [];
        c.write("done");
        process.stdout.write(".");
      } else {
        console.log("\nResults:", (new Date())-start, "ms");
        c.end();
        server.close(function() {
          process.exit(0);
        });
      }
    } else {
      buffers.push(buffer);
    }
  });
  start = new Date();
  c.write(new Buffer(1048576));
  c.write("done");
});
server.listen('/tmp/ipc.benchmark.sock');

var worker = cluster.fork();
