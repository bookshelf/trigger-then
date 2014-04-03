var chai   = require('chai');
var expect = chai.expect;
var sinon  = require('sinon');

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));
chai.use(require('chai-things'));

var triggerThen = require('../trigger-then');
var Backbone    = require('backbone');
var Promise     = require('bluebird');
var When        = require('when');

require('sinon-as-promised')(Promise);

describe('triggerThen', function () {

  before(function () {
    Promise.longStackTraces();
    Promise.onPossiblyUnhandledRejection(function (err) {
      throw err;
    });
  });

  beforeEach(function () {
    triggerThen(Backbone, Promise);
  });

  describe('Setup', function () {

    it('should register triggerThen on Backbone.Events', function() {
      expect(Backbone.Events).to.respondTo('triggerThen');
    });

    it('can replace the promise library', function () {
      expect(Backbone.Events.triggerThen()).to.have.property('catch');
      triggerThen(Backbone, When);
      expect(Backbone.Events.triggerThen()).to.not.have.property('catch');
    });

  });

  describe('Triggering events', function () {

    var response = {};
    var error = new Error();

    var sync, promise;
    beforeEach(function () {
      sync = sinon.stub().returns(response);
      promise = sinon.stub().resolves(response);
    });

    var Model;
    beforeEach(function () {
      Model = Backbone.Model.extend();
    });

    var model;
    beforeEach(function () {
      model = new Model();
    });

    it('resolves if there is no event passed', function () {
      return model.triggerThen();
    });

    it('resolves if there are no listeners', function () {
      return model.triggerThen('unlistened');
    });

    it('resolves with an array of event responses', function () {
      model.on('event', sync);
      model.on('event', promise);
      model.trigger('event');
      return model.triggerThen('event').then(function (values) {
        expect(values).to.have.length(2).and.to.all.equal(response);
      });
    });

    it('uses the event context', function () {
      var context = {};
      model.on('event', sync, context);
      return model.triggerThen('event').finally(function () {
        expect(sync).to.have.been.calledOn(context);
      });
    })

    it('can trigger all events', function () {
      model.on('all', sync);
      model.on('all', promise);
      return model.triggerThen('e1 e2').then(function (values) {
        expect(sync).to.have.been.calledTwice;
        expect(promise).to.have.been.calledTwice;
        expect(values).to.have.length(2)
          .and.to.all.be.an('array')
          .and.to.all.have.property('length', 2);
      });
    });

    it('can trigger multiple events', function () {
      model.on('e1', sync);
      model.on('e2', promise);
      return model.triggerThen('e1 e2').then(function (value) {
        expect(value).to.have.length(2);
      });
    });

    it('rejects if a handler returns a rejected promise', function () {
      model.on('reject', sinon.stub().rejects(error));
      return expect(model.triggerThen('reject')).to.be.rejectedWith(error);
    });

    it('rejects if a handler throws', function () {
      model.on('throw', sinon.stub().throws(error));
      return expect(model.triggerThen('throw')).to.be.rejectedWith(error);
    });

  });

});