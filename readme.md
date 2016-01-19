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
  post,    // Optional. A function or a list of functions.
           // Functions in a list are called independently with the same value as argument.
           // Called after the action with returned value or
           // after fulfilled promise with its value.
  timeout, // A number or a function returning a number.
  permit,  // Optional. A function returning a boolean value
           // permitting or forbidding next action call. It does not stop the loop.
};

var loop = new Repeat(options);

loop.run();  // Call the action & schedule next calls.
loop.call(); // Call the action before the timeout is over.
loop.stop(); // Stop the loop. Scheduled post function will not be called.
             // The loop may be started again with loop.run().

```

## Examples

```js
var reload = new Repeat({
  action: loadEntities,
  post: function(entities) {
    process(entities);
  },
  timeout: 5000
});

var reload2 = new Repeat({
  action: loadEntities,
  post: [update, process],
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

