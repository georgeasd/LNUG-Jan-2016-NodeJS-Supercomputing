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
  client2.hset('test', '1', JSON.stringify(new Buffer(1222333)), function() {
    client2.publish('1', 'test');
    console.log(".");
  });
}, 1000);

var client = require('redis').createClient(6379, "127.0.0.1");
var client2 = require('redis').createClient(6379, "127.0.0.1");

client.on('ready', function() {
  client.subscribe('1');
});

client.on('message', function(channel, message) {
  if (i++ <100) {
    client2.hget(message, 1, function(err, data) {
      client2.hset(message, '1', data, function() {
        process.stdout.write(".");
        client2.publish('2', message);
      });
    });
  } else {
    done();
  }
});

client.on("error", function (err) {
        console.log("Error " + err);
    });


function done() {
  console.log("\nResults:", (new Date())-start, "ms");
  process.exit(0);
};
