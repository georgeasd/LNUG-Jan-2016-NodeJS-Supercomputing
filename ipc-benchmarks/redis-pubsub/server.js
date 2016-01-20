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

setTimeout(function() {
  start = new Date();
  client2.publish('1', JSON.stringify(new Buffer(1048576)));
  console.log(".");
}, 1000);

var client = require('redis').createClient(6379, "127.0.0.1");
var client2 = require('redis').createClient(6379, "127.0.0.1");

client.on('ready', function() {
  client.subscribe('1');
  console.log("server-sub");
});

client.on('message', function(channel, message) {
  console.log("server got");
  if (i++ <100) {
    var message = JSON.parse(message);
    client2.publish('1', JSON.stringify(message));
    console.log("server send");
  } else {
    done();
  }
});


function done() {
  console.log("\nResults:", (new Date())-start, "ms");
  process.exit(0);
};
