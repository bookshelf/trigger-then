var assert = require('assert');
var equal = assert.equal;
var deepEqual = assert.deepEqual;

var triggerThen = require('../trigger-then');
var Backbone = require('backbone');
var Q    = require('q');
var When = require('when');

describe('triggerThen', function(value) {

  it('should take two arguments, the Backbone instance and the promise lib', function() {
    triggerThen(Backbone, Q);
    equal(typeof Backbone.Events.triggerThen === 'function', true);
  });

  it('should swap out the promise lib if called more than once', function() {
    triggerThen(Backbone, When);
  });

  it('should trigger events, returning a promise the event', function(ok) {
    var model = new (Backbone.Model.extend({
      initialize: function() {
        this.on('fireEvent', this.regularFn, this);
        this.on('fireEvent', this.dfdFn, this);
        this.on('errorEvent', this.errorFn, this);
      },
      regularFn: function(time) {
        return time;
      },
      dfdFn: function(time) {
        var dfd = Q.defer();
        setTimeout(function() {
          dfd.resolve('This is a deferred object');
        }, time);
        return dfd.promise;
      },
      errorFn: function(time) {
        var dfd = When.defer();
        setTimeout(function() {
          dfd.reject(new Error('This is a failed promise'));
        }, time);
        return dfd.promise;
      }
    }))();

    model.trigger('fireEvent', 50);
    model.triggerThen('fireEvent', 50).then(function(resp) {
      equal(resp[0], 50);
      equal(resp[1], 'This is a deferred object');
    })
    .then(function() {
      return model.trigger('fireEvent errorEvent', 10);
    })
    .then(function() {
      return model.triggerThen('fireEvent errorEvent', 10);
    })
    .then(null, function(e) {
      equal(e.toString(), 'Error: This is a failed promise');
      ok();
    });
  });

  it('should resolve properly if there is no name', function(ok) {
    Backbone.triggerThen().then(function() {
      return Backbone.triggerThen('noname');
    })
    .then(function() {
      ok();
    });
  });

  it('should handle "all" properly', function(ok) {
    var model = new (Backbone.Model.extend({
      initialize: function() {
        this.on('fireEvent', this.regularFn, this);
        this.on('all', this.dfdFn, this);
      },
      regularFn: function(time) {
        return time;
      },
      dfdFn: function(time) {
        var dfd = Q.defer();
        setTimeout(function() {
          dfd.resolve('This is a deferred object');
        }, time);
        return dfd.promise;
      }
    }))();

    model.trigger('fireEvent', 10);
    model.triggerThen('fireEvent', 10).then(function(resp) {
      equal(resp[0], 10);
      equal(resp[1], 'This is a deferred object');
      ok();
    });

  });

  it('should handle exceptions in the event handlers with a rejected promise', function(ok) {

    var model = new (Backbone.Model.extend({
      initialize: function() {
        this.on('exceptionEvent', this.exceptionFn, this);
      },
      exceptionFn: function(time) {
        throw new Error('this is a failure');
      }
    }))();

    try {
      model.trigger('exceptionEvent', 10);
    } catch (e) {
      equal(e.toString(), 'Error: this is a failure');
    }

    model.triggerThen('exceptionEvent', 10).then(null, function(e) {
      equal(e.toString(), 'Error: this is a failure');
      ok();
    });

  });

  it('should call the "all" event individually for each item', function(ok) {
    var called = 0;
    var model = new (Backbone.Model.extend({
      initialize: function() {
        this.on('all', this.all, this);
      },
      all: function(item) {
        called++;
        if (called === 1) {
          equal(item, 'test');
        } else {
          equal(item, 'test2');
        }
      }
    }))();

    model.triggerThen('test test2').then(function() {
      equal(called, 2);
      ok();
    }).then(null, ok);

  });

});