var cluster = require('cluster');
var fs = require("fs");
var client = require('redis').createClient(6379, "10.9.8.70");
var client2 = require('redis').createClient(6379, "10.9.8.70");

client.on('ready', function() {
  client.subscribe('2');
  console.log("worker-sub");
});

client.on('message', function(channel, path) {
  var data = fs.readFileSync(path);
  fs.unlinkSync(path);
  fs.writeFileSync(path, data);
  client2.publish('1', path);
})
