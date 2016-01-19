export let exportAll = () => {
  return {Repeat, Scheduler, Action, Permission};
};

class Repeat {
  /**
   * Initialize object.
   * @param {Object} options
   * @param {Function} options.action
   * @param {(Function|Function[])} [options.post]
   * @param {(Number|Function)} options.timeout
   * @param {Function} [options.permit] - Permission function that does not
   *   stop the loop but inform whether action & posts may be called.
   * @return {Repeat}
   */
  constructor(options) {
    options = options || {};

    if (typeof options.action !== 'function') {
      throw new Error('Action must be a function.');
    }

    var posts = [];
    if (options.post) {
      if (typeof options.post === 'function') {
        posts.push(options.post);
      } else if (typeof options.post === 'array') {
        options.post.forEach(post => {
          posts.push(post);
        });
      }
    }

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
      posts: posts,
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
   * @param {Function[]} options.posts
   * @param {Function} options.timeout
   * @param {Function} options.permit
   * @return {Scheduler}
   */
  constructor(options) {
    this.action = options.action;
    this.posts = options.posts;
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
    var scheduler = this;
    var perm = this.permission = new Permission(this.permit);
    var action = new Action(perm.wrap(this.action));
    this.posts.forEach(post => action.addPost(perm.wrap(post)));
    action.addPost(perm.wrap(this._createSchedulePost(action)), true);
    this.__onActionInTest(action);
    return action;
  }
  /**
   * Return post function that schedule next action call.
   * @param {Action} action
   * @return {Function}
   */
  _createSchedulePost(action) {
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
   * @return {Action}
   */
  constructor(action) {
    this.action = action;
    this.posts = {success: [], always: []};
  }
  addPost(post, callAlways) {
    if (callAlways) {
      this.posts.always.push(post);
    } else {
      this.posts.success.push(post);
    }
  }
  call() {
    var value;
    try {
      value = this.action();
    } catch(e) {}
    if (isPromise(value)) {
      this.posts.success.forEach(post => value.then(post));
      this.posts.always.forEach(post => value.then(post, post));
    } else {
      this.posts.success.forEach(post => post(value));
      this.posts.always.forEach(post => post(value));
    }
    return value;
  }
}

function isPromise(value) {
  return value && (typeof value.then === 'function');
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
