var cluster = require('cluster');
var fs = require("fs");

console.log("Starting process.send IPC Benchmark:");
console.log("(1MB transferred in both directions 100 times)");


cluster.setupMaster({
  exec : "worker.js",
  args : [ ]
});

var i = 0;

var worker = cluster.fork();
worker.on('message', function(path) {
  if (i++ <100) {
    fs.readFile(path, function(err, data) {
      fs.unlink(path, function(err) {
        fs.writeFile(path, data, function(err) {
          worker.send(path);
          process.stdout.write(".");
        });
      });
    });
  } else {
    done();
  }
});

start = new Date();
var path = "/tmp/fs.ipc.Benchmark";
fs.writeFileSync(path, new Buffer(1048576));
worker.send(path);

function done() {
  console.log("\nResults:", (new Date())-start, "ms");
  process.exit(0);
};
