
var client = require('redis').createClient(6379, "127.0.0.1");
var client2 = require('redis').createClient(6379, "127.0.0.1");

client.on('ready', function() {
  client.subscribe('1');
  console.log("worker-sub");
});

client.on('message', function(channel, message) {
  console.log("client got");
  var message = JSON.parse(message);
  client2.publish('1', JSON.stringify(message));
  console.log("client sent");
});
