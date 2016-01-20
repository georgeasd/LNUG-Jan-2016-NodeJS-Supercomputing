var hxSerializer = { };
module.exports = hxSerializer;

hxSerializer._prototypeCache = { };

hxSerializer._addToPrototypeCache = function(funcUri, proto) {
  hxSerializer._prototypeCache[funcUri] = proto;
};

hxSerializer._findPrototypeFromFuncUri = function(funcUri) {
  return hxSerializer._prototypeCache[funcUri] || null;
};

hxSerializer._findFuncUriFromPrototype = function(proto) {
  for (var i in hxSerializer._prototypeCache) {
    if (hxSerializer._prototypeCache[i] == proto) return i;
  }
  return null;
};

hxSerializer._fakeToJson = function() { return this; };

hxSerializer._serializeObject = function(obj, parent, propertyName, visited, path) {
  if (!(obj instanceof Object)) return;

  for (var i=visited.length-1; i>=0; i--) {
    if (visited[i].ref == obj) {
      parent[propertyName] = {
        ___: 'backRef',
        value: visited[i].path
      }
      return;
    }
  }

  visited.push({
    ref: obj,
    path: path
  })

  if (obj instanceof Date) {
    parent[propertyName] = {
      ___: 'date',
      value: obj.toJSON()
    }
    return;
  }
  if (obj instanceof RegExp) {
    parent[propertyName] = {
      ___: 'regexp',
      value: obj.toString()
    }
    return;
  }
  if (obj instanceof Buffer) {
    parent[propertyName] = {
      ___: 'buffer',
      value: obj.toJSON()
    }
    return;
  }

  if (obj.__proto__ && obj.__proto__.toJSON) {
    obj.toJSON = null;
  }

  var proto = Object.getPrototypeOf(obj);
  if (proto && (proto != Object.prototype) && (proto != Array.prototype)) {
    var tmp = hxSerializer._findFuncUriFromPrototype(proto);
    if (tmp) {
      obj.___ = tmp;
    }
  }

  var keys = Object.keys(obj).sort();
  for (var i in keys) {
    hxSerializer._serializeObject(obj[keys[i]], obj, keys[i], visited, path+'.'+keys[i]);
  }
};

hxSerializer._dereference = function(obj, path) {
  var parts = path.split('.');
  var part = parts.shift();
  while (part = parts.shift()) {
    obj = obj[part];
  }
  return obj;
};

hxSerializer._rebuildObject = function(obj, parent, propertyName, root) {
  if (!(obj instanceof Object)) return;
  root = root || obj;

  if (obj.toJSON === null) {
    delete obj.toJSON;
  }

  if (obj.___) {
    if (obj.___ == 'backRef') {
      parent[propertyName] = hxSerializer._dereference(root, obj.value);
    } else if (obj.___ == 'date') {
      parent[propertyName] = new Date(obj.value);
    } else if (obj.___ == 'buffer') {
      parent[propertyName] = new Buffer(obj.value.data ? obj.value.data : obj.value);
    } else if (obj.___ == 'regexp') {
      parent[propertyName] = new RegExp(obj.value);
    } else {
      obj.__proto__ = hxSerializer._findPrototypeFromFuncUri(obj.___);
      delete obj.___;
    }
  }
  for (var i in obj) {
    hxSerializer._rebuildObject(obj[i], obj, i, root);
  }
};

hxSerializer.serialize = function(obj) {
  var parent = { main: obj };
  hxSerializer._serializeObject(obj, parent, 'main', [ ], '');
  var result = JSON.stringify(parent.main);
  hxSerializer._rebuildObject(parent.main);
  return result;
};

hxSerializer.rebuild = function(obj) {
  try {
    obj = JSON.parse(obj);
  } catch(e) { return null; }
  hxSerializer._rebuildObject(obj);
  return obj;
};

hxSerializer.using = function(name, factory) {
  if (!name || !factory) return;
  hxSerializer._addToPrototypeCache(name, factory);

  if ( (factory instanceof Function) ) {
    var proto = factory.prototype;
    if (proto && (Object.keys(proto).length > 0)) {
      hxSerializer._addToPrototypeCache(name+'.prototype', proto);
      hxSerializer.using(name+'.prototype', factory.prototype);
    }
  }
  if (factory instanceof Object) {
    for (var newProperty in factory) {
      hxSerializer.using(name+'.'+newProperty, factory[newProperty]);
    }
  }
  return factory;
};
