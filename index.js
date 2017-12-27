const braintree = require('braintree');

/**
 * Module returns an instance of the braintree gateway
 * @param  {config} config
 * @return {gateway}
 */
module.exports = function(config) {
  // Handle invalid configuration
  if (!config) throw new Error('You must pass in a configuration object to instantiate the braintree gateway');
  if (!config.environment) throw new Error('Configuration object requires environment');
  if (!config.merchantId) throw new Error('Configuration object requires merchantId');
  if (!config.publicKey) throw new Error('Configuration object requires publicKey');
  if (!config.privateKey) throw new Error('Configuration object requires privateKey');

  // Configure Braintree environment
  config.environment = braintree.Environment[handleEnv(config.environment)];

  // Instantiate gateway object with configuration
  const gateway = braintree.connect(config);

  /**
   * Wraps gateway.clientToken.generate
   * @return {Promise<any>}
   */
  gateway.generateClientToken = function() {
    return new Promise((resolve, reject) => {
      this.clientToken.generate({}, function(error, result) {
        if (error) return reject(error);
        return resolve(result);
      });
    });
  };

  /**
   * Wraps gateway.transaction.sale
   * @param {Transaction} transaction, required, contains `amount` and `paymentMethodNonce` or `paymentMethodToken`
   * @param {options} options, optional
   * @return {Promise<any>}
   */
  gateway.createTransaction = function(transaction, options) {
    return new Promise((resolve, reject) => {
      if (!transaction) return reject(new Error('transaction object required'));
      if (!transaction.amount) return reject(new Error('Amount required to create transaction'));
      if (!transaction.paymentMethodNonce && !transaction.paymentMethodToken) return reject(new Error('Nonce or Token required to create transaction'));

      if (options) transaction.options = options;

      this.transaction.sale(transaction, function(error, result) {
        if (error) return reject(error);
        return resolve(result);
      });
    });
  };

  gateway.findTransaction = function(transactionID) {
    return new Promise((resolve, reject) => {
      if (!transactionID) return reject(new Error('Transaction ID required'));

      this.transaction.find(transactionID, function(e, response) {
        if (e) return reject(e);
        return resolve(response);
      });
    });
  }

  /**
   * Wraps gateway.transaction.cloneTransaction
   * @param {String} transactionId
   * @param {Number|String} amount
   * @param {Boolean} submitForSettlement, defaults to true
   * @return {Promise<any>}
   */
  gateway.cloneTransaction = function(transactionId, amount, submitForSettlement) {
    return new Promise((resolve, reject) => {
      if (!transactionId) return reject (new Error('Transaction id is required to clone a transaction'));
      if (!amount) return reject (new Error('Amount is required to clone transaction'));

      submitForSettlement = submitForSettlement === false ?
        false :
        true;
      const options = {
        submitForSettlement: submitForSettlement
      };

      const params = {amount: amount, options: options};

      this.transaction.cloneTransaction(transactionId, params, function(error, result) {
        if (error) return reject(error);
        return resolve(result);
      });

    });
  };

  /**
   * Wraps gateway.customer.find
   * @param {string} id, required
   * @return {Promise<any>}
   */
  gateway.findCustomer = function(id) {
    return new Promise((resolve, reject) => {
      if (!id) return reject(new Error('id required to find customer'));

      this.customer.find(id, function(error, result) {
        if (error) return reject(error);
        return resolve(result);
      });
    });
  };

  /**
    * Wraps gateway.customer.create
    * @param {user} user object with various paramaters
    *   if no `id` property exists on user, default to braintree's
    *   randomly generated id
    *   to store a payment method along with the customer, be sure to include
    *   a `paymentMethodNonce` property on the user object with the client nonce
    * @return {Promise<any>}
   */
  gateway.createCustomer = function(user) {
    return new Promise((resolve, reject) => {
      this.customer.create(user, function(error, result) {
        if (error) return reject(error);
        return resolve(result);
      });
    });
  };

  /**
   * Wraps gateway.customer.update
   * @param {String} id, required, braintree id of user
   * @param {update} update object
   * @return {Promise<any>}
   */

  gateway.updateCustomer = function(id, update) {
    return new Promise((resolve, reject) => {
      if (!id) return reject(new Error('id required to update customer'));
      this.customer.update(id, update, function(error, result) {
        if (error) return reject(error);
        return resolve(result);
      });
    });
  };

  /**
   * Wraps gateway.customer.delete
   * @param {string} id, braintree id of user to delete
   * @return {Promise<any>}
   */
  gateway.deleteCustomer = function(id) {
    return new Promise((resolve, reject) => {
      if (!id) return reject(new Error('id required to delete customer'));

      this.customer.delete(id, function(error, result) {
        if (error) return reject(error);
        return resolve(result);
      });
    });
  }

  /**
   * @param {string} id of user to update
   * @param {object} update user object to update|create - attaches id to user if not null
   * @param {boolean} upsert, create new document if not found
   * @return {Promise<any>}
   */
  gateway.findOneAndUpdate = function(id, update, upsert) {
    return new Promise((resolve, reject) => {
      this.customer.update(id, update, (error, result) => {
        if (error && error.type === 'notFoundError' && upsert) {
          update.id = id ? id : null;
          this.customer.create(update, (error, result) => {
            if (error) return reject(error);
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
   * @param {array} user objects to create, required
   * @return {Promise}
   */
  gateway.createMultipleCustomers = function(users) {
    return new Promise((resolve, reject) => {
      if (!users) return reject(new Error('users required'));

      if (!Array.isArray(users)) users = [users];

      const promises = [];
      for (let i = 0; i < users.length; i++) {
        promises.push(this.createCustomer(users[i]));
      }

      return resolve(Promise.all(promises));
    });
  };

  /**
   * @param {array} array of user IDs, required
   * @return {Promise}
   */
  gateway.deleteMultipleCustomers = function(users) {
    return new Promise((resolve, reject) => {
      if (!users) return reject(new Error('users required'));

      if (!Array.isArray(users)) users = [users];

      const promises = [];
      for (let i = 0; i < users.length; i++) {
        promises.push(this.deleteCustomer(users[i].id));
      }
      return resolve(Promise.all(promises));
    });
  };

  /**
   * @wraps gateway.paymentMethod.create
   * @param {object} options, used for creating a payment method
   * @return {Promise}
   */
  gateway.createPaymentMethod = function(options) {
    return new Promise((resolve, reject) => {
      if (!options) {return reject(new Error('Customer ID and payment method nonce is required to create payment method'));
      if (!options.customerId) return reject(new Error('Customer ID is required to create payment method'));
      if (!options.paymentMethodNonce) return reject(new Error('Payment method nonce is required to create payment method'));

      this.paymentMethod.create(options, function(error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    });
  };

  /**
   * Find a payment method based on a token
   * @param {string} token
   * @return {Promise}
   */
  gateway.findPaymentMethod = function(token) {
    return new Promise((resolve, reject) => {
      if (!token) {
        return reject(new Error('No token provided to find payment method'));
      }

      this.paymentMethod.find(token, function(error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    });
  };

  /**
   * @param {string} token
   * @return {Promise}
   */
  gateway.deletePaymentMethod = function(token) {
    return new Promise((resolve, reject) => {
      if (!token) {
        return reject(new Error('Token is required to delete payment method'));
      }

      this.paymentMethod.delete(token, function(error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    });
  };

  /**
   * @wraps gateway.plans.all
   * @return {Promise}
   */
  gateway.findAllPlans = function() {
    return new Promise((resolve, reject) => {
      this.plan.all(function(error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    });
  };

  /**
   * @wraps gateway.subscription.create
   * @param {object} options, these will be used for creating new subscription
   * @return {Promise}
   */
  gateway.createSubscription = function(options) {
    return new Promise((resolve, reject) => {
      if (!options) return reject(new Error('Plan ID and payment method token is required'));
      if (!options.planId) return reject(new Error('You need to provide plan ID (name)'));
      if (!options.paymentMethodToken) return reject(new Error('Payment method token is required to create subscription'));

      this.subscription.create(options, function(error, result) {
        if (error) return reject(error);
        return resolve(result);
      });
    });
  }

  /**
   * @wraps gateway.subscription.cancel
   * @param {string} subscriptionID
   * @return {Promise}
   */
  gateway.cancelSubscription = function(subscriptionID) {
    return new Promise((resolve, reject) => {
      if (!subscriptionID) {
        return reject(new Error('Subscription ID is required to cancel subscription'));
      }

      this.subscription.cancel(subscriptionID, function(error, result) {
        if (error) return reject(error);
        return resolve(result);
      });
    });
  }

  /**
   * @wraps gateway.subscription.find
   * @param {string} subscription ID
   * @return {Promise}
   */
  gateway.findSubscription = function(subscriptionID) {
    return new Promise((resolve, reject) => {
      if (!subscriptionID) {
        return reject(new Error('Subscription ID is required to find subscription'));
      }

      this.subscription.find(subscriptionID, function(error, result) {
        if (error) return reject(error);
        return resolve(result);
      });
    });
  }

  function handleEnv(environment) {
    return environment[0].toUpperCase() + environment.slice(1).toLowerCase();
  }

  return gateway;
};
