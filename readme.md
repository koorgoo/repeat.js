# repeat.js

## Examples

```js
var reload = new Repeat({
  action: loadEntities,      // Return promise.
  post: function(entities) { // Called with value of fulfilled promise.
    ...
  },
  timeout: 5000
});

reload.run();        // Call action & schedule next call.
reload.callAction(); // Call action before timeout is over.
reload.stop();       // Cancel next action calls.
                     // Cancel call of post function for unfulfilled / unrejected yet promises.


var recalc = new Repeat({
  action: recalculatePrices,
  timeout: function() {
    var longer = (Math.random() >= 0.5);   // Return dynamic timeout.
    return longer ? 2000 : 1000;
  },
  permit: function() {
    return (Math.random() >= 0.5);         // Call action with 50% chance.
  }
});

```
