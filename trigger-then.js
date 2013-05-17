// Exports the function which mixes `triggerThen`
// into the specified `Backbone` copy's `Events` object,
// using the promise-lib's "all" implementation provided
// in the second argument.
(function(mixinFn) {
  if (typeof exports === "object") {
    module.exports = mixinFn;
  } else if (typeof define === "function" && define.amd) {
    define('trigger-then', [], function() { return mixinFn; });
  } else {
    this.triggerThen = mixinFn;
  }
}).call(this, function(Backbone, All) {

  var Events = Backbone.Events;
  var push   = Array.prototype.push;
  var slice  = Array.prototype.slice;
  var eventSplitter = /\s+/;

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments). Returns an array containing all of the
  // event trigger calls, in case any return deferreds.
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    var dfds = [];
    switch (args.length) {
      case 0: while (++i < l) dfds.push((ev = events[i]).callback.call(ev.ctx)); return dfds;
      case 1: while (++i < l) dfds.push((ev = events[i]).callback.call(ev.ctx, a1)); return dfds;
      case 2: while (++i < l) dfds.push((ev = events[i]).callback.call(ev.ctx, a1, a2)); return dfds;
      case 3: while (++i < l) dfds.push((ev = events[i]).callback.call(ev.ctx, a1, a2, a3)); return dfds;
      default: while (++i < l) dfds.push((ev = events[i]).callback.apply(ev.ctx, args)); return dfds;
    }
  };

  // Fires events as `trigger` normally would, but assumes that some of the `return`
  // values from the events may be promises, and and returns a promise when all of the
  // events are resolved.
  var triggerThen = Events.triggerThen = function(name) {
    if (!this._events) return All([]);
    var names = [name];
    var args  = slice.call(arguments, 1);
    var dfds  = [];
    var events = [];
    if (eventSplitter.test(names[0])) names = names[0].split(eventSplitter);
    for (var i = 0, l = names.length; i < l; i++) {
      push.apply(events, this._events[names[i]]);
    }
    var allEvents = this._events.all;
    if (events) push.apply(dfds, triggerEvents(events, args));
    if (allEvents) push.apply(dfds, triggerEvents(allEvents, arguments));
    return All(dfds);
  };

  // Mixin `triggerThen` to the appropriate objects and prototypes.
  Backbone.triggerThen = triggerThen;

  var objs = ['Model', 'Collection', 'Router', 'View', 'History'];

  for (var i=0, l=objs.length; i<l; i++) {
    Backbone[objs[i]].prototype.triggerThen = triggerThen;
  }
});