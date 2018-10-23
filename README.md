# Promisifies Braintree's Node SDK

## Setup

1. Run the following:
`npm install --save braintree-node`

2. Instantiate the gateway, passing in a configuration object. In lieu of `braintree.Environment.Sandbox` or `braintree.Environment.Production`, just set the environment property on your configuration object to the string of the environment you want, like so:

```
var config = {
  environment: 'Production', // Or 'Sandbox'
  publicKey: yourPublicKey,
  privateKey: yourPrivateKey,
  merchantId: yourMerchantId
};
var gateway = require('braintree-node')(config);

gateway.createCustomer(...)
```

Most methods take the same parameters as the current Node.js SDK methods, except for the callback. Instead, you can `.then` off of the gateway methods or `yield` them if you are using generators (or `await`, if you're transpiling ES7 down with babel).

Example:

```
var customer = { id: 'roondog', firstName: 'roonie' };
gateway.createCustomer(customer)
  .then(() => {
    // handle successful response...
  })
  .catch(() => {
    // handle rejection...
  });
```
## API

### .createCustomer(user)

You can create a customer like so:

```
app.post('/createBraintreeUser', function(req, res) {
  gateway.createCustomer(req.body)
    .then(function(response) {
      res.json({user: response.customer});
    })
    .catch(function(error) {
      res.status(400).send({error: error});
    });
});
```

### .createMultipleCustomers(users)

Create multiple users

```
app.post('/createManyBraintreeUsers', function(req, res) {
  var users = [{id: '123'}, {id: '456'}, {id: '789'}];
  gateway.createMultipleCustomers(users)
    .then(runsWhenAllAreCreated)
    .catch(runsIfAnyOneCustomerFailed);
});

```

### .createTransaction(transaction, options)

Wrapper for `.transaction.sale`, rejects if amount or nonce is undefined. Any `options` passed in will be set on the `options` property of the object that `transaction.sale` takes in the SDK

```
app.post('/checkout', function(req, res) {
  var amount = req.body.amount;
  var nonce = req.body.nonce;
  var options = req.body.paymentOptions;
  gateway.createTransaction({ amount: amount, paymentMethodNonce: nonce }, options)
    .then(handleSuccessfulTransaction)
    .catch(handleFailedTransaction);
});
```

### .findTransaction(transactionID)

Wrapper for `.transaction.find`, rejects if transactionID is undefined.

```
app.get('/transaction/:id', function(req, res) {
  var transactionID = req.params.id;
  
  gateway.findTransaction(transactionID)
    .then(handleSuccess)
    .catch(handleRejection);
});
```

### .searchTransactions(customerID)

Wrapper for `.transaction.search`, rejects if customerID is undefined. Fetches all transactions with a given Braintree customer ID.

```
app.get('/transactions/:customerID', function(req, res) {
  var transactionID = req.params.customerID;
  
  gateway.searchTransactions(customerID)
    .then(handleSuccess)
    .catch(handleRejection);
});
```

### .deleteCustomer(id)
Deletes the braintree user with the given id.

```
app.del('/deleteBraintreeUser', function(req, res) {
  var theID = req.body;
  gateway.deleteCustomer(theID)
    .then(response => {...})
    .catch(error => {...});
});
```

### .deleteMultipleCustomers(users)
Deletes all braintree users in an array of users. Each object in the array only needs an `id` property so braintree can find the user to delete.

```
app.del('/deleteBraintreeUsers', function(req, res) {
  var users = [{id: '123'}, {id: '456'}];
  gateway.deleteMultipleCustomers(users)
    .then(continueAfterAllDeleted)
    .catch(handleFailure);
});
```

### .findCustomer(id)

Finds the braintree user with the given id. Resolves with the customer object (unlike most other methods which resolve with the http response from braintree).

```
app.get('/findBraintreeUser', function(req, res) {
  var theID = req.body;
  gateway.findCustomer(theID)
    .then(function(response) {
      res.json({firstName: response.firstName});
    })
    .catch(function(error) {
      res.status(400).json({error: error});
    });
})
```

### .findOneAndUpdate(id, update, upsert)
Takes a user object and updates it if it exists, and creates it if `upsert` is set to true
```
app.put('/updateOrCreate', function(req, res) {
  // assuming this user does not exist in braintree
  var user = {firstName: 'Bob'};
  gateway.findOneAndUpdate('123', user, true)
    .then(handleSuccess)
    .then(handleRejection);
  gateway.findCustomer('123'); // => {id: '123', firstName: 'Bob'}
});
```

### .generateClientToken()

Generates client token

```
app.get('/token', function(req, res) {
  gateway.generateClientToken()
    .then(response => res.json(response.clientToken))
    .catch(error => res.json(error));
});
```

### .updateCustomer(id, update)
Updates Braintree user with the given `id` and updates any properties on the `update` object

```
app.put('/me', function(req, res) {
  var theId = req.user._id;
  gateway.updateCustomer(theId, {firstName: 'prometheus'})
    .then(response => {...})
    .catch(error => {...});
})
```

### .createSubscription(options)

Wrapper for `.subscription.create`, rejects if planId or nonce is undefined.

```
app.post('/subscribe', function(req, res) {
  var planId = req.body.planId;
  var nonce = req.body.nonce;
  var options = { planId: planId, paymentMethodNonce: nonce };
  gateway.createTransaction(options)
    .then(handleSuccessfulSubscription)
    .catch(handleFailedSubscription);
});
```

### .findSubscription(id)

Finds the customer's subscription with a given id.

```
app.get('/findSubscription', function(req, res) {
  var id = req.body;
  gateway.findSubscription(id)
    .then(function(response) {
      res.json({planId: response.planId});
    })
    .catch(function(error) {
      res.status(400).json({error: error});
    });
})
```

### .cancelSubscription(id)
Deletes the customer's subscription with a given id.

```
app.del('/cancelSubscription', function(req, res) {
  var id = req.body;
  gateway.cancelSubscription(id)
    .then(response => {...})
    .catch(error => {...});
});
```
