(function(){"use strict";var exports={};var _createClass=function(){function defineProperties(target,props){for(var i=0;i<props.length;i++){var descriptor=props[i];descriptor.enumerable=descriptor.enumerable||false;descriptor.configurable=true;if("value"in descriptor)descriptor.writable=true;Object.defineProperty(target,descriptor.key,descriptor)}}return function(Constructor,protoProps,staticProps){if(protoProps)defineProperties(Constructor.prototype,protoProps);if(staticProps)defineProperties(Constructor,staticProps);return Constructor}}();Object.defineProperty(exports,"__esModule",{value:true});function _classCallCheck(instance,Constructor){if(!(instance instanceof Constructor)){throw new TypeError("Cannot call a class as a function")}}var exportAll=exports.exportAll=function exportAll(){return{Repeat:Repeat,Scheduler:Scheduler,Action:Action,Permission:Permission}};var Repeat=function(){function Repeat(options){_classCallCheck(this,Repeat);options=options||{};if(typeof options.action!=="function"){throw new Error("Action must be a function.")}var posts=[];if(options.post){if(typeof options.post==="function"){posts.push(options.post)}else if(typeof options.post==="array"){options.post.forEach(function(post){posts.push(post)})}}var timeout;if(typeof options.timeout==="function"){timeout=options.timeout}else if(typeof options.timeout==="number"){timeout=function timeout(){return options.timeout}}else{throw new Error("Timeout must be a number of a function.")}var permit;if(typeof options.permit==="function"){permit=options.permit}else{permit=function permit(){return true}}this.scheduler=new Scheduler({action:options.action,posts:posts,timeout:timeout,permit:permit})}_createClass(Repeat,[{key:"run",value:function run(){this.scheduler.run()}},{key:"call",value:function call(){this.scheduler.callAction()}},{key:"stop",value:function stop(){this.scheduler.stop()}}]);return Repeat}();var Scheduler=function(){function Scheduler(options){_classCallCheck(this,Scheduler);this.action=new Action(options.action,options.permit);this.posts=options.posts;this.timeout=options.timeout;this.permit=options.permit}_createClass(Scheduler,[{key:"run",value:function run(){this.stopped=false;this._setActionPosts();this.action.call()}},{key:"callAction",value:function callAction(){this.stop();this.run()}},{key:"stop",value:function stop(){this.stopped=true;if(this.scheduled){clearTimeout(this.scheduled);this.scheduled=null}if(this.permission){this.permission.deny();this.permission=null}}},{key:"_setActionPosts",value:function _setActionPosts(){this.permission=new Permission(this.permit);var perm=this.permission;var action=this.action;var scheduler=this;this.posts.forEach(function(post){action.addPost(function(value){if(perm.granted()){post.call(null,value)}})});var scheduleNext=scheduler._scheduleNext.bind(scheduler);action.addPost(scheduleNext,true)}},{key:"_scheduleNext",value:function _scheduleNext(){if(!this.stopped){var call=this.action.call.bind(this.action);var timeout=this.timeout.apply(this,arguments);this.scheduled=setTimeout(call,timeout)}}}]);return Scheduler}();var Action=function(){function Action(action,permit){_classCallCheck(this,Action);this.action=action;this.permit=permit||function(){return true};this.posts={success:[],always:[]}}_createClass(Action,[{key:"addPost",value:function addPost(post,callAlways){if(callAlways){this.posts.always.push(post)}else{this.posts.success.push(post)}}},{key:"call",value:function call(){var value=this.permit()?this.action():undefined;if(isPromise(value)){this.posts.success.forEach(function(post){return value.then(post)});this.posts.always.forEach(function(post){return value.then(post,post)})}else{this.posts.success.forEach(function(post){return post(value)});this.posts.always.forEach(function(post){return post(value)})}return value}}]);return Action}();function isPromise(value){return value&&typeof value.then==="function"}var Permission=function(){function Permission(permit){_classCallCheck(this,Permission);this._permit=permit}_createClass(Permission,[{key:"granted",value:function granted(){if(this.denied){return false}return this._permit()}},{key:"deny",value:function deny(){this.denied=true}}]);return Permission}();if(typeof window==="object"){window.Repeat=Repeat}else if(module&&module.exports){module.exports=Repeat}})();