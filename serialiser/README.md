# serialiser

```
var serialiser = require('./serialiser.js');
serialiser.using("someFactory", myFactory);
...
var myComplexObject = myFactory.buildMeAnObject();
var serial = serialiser.serialize(myComplexObject);
// [ now send serial over the network, to file, redis, wherever ]
var clone = serialiser.rebuild(serial);
```

serialiser can deal with:

1. Deeply nested complex objects
2. Circular references
3. References to the same object
4. "Class" instances + inheritance
5. Prototypes overriding .toJSON()
6. Dates, Regex's, Buffers
