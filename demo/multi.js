var multi = { };
module.exports = multi;
multi._terminator = "#~#~#";
multi._functionCache = { };
multi._port = 16006;
multi._debug = true;
multi._locations = [ ];

var net = require('net');
var os = require('os');
var cluster = require('cluster');
var serialiser = require('../serialiser');

var parentModule = module;
while (parentModule.parent) parentModule = parentModule.parent;

multi.loadBalancer = function(address) {
  var location = { hostname: address, overhead: Infinity };
  multi._locations.push(location);
  multi._computeOverhead(location);
};

multi._computeOverhead = function(location) {
  setTimeout(function() {
    var startDate = new Date();
    multi._requestAction({
      host: location.hostname,
      ping: true,
      data: new Buffer(100 * 1024) // 100KB
    }, function() {
      var cost = (new Date()) - startDate;
      if (multi._debug) console.log("Worker", cluster.worker.id, "Overhead:", location.hostname, '=>', cost);
      location.overhead = cost;
      multi._locations.sort(function(a, b) { return a.overhead - b.overhead; });
    });
  }, 2000 + ((Math.random()*15) * 20));
};

multi._spawnCluster = function() {
  cluster.setupMaster({ exec : parentModule.filename });

  var numCPUs = os.cpus().length;
  if (numCPUs > 1) numCPUs--;

  while (numCPUs--) cluster.fork();
};

multi._listenForActions = function() {
  var server = net.createServer(function(connection) {
    var buffers = [];
    connection.on('data', function(buffer) {
      buffers.push(buffer);
      var last4 = buffer.slice(buffer.length-multi._terminator.length).toString('ascii');
      if (last4 != multi._terminator) return;

      var allData = Buffer.concat(buffers);
      allData = allData.slice(0, allData.length-multi._terminator.length);
      request = serialiser.rebuild(allData);
      buffer = null; buffers = null; allData = null;

      if (multi._debug) console.log("Worker", cluster.worker.id, "Request:", request)

      if (request.ping) {
        var serial = serialiser.serialize(request);
        return connection.end(serial + multi._terminator);
      }

      multi._processRequest(request, function() {
        request.params = Array.prototype.slice.call(arguments);
        var serial = serialiser.serialize(request);
        connection.end(serial + multi._terminator);
      });
    });

    connection.on('error', function(details) {
      console.log("Error responding to", multi._port, details);
    });
  })

  server.on('error', function(details) {
    console.log("Failed to listen on", multi._port, details)
  });

  server.listen(multi._port);
};

multi._processRequest = function(request, callback) {
  var functionArgs = request.params;
  functionArgs.push(callback)
  multi._functionCache[request.funcUri].func.apply(request.scope, functionArgs);
};

multi._infectProject = function() {
  multi._findModules(parentModule, [ ], [ ], function(host, funcUri, scope, params, callback) {
    if (multi._debug) console.log("Worker", cluster.worker.id, "Requesting:", host, funcUri);
    var request = {
      host: host,
      funcUri: funcUri,
      scope: scope,
      params: params
    };
    multi._requestAction(request, function(err, response) {
      return callback.apply({ }, Array.prototype.slice.call(arguments));
    });
  });
};

multi._findModules = function(someModule, visitedModules, infectedFunctions, remoteInvocation) {
  if (visitedModules.indexOf(someModule) !== -1) return;
  visitedModules.push(someModule);
  if (someModule.children) {
    someModule.children.map(function(childModule) {
      multi._findModules(childModule, visitedModules, infectedFunctions, remoteInvocation);
    });
  }
  if (someModule.exports &&
     (!someModule.filename.toLowerCase().match(module.filename)) &&
     (someModule.filename.indexOf('serialiser') === -1) &&
     true ) {
    multi._findFunctions(someModule, 'exports', someModule.filename+':exports', infectedFunctions, remoteInvocation);
  }
};

