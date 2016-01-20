var cluster = require('cluster');
var fs = require("fs");

var dgram = require("dgram");
var server = dgram.createSocket("udp4");

server.on("message", function (path) {
  path = path.toString('ascii');
  var data = fs.readFileSync(path);
  fs.unlinkSync(path);
  fs.writeFileSync(path, data);
  sendUdp(path);
})
server.bind(8125);


function sendUdp(buffer) {
  var client = dgram.createSocket("udp4");
  var buffer = new Buffer(buffer);
  client.send(buffer, 0, buffer.length, 8124, "localhost");
}