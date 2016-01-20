export let exportAll = () => {
  return {
    Repeat,
    Scheduler,
    Action,
    Permission,
    toFunctionsArray,
    callSafely,
  };
};

class Repeat {
  /**
   * Initialize object.
   * @param {Object} options
   * @param {Function} options.action
   * @param {(Number|Function)} options.timeout
   * @param {(Function|Function[])} [options.done]
   * @param {(Function|Function[])} [options.fail]
   * @param {(Function|Function[])} [options.always]
   * @param {Function} [options.permit] - Permission function that does not
   *   stop the loop but inform whether action & posts may be called.
   * @return {Repeat}
   */
  constructor(options) {
    options = options || {};

    if (typeof options.action !== 'function') {
      throw new Error('Action must be a function.');
    }

    var done = toFunctionsArray(options.done);
    var fail = toFunctionsArray(options.fail);
    var always = toFunctionsArray(options.always);

    var timeout;
    if (typeof options.timeout === 'function') {
      timeout = options.timeout;
    } else if (typeof options.timeout === 'number') {
      timeout = () => options.timeout;
    } else {
      throw new Error('Timeout must be a number of a function.');
    }

    var permit;
    if (typeof options.permit === 'function') {
      permit = options.permit;
    } else {
      permit = () => true;
    }

    this.scheduler = new Scheduler({
      action: options.action,
      done: done,
      fail: fail,
      always: always,
      timeout: timeout,
      permit: permit,
    });
  }
  /**
   * Start action calling loop.
   * @return {void}
   */
  run() {
    this.scheduler.run();
  }
  /**
   * Call action out of loop & continue loop after call.
   * @return {void}
   */
  call() {
    this.scheduler.callAction();
  }
  /**
   * Stop action calling loop.
   * @return {void}
   */
  stop() {
    this.scheduler.stop();
  }
}

class Scheduler {
  /**
   * Initialize object.
   * @param {Object} options
   * @param {Function} options.action
   * @param {Function[]} options.done
   * @param {Function[]} options.fail
   * @param {Function[]} options.always
   * @param {Function} options.timeout
   * @param {Function} options.permit
   * @return {Scheduler}
   */
  constructor(options) {
    this.action = options.action;
    this.done = options.done;
    this.fail = options.fail;
    this.always = options.always;
    this.timeout = options.timeout;
    this.permit = options.permit;
  }
  run() {
    var action = this._createAction();
    action.call();
  }
  callAction() {
    this.stop();
    this.run();
  }
  stop() {
    if (this.scheduled) {
      clearTimeout(this.scheduled);
      this.scheduled = null;
    }
    if (this.permission) {
      this.permission.deny();
      this.permission = null;
    }
  }
  /**
   * Return action object with wrapped post functions.
   * @return {Action}
   */
  _createAction() {
    var perm = this.permission = new Permission(this.permit);
    var action = new Action(
      perm.wrap(this.action),
      this.done.map(perm.wrap),
      this.fail.map(perm.wrap)
    );
    action.always = this.always.map(perm.wrap).concat([
      perm.wrap(this._createScheduleCallback(action))
    ]);
    this.__onActionInTest(action);
    return action;
  }
  /**
   * Return function that schedule next action call.
   * @param {Action} action
   * @return {Function}
   */
  _createScheduleCallback(action) {
    var scheduler = this;
    var call = action.call.bind(action);
    return (...args) => {
      var timeout = scheduler.timeout.apply(null, args);
      scheduler.scheduled = setTimeout(call, timeout);
    }
  }
  /**
   * Function added to be overridden in tests.
   * It is called with an action object with added post functions.
   * @param {Action} action
   * @return {void}
   */
  __onActionInTest(action) {}
}

class Action {
  /**
   * Initialize object.
   * @param {Function} action
   * @param {Function[]} done
   * @param {Function[]} fail
   * @param {Function[]} always
   * @return {Action}
   */
  constructor(action, done, fail, always) {
    this.action = action;
    this.done = done;
    this.fail = fail;
    this.always = always;
  }
  call() {
    var [value, error] = callSafely(this.action);
    if (isPromise(value)) {
      this.done.forEach(cb => value.then(cb));
      this.fail.forEach(cb => value.then(null, cb));
      this.always.forEach(cb => value.then(cb, cb));
    } else {
      let array = !error ? this.done : this.fail;
      array.forEach(cb => callSafely(cb, value, error));
      this.always.forEach(cb => callSafely(cb, value, error));
    }
    return [value, error];
  }
}

class Permission {
  /**
   * Initialize object.
   * @param {Function} [permit];
   * @return {Permission}
   */
  constructor(permit) {
    this.permit = permit || (() => true);
    this.granted = this.granted.bind(this);
    this.wrap = this.wrap.bind(this);
  }
  granted() {
    if (this.denied) {
      return false;
    }
    return this.permit();
  }
  deny() {
    this.denied = true;
  }
  wrap(fn) {
    var granted = this.granted;
    return (...args) => {
      if (granted()) {
        return fn.apply(null, args);
      }
    };
  }
}

function isPromise(value) {
  return value && (typeof value.then === 'function');
}

/**
 * Return functions array.
 * @param {*} arr
 * @throws - Will throw an error if argument is not a function or an array of
 *   functions.
 * @return {Function[]}
 */
function toFunctionsArray(arr) {
  if (arr === null || arr === undefined) {
    arr = [];
  } else if (!(arr instanceof Array)) {
    arr = [arr];
  }
  for (let i = 0; i < arr.length; i++) {
    if (typeof arr[i] !== 'function') {
      throw new Error('Functions are requried.');
    }
  }
  return arr;
}

function callSafely(fn, ...args) {
  var result;
  var error;
  try {
    result = fn.apply(null, args);
  } catch(e) {
    error = e;
  }
  return [result, error];
}
