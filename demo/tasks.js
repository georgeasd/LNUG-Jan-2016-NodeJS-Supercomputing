var async = require('async');
var moment = require('moment');

var tasks = function(a, b, startDate) {
  this.a = a;
  this.b = b;
  this.startDate = startDate;
};
module.exports = tasks;

tasks.prototype.compute = function(params, callback) {
  var work = [ ];
  var self = this;
  var workStart = moment();

  for (var i=0; i<20; i++) {
    work.push(function(cb) { self._slowComputation(params, workStart, cb) });
  }

  async.parallel(work, callback);
};

tasks.prototype._slowComputation = function(params, date, callback) {
  // console.log("Date is moment?", moment.isMoment(date), 'Year:', date.format('YYYY'), "this:", JSON.stringify(this));
  var t = 0;
  for (var i=0; i<100000; i++) {
    for (var j=0; j<4000; j++) {
      t += i * j;
    }
  }
  return callback(null, t);
};
