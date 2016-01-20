var cluster = require('cluster');

var buffers = [];

var net = require('net');
var client = net.connect({ path: '/tmp/ipc.benchmark.sock' });
client.on('data', function(buffer) {
  var last4 = buffer.slice(buffer.length-4).toString('ascii', 0, 4);
  if (last4 == "done") {
  	buffers.push(buffer.slice(0, buffer.length-4));
	client.write(Buffer.concat(buffers));
	buffers = [];
	client.write("done");
  } else {
    buffers.push(buffer);
  }
});
