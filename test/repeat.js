var assert = require('assert');
var q = require('q');
var exportAll = require('../build/repeat.js').exportAll;
var {Repeat, Scheduler, Action, Permission} = exportAll();

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
        return q.Promise((resolve) => {
          setTimeout(resolve.bind(null, 'value'), 10);
        });
      },
      posts: [() => { err = 'Post is called.'; }],
      timeout: 100
    });
    s.action.addPost(() => done(err), true); // Use interval api to test.
    s.run();
    s.stop();
  });

  it('passes action value to timeout function', done => {
    var err = 'timeout() has not received value as argument';
    var s = new Scheduler({
      action: () => 'value',
      posts: [],
      timeout: (value) => {
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
      posts: [],
      timeout: (value) => {
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
      new Action(done).call();
    });

    it('does not call action function if permit function forbids', done => {
      var err = null;
      var action = new Action(() => {err = 'Action is called.'}, () => false);
      action.call();
      done(err);
    });

    it('calls post', () => {
      var action = new Action(() => 'value');
      action.addPost((value) => {
        assert.equal('value', value);
      });
      action.call();
    });

    it('calls post for resolved promise', done => {
      var action = new Action(() => q.resolve('value'));
      action.addPost((value) => {
        assert.equal('value', value);
        done();
      });
      action.call();
    });

    it('calls post for rejected promise', done => {
      var action = new Action(() => q.reject('reason'));
      action.addPost((reason) => {
        assert.equal('reason', reason);
        done();
      }, true);
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
});
