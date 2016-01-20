
var client = require('redis').createClient(6379, "127.0.0.1");
var client2 = require('redis').createClient(6379, "127.0.0.1");

client.on('ready', function() {
  client.subscribe('2');
  console.log("worker-sub");
});

client.on('message', function(channel, message) {
  client2.hget(message, 1, function(err, data) {
    client2.hset(message, '1', data, function() {
      client2.publish('1', message);
    });
  });
});

client.on("error", function (err) {
        console.log("Error " + err);
    });

