var cluster = require('cluster');

console.log("Starting UDP IPC Benchmark:");
console.log("(1MB transferred in both directions 100 times)");

cluster.setupMaster({
  exec : "worker.js",
  args : [ ]
});

var j = 0;
var buffers = [];
var start;

var dgram = require("dgram");
var server = dgram.createSocket("udp4");

server.on("message", function (buffer) {
  var last4 = buffer.slice(buffer.length-4).toString('ascii', 0, 4);
  if (last4 == "done") {
    buffers.push(buffer.slice(0, buffer.length-4));
    if (j++ < 100) {
      sendUdp(Buffer.concat(buffers));
      buffers = [];
      sendUdp("done");
      process.stdout.write(".");
    } else {
      console.log("\nResults:", (new Date())-start, "ms");
      process.exit(0);
    }
  } else {
    buffers.push(buffer);
  }
});

server.bind(8124);

var worker = cluster.fork();

setTimeout(function() {
  start = new Date();
  sendUdp(new Buffer(1048576));
}, 1000);

function sendUdp(buffer, callback) {
  var i=0, j=0;
  var sendNext = function() {
    if (i > buffer.length) return;
    var buf = buffer.slice(i, i+65400);
    var client = dgram.createSocket("udp4");
    console.log("?", buf.length)
    client.send(buf, 0, buf.length, 8125, "localhost", function() {
      console.log("Send", buf.length);
      i+= 65400;
      setTimeout(function() {
        sendNext();
      },100);
    });
  };
  sendNext();
}
