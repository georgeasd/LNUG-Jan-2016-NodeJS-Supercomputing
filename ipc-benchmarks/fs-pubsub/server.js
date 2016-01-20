var cluster = require('cluster');
var fs = require("fs");

console.log("Starting process.send IPC Benchmark:");
console.log("(1MB transferred in both directions 100 times)");


cluster.setupMaster({
  exec : "worker.js",
  args : [ ]
});

var i = 0;
var client = require('redis').createClient(6379, "10.9.8.70");
var client2 = require('redis').createClient(6379, "10.9.8.70");

client.on('ready', function() {
  client.subscribe('1');
});

setTimeout(function() {
  start = new Date();
  fs.writeFileSync('./smb/fs.ipc.Benchmark', new Buffer(1048576));
  client2.publish('2', './smb/fs.ipc.Benchmark');
}, 1000);

var worker = cluster.fork();
client.on('message', function(channel, path) {
  if (i++ <100) {
    var data = fs.readFileSync(path);
    fs.unlinkSync(path);
    fs.writeFileSync(path, data);
    client2.publish('2', path);
    process.stdout.write(".");
  } else {
    done();
  }
});


function done() {
  console.log("\nResults:", (new Date())-start, "ms");
  process.exit(0);
};
