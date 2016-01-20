var cluster = require('cluster');
var fs = require("fs");

process.on('message', function(path) {
	fs.readFile(path, function(err, data) {
	  fs.unlink(path, function(err) {
	    fs.writeFile(path, data, function(err) {
	      process.send(path);
	      process.stdout.write(".");
	    });
	  });
	});
})
