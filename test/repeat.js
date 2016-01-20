var assert = require('assert');
var q = require('q');
var exportAll = require('../build/repeat.js').exportAll;
var {Repeat, Scheduler, Action, Permission} = exportAll();
var {toFunctionsArray, callSafely} = exportAll();

describe('Repeat', () => {
  it('throws error if action is not function', () => {
    assert.throws(() => new Repeat({action: 'string', timeout: 100}), Error);
  });

  it('throws error if timeout is not number or function', () => {
    assert.throws(() => new Repeat({action: () => true, timeout: 'string'}), Error);
  });

  it('does not throw error it action is function & timeout is number', () => {
    new Repeat({action: () => true, timeout: 100});
  });

  it('does not throw error it action is function & timeout is function', () => {
    new Repeat({action: () => true, timeout: () => 100});
  });
});


describe('Scheduler', () => {
  it('does not call posts after scheduler is stopped', done => {
    var err = null;
    var s = new Scheduler({
      action: () => {
        return q.Promise(resolve => {
          setTimeout(() => resolve('value'), 10);
        });
      },
      done: [() => err = 'Post is called.'],
      fail: [],
      always: [],
      timeout: () => 100
    });
    s.__onActionInTest = action => {
      // Special post that will be called even after stop.
      action.always.push(() => done(err));
    };
    s.run();
    s.stop();
  });

  it('passes action value to timeout function', done => {
    var err = 'timeout() has not received value as argument';
    var s = new Scheduler({
      action: () => 'value',
      done: [],
      fail: [],
      always: [],
      timeout: value => {
        if (value === 'value') {
          err = null;
        }
        return 10;
      }
    });
    s.run();
    setTimeout(() => {
      s.stop();
      done(err);
    }, 5);
  });

  it('passes value of fulfilled action promise to timeout function', done => {
    var err = 'timeout() has not received value as argument';
    var s = new Scheduler({
      action: () => {
        return q.resolve('value')
      },
      done: [],
      fail: [],
      always: [],
      timeout: value => {
        if (value === 'value') {
          err = null;
        }
        return 10;
      }
    });
    s.run();
    setTimeout(() => {
      s.stop();
      done(err);
    }, 5);
  });
});


describe('Action', () => {
  describe('call()', () => {
    it('calls action function', done => {
      new Action(done, [], [], []).call();
    });

    it('calls callbacks with action result', () => {
      var log = [];
      var action = new Action(
        () => 'value',
        [value => { if (value === 'value') log.push('done') }],
        [value => { if (value === 'value') log.push('fail') }],
        [value => { if (value === 'value') log.push('always') }]
      );
      action.call();
      assert.deepEqual(['done', 'always'], log);
    });

    it('calls callbacks with action error', () => {
      var log = [];
      var thrown = new Error();
      var action = new Action(
        () => {throw thrown},
        [(v, err) => { if (err === thrown) log.push('done') }],
        [(v, err) => { if (err === thrown) log.push('fail') }],
        [(v, err) => { if (err === thrown) log.push('always') }]
      );
      action.call();
      assert.deepEqual(['fail', 'always'], log);
    });

    it('calls callbacks for fulfilled promise', done => {
      var log = [];
      var action = new Action(
        () => q.resolve('value'),
        [value => { if (value === 'value') log.push('done') }],
        [value => { if (value === 'value') log.push('fail') }],
        [value => { if (value === 'value') log.push('always') }]
      );
      action.always.push(() => {
        assert.deepEqual(['done', 'always'], log);
        done();
      });
      action.call();
    });

    it('calls callbacks for rejected promise', done => {
      var log = [];
      var action = new Action(
        () => q.reject('reason'),
        [reason => { if (reason === 'reason') log.push('done') }],
        [reason => { if (reason === 'reason') log.push('fail') }],
        [reason => { if (reason === 'reason') log.push('always') }]
      );
      action.always.push(() => {
        assert.deepEqual(['fail', 'always'], log);
        done();
      });
      action.call();
    });
  });
});


describe('Permission', () => {
  it('can be granted', () => {
    var granted = new Permission(() => true);
    var notGranted = new Permission(() => false);
    assert.ok(granted.granted());
    assert.ok(!notGranted.granted());
  });

  it('cannot be granted after deny() is called', () => {
    var granted = new Permission(() => true);
    var notGranted = new Permission(() => false);
    granted.deny();
    granted.deny();
    assert.ok(!granted.granted());
    assert.ok(!notGranted.granted());
  });

  it('wraps functions with granted()', () => {
    var called = false;
    var call = () => called = true;

    var granted = new Permission(() => true);
    granted.wrap(call)();
    assert.ok(called === true);

    called = false;
    granted.deny();
    granted.wrap(call)();
    assert.ok(called === false);

    called = false;
    var notGranted = new Permission(() => false);
    notGranted.wrap(call)();
    assert.ok(called === false);
  });

  it('wraps function and pass arguments', () => {
    var granted = new Permission(() => true);
    granted.wrap((...args) => {
      assert.deepEqual(['one', 'two'], args);
    })('one', 'two');
  });
});


describe('toFunctionsArray()', () => {
  it('throws error if not function is passed', () => {
    assert.throws(() => toFunctionsArray('s'), Error);
    assert.throws(() => toFunctionsArray(123), Error);
    assert.throws(() => toFunctionsArray({}), Error);
  });

  it('throws error if not functions array is passed', () => {
    assert.throws(() => toFunctionsArray(['s']), Error);
    assert.throws(() => toFunctionsArray([123]), Error);
    assert.throws(() => toFunctionsArray([{}]), Error);
  });

  it('returns empty array for null & undefined', () => {
    assert.deepEqual([], toFunctionsArray(null));
    assert.deepEqual([], toFunctionsArray(undefined));
  });

  it('returns array with passed function', () => {
    var one = () => {};
    assert.deepEqual([one], toFunctionsArray(one));
  });

  it('returns array with passed functions', () => {
    var one = () => {};
    var two = () => {};
    assert.deepEqual([one, two], toFunctionsArray([one, two]));
  });
});

describe('callSafely()', () => {
  it('passes arguments to function', () => {
    callSafely((...args) => {
      assert.deepEqual(['one', 'two'], args);
    }, 'one', 'two');
  });

  it('catches error thrown by function', () => {
    callSafely(() => { throw new Error() });
  });

  it('returns array with function result', () => {
    var [result, error] = callSafely(() => 'value');
    assert.equal('value', result);
  });

  it('returns array with error thrown by function', () => {
    var thrown = new Error();
    var [result, error] = callSafely(() => {throw thrown});
    assert.strictEqual(undefined, result);
    assert.equal(thrown, error);
  });
});
