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
    this.action = new Action(options.action, options.permit);
    this.posts = options.posts;
    this.timeout = options.timeout;
    this.permit = options.permit;
  }
  run() {
    this.stopped = false;
    this._setActionPosts();
    this.action.call();
  }
  callAction() {
    this.stop();
    this.run();
  }
  stop() {
    this.stopped = true;
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
   * Wrap post functions to skip calling after scheduler stops.
   * @return {void}
   */
  _setActionPosts() {
    this.permission = new Permission(this.permit);
    var perm = this.permission;
    var action = this.action;
    var scheduler = this;
    this.posts.forEach(post => {
      action.addPost(value => {
        if (perm.granted()) {
          post.call(null, value);
        }
      });
    });
    var scheduleNext = scheduler._scheduleNext.bind(scheduler);
    action.addPost(scheduleNext, true);
  }
  /**
   * Last action post function.
   * It is called with value returned by action.
   * @return {void}
   */
  _scheduleNext() {
    if (!this.stopped) {
      var call = this.action.call.bind(this.action);
      var timeout = this.timeout.apply(this, arguments);
      this.scheduled = setTimeout(call, timeout);
    }
  }
}

class Action {
  /**
   * Initialize object.
   * @param {Function} action
   * @param {Function} permit
   * @return {Action}
   */
  constructor(action, permit) {
    this.action = action;
    this.permit = permit || (() => true); // For simpler tests.
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
    // TODO Catch errors?
    var value = this.permit() ? this.action() : undefined;
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
  constructor(permit) {
    this._permit = permit;
  }
  granted() {
    if (this.denied) {
      return false;
    }
    return this._permit();
  }
  deny() {
    this.denied = true;
  }
}
