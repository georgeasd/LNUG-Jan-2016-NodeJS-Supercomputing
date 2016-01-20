var cluster = require('cluster');
var fs = require("fs");

console.log("Starting process.send IPC Benchmark:");
console.log("(1MB transferred in both directions 100 times)");


cluster.setupMaster({
  exec : "worker.js",
  args : [ ]
});

var i = 0;
var dgram = require("dgram");
var server = dgram.createSocket("udp4");

server.on("message", function (path) {
  if (i++ <100) {
    path = path.toString('ascii');
    var data = fs.readFileSync(path);
    fs.unlinkSync(path);
    fs.writeFileSync(path, data);
    sendUdp(path);
    process.stdout.write(".");
  } else {
    done();
  }
});

server.bind(8124);

var worker = cluster.fork();

function sendUdp(buffer) {
  var client = dgram.createSocket("udp4");
  var buffer = new Buffer(buffer);
  client.send(buffer, 0, buffer.length, 8125, "localhost");
}

setTimeout(function() {
  start = new Date();
  var path = "/tmp/fs.ipc.Benchmark";
  fs.writeFileSync(path, new Buffer(1048576));
  sendUdp(path);
}, 100);

function done() {
  console.log("\nResults:", (new Date())-start, "ms");
  process.exit(0);
};
