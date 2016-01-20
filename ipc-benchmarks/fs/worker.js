var cluster = require('cluster');
var fs = require("fs");

process.on('message', function(path) {
  var data = fs.readFileSync(path);
  fs.unlinkSync(path);
  fs.writeFileSync(path, data);
  process.send(path);
})