multi._findFunctions = function(someModule, someProperty, funcUri, infectedFunctions, remoteInvocation) {
  if (!someModule.hasOwnProperty(someProperty)) return;
  serialiser.using(funcUri, someModule[someProperty]);

  if ( (someModule[someProperty] instanceof Function) ) {
    var proto = someModule[someProperty].prototype;
    if (proto && (Object.keys(proto).length > 0)) {
      serialiser.using(funcUri+'.prototype', proto);
      multi._findFunctions(someModule[someProperty], 'prototype', funcUri+'.prototype', infectedFunctions, remoteInvocation);
    }
    if (someProperty.indexOf('_') === 0) {
      multi._infectFunction(someModule, someProperty, funcUri, infectedFunctions, remoteInvocation);
    }
  }
  if (someModule[someProperty] instanceof Object) {
    for (var newProperty in someModule[someProperty]) {
      multi._findFunctions(someModule[someProperty], newProperty, funcUri+'.'+newProperty, infectedFunctions, remoteInvocation);
    }
  }
  return someModule;
};

multi._infectFunction = function(someModule, someProperty, funcUri, infectedFunctions, remoteInvocation) {
  var originalFunction = someModule[someProperty];
  if (infectedFunctions.indexOf(originalFunction) !== -1) return;

  if (this._debug) console.log("Worker", cluster.worker.id, "Examining:", funcUri);

  var funcInfo = {
    func: originalFunction,
    cost: Infinity,
    blocker: true,
    safe: true
  }

  var newFunction = function() {
    return (function() {
      var functionArgs = Array.prototype.slice.call(arguments);
      var self = this;

      if (funcInfo.cost == Infinity) {
        if (multi._debug) console.log("Worker", cluster.worker.id, "Testing:", funcUri);
        var startDate = new Date();
        process.nextTick(function() {
          funcInfo.blocker = (funcInfo.cost != Infinity);
        });
        var before = serialiser.serialize(self);
        var result = originalFunction.apply(self, functionArgs);
        var after = serialiser.serialize(self);
        // console.log(before, after)
        funcInfo.cost = (new Date()) - startDate;
        if (multi._debug) console.log("Worker", cluster.worker.id, "Cost:", funcInfo.cost, "Safe:", before==after, funcUri);
        funcInfo.threadSafe = true; // (before==after) ??
        if ((multi._locations[0].overhead > funcInfo.cost) || !funcInfo.threadSafe){
          if (self._debug) console.log("Worker", cluster.worker.id, "Rolling back:", funcUri);
          someModule[someProperty] = originalFunction;
        }
        return result;
      }

      var cb = functionArgs.slice(-1).pop();
      if (!(cb instanceof Function)) {
        if (self._debug) console.log("Worker", cluster.worker.id, "No callback:", funcUri);
        return originalFunction.apply(self, functionArgs);
      }

      functionArgs.pop();
      var host = null;
      for (var i=multi._locations.length-1; i>=0; i--) {
        if (multi._locations[i].overhead < funcInfo.cost) {
          host = multi._locations[i].hostname;
          break;
        }
      }
      if (!host) {
        if (self._debug) console.log("Worker", cluster.worker.id, "No host to execute:", funcUri);
        return originalFunction.apply(self, functionArgs);
      }
      remoteInvocation(host, funcUri, self, functionArgs, function() {
        return cb.apply(self, Array.prototype.slice.call(arguments));
      });
      return null;
    }).apply(this, Array.prototype.slice.call(arguments));
  };

  someModule[someProperty] = newFunction;

  infectedFunctions.push(originalFunction);
  infectedFunctions.push(newFunction);
  multi._functionCache[funcUri] = funcInfo;
};

multi._requestAction = function(request, callback) {
  var connection = net.connect({ host: request.host, port: multi._port });
  var serial = serialiser.serialize(request);
  connection.write(serial + multi._terminator);
  var buffers = [];
  connection.on('data', function(buffer) {
    buffers.push(buffer);
    var last4 = buffer.slice(buffer.length-multi._terminator.length).toString('ascii');
    if (last4 != multi._terminator) return;

    var allData = Buffer.concat(buffers);
    var response = allData.slice(0, allData.length-multi._terminator.length);
    response = serialiser.rebuild(response);
    // In the dream world, we'd adjust `this` here...
    // but that won't work because racehazard.
    return callback.apply({ }, response.params);
  });

  connection.on('error', function(details) {
    console.log("Error connecting to", multi._port, details);
  });
};



if (cluster.isMaster) {
  multi._spawnCluster();
  multi._isMaster = true;
} else {
  multi._listenForActions();
  multi._infectProject();
}
