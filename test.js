'use strict';
const co = require('co');
const _ = require('lodash');
const fs = require('fs');
const yaml = require('js-yaml');
const assert = require('assert');
const config = require('./config');
const gateway = require('./')(config);

const FAKE_DATA_PATH = 'fake.yml';
describe('braintree wrapper', function() {
  const fakeData = yaml.safeLoad(fs.readFileSync(FAKE_DATA_PATH));
  const user = {
    id: 'unique123'
  };

  beforeEach(function(done) {
    co(function*() {
      try { yield gateway.deleteCustomer(user.id); } catch(error) {}
      done();
    });
  });

  it('generates a clientToken', done => co(function*() {
    const response = yield gateway.generateClientToken();
    assert.ok(response.success);
    assert.ok(_.isString(response.clientToken));
    done();
  }).catch(done));

  it('creates a sale', done => co(function*() {
    const response = yield gateway.createTransaction({
      amount: 15,
      paymentMethodNonce: fakeData.nonces.valid.nonce
    });
    assert.ok(response.success);
    assert.equal(response.transaction.amount, '15.00');
    done();
  }).catch(done));

  it('creates a customer', done => co(function*() {
    const response = yield gateway.createCustomer(user);
    assert.ok(response.success);
    assert.equal(response.customer.id, 'unique123');
    done();
  }).catch(done));

  it('can find a customer', done => co(function*() {
    try {
      yield gateway.findCustomer(user.id);
    } catch (error) {
      assert.equal(error.type, 'notFoundError');
    }
    yield gateway.createCustomer(user);
    const response = yield gateway.findCustomer(user.id);
    assert.equal(response.id, 'unique123');
    done();
  }).catch(done));

  it('can update a customer', done => co(function*() {
    yield gateway.createCustomer(user);
    const response = yield gateway.updateCustomer(user.id, {firstName: 'chicken'});
    assert.ok(response.success);
    assert.equal(response.customer.firstName, 'chicken');
    done();
  }).catch(done));

  it('can upsert a customer', function(done) {
    this.timeout(5000);
    co(function*() {
      const update = {lastName: 'bob'};
      const response = yield gateway.findOneAndUpdate('unique123', update, true);
      assert.ok(response.success);
      assert.equal(response.customer.lastName, update.lastName);
      done();
    }).catch(done);
  });

  it('can create and delete multiple customers', function(done) {
    this.timeout(5000);
    co(function*() {
      var users = [{id: 'boogly1'}, {id: 'boogly2'}, {id: 'boogly3'}];

      const newUsers = yield gateway.createMultipleCustomers(users);

      yield gateway.deleteMultipleCustomers(users);
      done();

    }).catch(done);
  });

  it('can clone a transaction', function(done) {
    this.timeout(5000);
    co(function*() {
      const response = yield gateway.createTransaction({
        amount: 15,
        paymentMethodNonce: fakeData.nonces.valid.nonce
      });
      assert.ok(response.success);
      assert.equal(response.transaction.amount, '15.00');
      const id = response.transaction.id;

      const cloneResponse = yield gateway.cloneTransaction(id, 35);
      assert.ok(cloneResponse.success);
      assert.equal(cloneResponse.transaction.amount, '35.00');
      done();
    }).catch(done);
  });
});
