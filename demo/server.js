var http = require('http');
var Tasks = require('./tasks.js');
var moment = require('moment');

var multi = require('./multi.js');
if (multi._isMaster) return;
multi.loadBalancer('localhost');
// multi.loadBalancer('10.9.8.70');

var server = http.createServer(function(req, res) {
  var startDate = new Date();
  if (req.url != '/go') return res.end();

  var tasks = new Tasks(1, 4567, moment());
  tasks.compute(req.url, function(err, result) {
    res.end(JSON.stringify(arguments,null,2));
    console.log("Response Took", (new Date()) - startDate);
  });
});
server.listen(8000);
console.log("Listening on", 8000)
