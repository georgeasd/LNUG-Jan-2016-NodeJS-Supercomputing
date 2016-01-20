var cluster = require('cluster');

var buffers = [];
var dgram = require("dgram");
var server = dgram.createSocket("udp4");

server.on("message", function (buffer) {
  console.log("Got", buffer.length);
  var last4 = buffer.slice(buffer.length-4).toString('ascii', 0, 4);
  if (last4 == "done") {
  	buffers.push(buffer.slice(0, buffer.length-4));
  	var total = Buffer.concat(buffers);
    for(var i=0; i<total.length; i+= 65400) {
      sendUdp(total.slice(i, i+65400));
    }
  	buffers = [];
  	sendUdp("done");
  } else {
    buffers.push(buffer);
    for (var aa = 0; aa<500000000; aa++ ) {
      var bb =0;
      bb+= aa+1;
    }
  }
});

server.bind(8125, function() {
});

function sendUdp(buffer) {
  var client = dgram.createSocket("udp4");
  client.send(buffer, 0, buffer.length, 8124, "localhost");
}