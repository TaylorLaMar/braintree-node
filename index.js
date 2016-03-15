'use strict';
const braintree = require('braintree');
/**
 * Module returns an instance of the braintree gateway
 * @param {config} config, must contain the environment,
 *   merchantId, publicKey, and privateKey
 * @return {gateway}
 */
module.exports = function(config) {
  // handle no config
  if (!config) {
    throw new Error('You must pass in a configuration object to instantiate the braintree gateway');
  }
  if (!config.environment) {
    throw new Error(`Configuration object requires environment`);
  }
  if (!config.merchantId) {
    throw new Error(`Configuration object requires merchantId`);
  }
  if (!config.publicKey) {
    throw new Error(`Configuration object requires publicKey`);
  }
  if (!config.privateKey) {
    throw new Error(`Configuration object requires privateKey`);
  }

  /*
  ----------------------------------------------------------------
  */

  config.environment = braintree.Environment[handleEnv(config.environment)];
  // instantiate gateway object with configuration
  const gateway = braintree.connect(config);

  /**
   * @wraps gateway.clientToken.generate
   * @return {Promise}
   */
  gateway.generateClientToken = function() {
    return new Promise((resolve, reject) => {
      this.clientToken.generate({}, function(error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    });
  };

  /**
   * @wraps gateway.transaction.sale
   * @param {Number|String} amount, required
   * @param {String} nonce, required
   * @param {options} options, optional
   */

  gateway.createTransaction = function(amount, nonce, options) {
    return new Promise((resolve, reject) => {
      if (!amount) {
        return reject(new Error('Amount required to create transaction'));
      }
      if (!nonce) {
        return reject(new Error('Nonce required to create transaction'));
      }

      const params = {
        amount: amount,
        paymentMethodNonce: nonce,
        options: options
      };

      this.transaction.sale(params, function(error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    });
  };

  /**
   * @wraps gateway.customer.find
   * @param {String} id, required
   * @return {Promise}
   */

   gateway.findCustomer = function(id) {
    return new Promise((resolve, reject) => {
      if (!id) {
        return reject(new Error('id required to find customer'));
      }
      this.customer.find(id, function(error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    });
   };

  /**
    * @wraps gateway.customer.create
    * @param {user} user object with various paramaters
    *   if no `id` property exists on user, default to braintree's
    *   randomly generated id
    *   to store a payment method along with the customer, be sure to include
    *   a `paymentMethodNonce` property on the user object with the client nonce
    * @return {Promise}
   */
  gateway.createCustomer = function(user) {
    return new Promise((resolve, reject) => {
      this.customer.create(user, function(error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    });
  };

  /**
   * @wraps gateway.customer.update
   * @param {String} id, required, braintree id of user
   * @param {update} update object
   * @return {Promise}
   */

  gateway.updateCustomer = function(id, update) {
    return new Promise((resolve, reject) => {
      if (!id) {
        return reject(new Error('id required to update customer'));
      }
      this.customer.update(id, update, function(error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    });
  };

  /**
   * @wraps gateway.customer.delete
   * @param {String} id, braintree id of user to delete
   * @return {Promise}
   */

  gateway.deleteCustomer = function(id) {
    return new Promise((resolve, reject) => {
      if (!id) {
        return reject(new Error('id required to delete customer'));
      }
      this.customer.delete(id, function(error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    });
  }


  /**
   * @param {User} user object to update|create
   * @param {Boolean} upsert, create new document if not found
   * @return {Promise}
   */
  gateway.findOneAndUpdate = function(user, upsert) {
    return new Promise((resolve, reject) => {
      this.customer.update(user.id, user, (error, result) => {
        if (error.type === 'notFoundError' && upsert) {
          this.customer.create(user, (error, result) => {
            if (error) {
              return reject(error);
            }
            return resolve(result);
          });
        } else if (error) {
          return reject(error);
        } else {
          return resolve(result);
        }
      });
    });
  };

  /**
   * @param {Array} user objects to create, required
   * @return {Promise}
   */

  gateway.createMultipleCustomers = function(users) {
    return new Promise((resolve, reject) => {
      if (!users) {
        return reject(new Error('users required'));
      }
      if (!Array.isArray(users)) {
        users = [users];
      }

      const promises = [];
      for (var i = 0; i < users.length; i++) {
        promises.push(this.createCustomer(users[i]));
      };

      return resolve(Promise.all(promises));
    });
  };

  /**
   * @param {Array} array of user ids, required
   * @return {Promise}
   */
  gateway.deleteMultipleCustomers = function(users) {
    return new Promise((resolve, reject) => {
      if (!users) {
        return reject(new Error('users required'));
      }
      if (!Array.isArray(users)) {
        users = [users];
      }

      const promises = [];
      for (var i = 0; i < users.length; i++) {
        promises.push(this.deleteCustomer(users[i].id));
      }
      return resolve(Promise.all(promises));
    });
  };

  function handleEnv(environment) {
    return environment[0].toUpperCase() + environment.slice(1).toLowerCase();
  }

  return gateway;
};