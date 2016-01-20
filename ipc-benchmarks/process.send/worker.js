var cluster = require('cluster');

process.on('message', function(data) {
  process.send(data);
})
