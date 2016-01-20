# repeat.js

Smarter setInterval.

## Install

```
bower install --save repeat-action
  npm install --save repeat-action

```

## API

```js
var options = {
  action,  // A function returning a regular value (string, number, object, etc.) or a promise.
  timeout, // A number or a function returning a number.

  done,    // Optional.
  fail,    // A function or a list of functions.
  always,  // Works like jQuery.Deferred handlers.

  permit,  // Optional. A function returning a boolean value
           // permitting or forbidding next action call. It does not stop the loop.
};

var loop = new Repeat(options);

loop.run();  // Call the action & schedule next calls.
loop.call(); // Call the action before the timeout is over.
loop.stop(); // Stop the loop. Scheduled functions will not be called.
             // The loop may be started again with loop.run().

```

## Examples

```js
var reload = new Repeat({
  action: loadEntities,
  done: function(entities) {
    process(entities);
  },
  timeout: 5000
});

var reload2 = new Repeat({
  action: loadEntities,
  done: [update, process],
  timeout: function(entities) {
    var faster = 1000;
    var slower = 10 * faster;
    return (entities.length > 0) ? slower : faster;
  },
  permit: function() {
    return (Math.random() >= 0.5);
  }
});

```

