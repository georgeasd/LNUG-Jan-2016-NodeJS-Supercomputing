var hxSerializer = require('./index.js');
var assert = require('assert');
var util = require('util');

var moment = require('moment');
hxSerializer.using("moment", moment);

function ClassA() { this.class = 'A'; };
ClassA.prototype.print = function() { return this.class; };
ClassA.prototype.toJSON = function() { return 'Mwohahaahaaa'; };
hxSerializer.using("ClassA", ClassA);

function SuperClass() { this.super = true };
SuperClass.prototype.test = function() { return 'super'; };

function ClassB() { this.class = 'B'; };
util.inherits(ClassB, SuperClass);
ClassB.prototype.print = function() { return this.class; };
hxSerializer.using("ClassB", ClassB);


var test = {
  date: new Date(),
  moment: moment(),
  buffer: new Buffer(100),
  string: "string",
  a: new ClassA(),
  b: new ClassB(),
  common1: { a: 1 },
}

test.common2 = test.common1;
test.backLink = test;
assert.equal(test.a.toJSON(), 'Mwohahaahaaa');
assert.ok(test.b instanceof ClassB);
assert.ok(test.b instanceof SuperClass);

var serial = hxSerializer.serialize(test);
var clone = hxSerializer.rebuild(serial);
console.log("Serialised to: ", serial);
console.log("Rebuilt into: ", clone)

// Original object should be unchanged
assert.ok(test.date instanceof Date);
assert.ok(test.buffer instanceof Buffer);

// References to the same objects should persist
clone.common2.test = 'foo';
assert.equal(clone.common1.test, 'foo');

// Circular references should persist
assert.equal(clone, clone.backLink);

// Prototypes should be maintained
assert.ok(clone.a instanceof ClassA);
assert.ok(clone.a.print(), 'A');
assert.ok(clone.b instanceof ClassB);
assert.ok(clone.b instanceof SuperClass);
assert.ok(clone.b.print(), 'B');
assert.ok(moment.isMoment(clone.moment));
assert.equal(clone.moment.format('YYYY'), moment().format('YYYY'));

// Dates should persist
assert.ok(clone.date instanceof Date);

// Buffer should persist
assert.ok(test.buffer instanceof Buffer);
assert.ok(clone.buffer instanceof Buffer);

// toJSON overrides should persist
assert.equal(test.a.toJSON(), 'Mwohahaahaaa');
assert.equal(clone.a.toJSON(), 'Mwohahaahaaa');

console.log("All good");
