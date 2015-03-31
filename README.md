# hapi-mongo-models

MongoDB object models for hapi applications.

[![Build Status](https://travis-ci.org/jedireza/hapi-mongo-models.svg?branch=master)](https://travis-ci.org/jedireza/hapi-mongo-models)
[![Dependency Status](https://david-dm.org/jedireza/hapi-mongo-models.svg?style=flat)](https://david-dm.org/jedireza/hapi-mongo-models)
[![devDependency Status](https://david-dm.org/jedireza/hapi-mongo-models/dev-status.svg?style=flat)](https://david-dm.org/jedireza/hapi-mongo-models#info=devDependencies)
[![peerDependency Status](https://david-dm.org/jedireza/hapi-mongo-models/peer-status.svg?style=flat)](https://david-dm.org/jedireza/hapi-mongo-models#info=peerDependencies)

[MongoDB](https://github.com/mongodb/node-mongodb-native)'s native driver for
Node.js is pretty good. We just want a little sugar on top.

[Mongoose](http://mongoosejs.com/) is awesome, and big. It's built on top of
MongoDB's native Node.js driver. It's a real deal ODM with tons of features.
You should check it out.

We wanted something in between the MongoDB driver and Mongoose. Something light
weight where we can interact with collections using simple JavaScript classes
and get document results as instances of these classes.

We're also big fans of [hapijs](http://hapijs.com/) and their object schema
validation library [joi](https://github.com/hapijs/joi). Joi works really well
for defining a model's data schema.

It's just JavaScript.


## Install

```bash
$ npm install hapi-mongo-models
```


## Usage

### Base model

You extend the `BaseModel` to create new model classes. The base model also
acts as a singleton so all models can share one db connection.

Let's create a `Cat` model.

```js
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var BaseModel = require('hapi-mongo-models').BaseModel;

var Cat = BaseModel.extend({
    // instance prototype
    constructor: function (attrs) {

        ObjectAssign(this, attrs);
    }
});

Cat._collection = 'cats'; // the mongo collection name

Cat.schema = Joi.object().keys({
    name: Joi.string().required()
});

Cat.staticFunction = function () {

    // static class function
};

module.exports = Cat;
```

### Server plugin

Register the plugin manually.

```js
var plugin = {
    register: require('hapi-mongo-models'),
    options: {
        mongodb: {
          url: 'mongodb://localhost:27017/hapi-mongo-models-test',
          options: { ... }
        },
        autoIndex: false,
        models: {
            Customers: './path/to/customers',
            Orders: './path/to/orders'
        }
    }
};

server.register(plugin, function (err) {

     if (err) {
         console.log('Failed loading plugin');
     }
 });
```

Or include it in your composer manifest.

```json
{
    "servers": [{
        "port": 8080
    }],
    "plugins": {
        "hapi-mongo-models": {
            "mongodb": {
              "url": "mongodb://localhost:27017/hapi-mongo-models-test",
              "options": { ... },
            },
            "autoIndex": false,
            "models": {
              "Customers": "./path/to/customers",
              "Orders": "./path/to/orders"
            }
        }
    }
}
```

The options passed to the plugin is an object where:

 - `mongodb` - is an object where:
    - `url` - a string representing the connection url for MongoDB.
    - `options` - an optional object passed to the MongoDB's native connect function.
 - `autoIndex` - a boolean specifying if the plugin should call `ensureIndex` for each
    model. Defaults to `true`. Typically set to `false` in production environments.
 - `models` - an object where each key is the exposed model name and each value is the
    path (relative to the current working directory) of where to find the model on disk.

Example usage in a route handler:

```js
// customer plugin

exports.register = function (server, options, next) {

    server.route({
        method: 'GET',
        path: '/customers',
        config: {
            validate: {
                query: {
                    name: Joi.string().allow('')
                }
            }
        },
        handler: function (request, reply) {

            var Customer = request.server.plugins['hapi-mongo-models'].Customer;
            var filter = {};

            if (request.query.name) {
                filter['name'] = request.query.name;
            }

            Customer.find(filter, function (err, results) {

                if (err) {
                    return reply(err);
                }

                reply(results);
            });
        }
    });

    next();
};

exports.register.attributes = {
    name: 'customers'
};
```


## API

#### `extend(protoProps)`

Creates a new model class where:

 - `protoProps` - an object defining the prototype of the new class where:
    - `constructor` - an optional function that will be used as the instance
      constructor.

```js
var ObjectAssign = require('object-assign');

var Kitten = BaseModel.extend({
    constructor: function (attrs) {

        ObjectAssign(this, attrs);
    },
    speak: function () {

        console.log(this.name + ' says: meeeeeeeeow');
    }
});
```

#### `_idClass`

The type used to cast `_id` properties. Defaults to
[`MongoDB.ObjectId`](http://docs.mongodb.org/manual/reference/object-id/).

#### `ObjectId`

An alias to `MongoDB.ObjectId`.

#### `schema`

A `joi` object schema. See: https://github.com/hapijs/joi

#### `connect(config, callback)`

Connects to a MongoDB server where:

 - `config` - an object with the following keys:
    - `url` - the connection string passed to `MongoClient.connect`.
    - `options` - an optional object passed to `MongoClient.connect`.
 - `callback` - the callback method using the signature `function (err, db)`
    where:
    - `err` - if the connection failed, the error reason, otherwise `null`.
    - `db` - if the connection succeeded, the initialized db object.

#### `disconnect()`

Closes the current db connection.

#### `ensureIndexes(callback)`

Loops over the static `indexes` array property of a model class calling
`ensureIndex`.

#### `validate(input, callback)`

Uses `joi` validation using the static `schema` object property of a model
class to validate `input` where:

 - `input` - is the object to validate.
 - `callback` - is the callback method using the signature `function (err,
    value)` where:
    - `err` - if validation failed, the error reason, otherwise null.
    - `value` - the validated value with any type conversions and other
       modifiers applied.

See: https://github.com/hapijs/joi#validatevalue-schema-options-callback

#### `validate(callback)`

Uses `joi` validation using the static `schema` object property of a model
class to validate the instance data of a model where:

 - `callback` - is the callback method using the signature `function (err,
    value)` where:
    - `err` - if validation failed, the error reason, otherwise null.
    - `value` - the validated value with any type conversions and other
       modifiers applied.

See: https://github.com/hapijs/joi#validatevalue-schema-options-callback

#### `resultFactory(next, err, result, /* args */)`

Proxies query calls turning document results into instances of the class model
where:

 - `next` - is the original `callback` that expects the results.
 - `err` - is the original `err` if any.
 - `results` - is the original `results` if any.
 - any remaining arguments to be sent back if present.

#### `pagedFind(filter, fields, sort, limit, page, callback)`

A helper method to find documents with paginated results where:

 - `filter` - is a filter object, defining the conditions the documents need to
    apply.
 - `fields` - indicates which fields should be included in the response
    (default is all). Can be a string with space separated field names.
 - `sort` - indicates how to sort documents. Can be a string with space
    separated fields. Fields may be prefixed with `-` to indicate decending
    sort order.
 - `limit` - a number indicating how many results should be returned.
 - `page` - a number indicating the current page.
 - `callback` - is the callback method using the signature `function (err,
    results)` where:
    - `err` - if the query failed, the error reason, otherwise null.
    - `results` - the results object where:
        - `data` - an array of documents from the query as class instances.
        - `pages` - an object where:
            - `current` - a number indicating the current page.
            - `prev` - a number indicating the previous page.
            - `hasPrev` - a boolean indicating if there is a previous page.
            - `next` - a number indicating the next page.
            - `hasNext` - a boolean indicating if there is a next page.
            - `total` - a number indicating the total number of pages.
        - `items` - an object where:
            - `limit` - a number indicating the how many results should be returned.
            - `begin` - a number indicating what item number the results begin with.
            - `end` - a number indicating what item number the results end with.
            - `total` - a number indicating the total number of matching results.

#### `fieldsAdapter(fields)`

A helper method to create a fields object suitable to use with MongoDB queries
where:

 - `fields` - a string with space separated fields.

Returns a MongoDB friendly fields object.

#### `sortAdapter(sorts)`

A helper method to create a sort object suitable to use with MongoDB queries
where:

 - `sorts` - a string with space separated fields. Fields may be prefixed with
   `-` to indicate decending sort order.

Returns a MongoDB friendly sort object.

#### `findById(id, [options], callback)`

Finds a document by id using MongoDB's native `findOne` method where:

 - `id` - is a string value of the `_id` to find. It will be casted to the type
    of `_idClass`.
 - `options` - an options object passed to MongoDB's native `findOne` method.
 - `callback` - the callback method using the signature `function (err, result)`
    where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `result` - if the query succeeded, a document as a class instance.

Note: `callback` passes through `resultFactory`.

#### `findByIdAndUpdate(id, update, [options], callback)`

Finds a document by id, updates it and returns the document using MongoDB's
native `findOneAndUpdate` method where:

 - `id` - is a string value of the `_id` to find. It will be casted to the type
   of `_idClass`.
 - `update` - an object containing the fields/values to be updated.
 - `options` - an optional options object passed to MongoDB's native
   `findAndModify` method. Defaults to `{ returnOriginal: false }`.
 - `callback` - the callback method using the signature `function (err, result)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `result` - if the query succeeded, a document as a class instance.


Note: `callback` passes through `resultFactory`.

#### `findByIdAndDelete(id, callback)`

Finds a document by id, deletes it and returns the document using MongoDB's
native `findOneAndDelete` method where:

 - `id` - is a string value of the `_id` to find. It will be casted to the type
   of `_idClass`.
 - `callback` - the callback method using the signature `function (err, result)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `result` - if the query succeeded, a document as a class instance.

#### `find(filter, [options], callback)`

Returns an array of documents using MongoDB's native `find` method where:

 - `filter` - a filter object used to select the documents.
 - `options` - an options object passed to MongoDB's native `find` method.
 - `callback` - the callback method using the signature `function (err, results)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `results` - if the query succeeded, an array of documents as class
      instances.

Note: `callback` passes through `resultFactory`.

#### `findOne(filter, [options], callback)`

Returns a document using MongoDB's native `findOne` method where:

 - `filter` - a filter object used to select the document.
 - `options` - an options object passed to MongoDB's native `findOne` method.
 - `callback` - the callback method using the signature `function (err, result)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `result` - if the query succeeded, a document as a class instance.

Note: `callback` passes through `resultFactory`.

#### `findOneAndUpdate(filter, [options], callback)`

Finds a document, updates it and returns the new document using MongoDB's
native `findOneAndUpdate` method where:

 - `filter` - a filter object used to select the document to update.
 - `options` - an options object passed to MongoDB's native `findOneAndUpdate`
   method. Defaults to `{ returnOriginal: false }`.
 - `callback` - the callback method using the signature `function (err, result)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `result` - if the query succeeded, a document as a class instance.

Note: `callback` passes through `resultFactory`.

#### `findOneAndDelete(filter, [options], callback)`

Finds a document, deletes it and returns the document using MongoDB's native
`findOneAndDelete` method where:

 - `filter` - a filter object used to select the document to delete.
 - `options` - an options object passed to MongoDB's native `findOneAndDelete`
   method.
 - `callback` - the callback method using the signature `function (err, count)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `count` - if the query succeeded, a number indicating how many documents
      were deleted.

#### `insertOne(doc, [options], callback)`

Inserts a document and returns the new document using MongoDB's native
`insertOne` method where:

 - `doc` - a document object to insert.
 - `options` - an options object passed to MongoDB's native `insertOne` method.
 - `callback` - the callback method using the signature `function (err, results)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `results` - if the query succeeded, an array of documents as a class
      instances.

Note: `callback` passes through `resultFactory`.

#### `insertMany(docs, [options], callback)`

Inserts multiple documents and returns the new documents using MongoDB's native
`insertMany` method where:

 - `docs` - an array of document objects to insert.
 - `options` - an options object passed to MongoDB's native `insertMany` method.
 - `callback` - the callback method using the signature `function (err, results)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `results` - if the query succeeded, an array of documents as a class
      instances.

Note: `callback` passes through `resultFactory`.

#### `updateOne(filter, update, [options], callback)`

Updates a document and returns the count of modified documents using MongoDB's
native `updateOne` method where:

 - `filter` - a filter object used to select the document to update.
 - `update` - the update operations object.
 - `options` - an options object passed to MongoDB's native `updateOne` method.
 - `callback` - the callback method using the signature `function (err, count)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `count` - if the query succeeded, a number indicating how many documents
      were modified.

#### `updateMany(filter, update, [options], callback)`

Updates multiple documents and returns the count of modified documents using
MongoDB's native `updateMany` method where:

 - `filter` - a filter object used to select the documents to update.
 - `update` - the update operations object.
 - `options` - an options object passed to MongoDB's native `updateOne` method.
 - `callback` - the callback method using the signature `function (err, count)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `count` - if the query succeeded, a number indicating how many documents
      were modified.

#### `replaceOne(filter, doc, [options], callback)`

Replaces a document and returns the count of modified documents using
MongoDB's native `replaceOne` method where:

 - `filter` - a filter object used to select the document to replace.
 - `doc` - the document that replaces the matching document.
 - `options` - an options object passed to MongoDB's native `replaceOne` method.
 - `callback` - the callback method using the signature `function (err, count)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `count` - if the query succeeded, a number indicating how many documents
      were modified.

#### `deleteOne(filter, [options], callback)`

Deletes a document and returns the count of deleted documents using
MongoDB's native `deleteOne` method where:

 - `filter` - a filter object used to select the document to remove.
 - `options` - an options object passed to MongoDB's native `deleteOne` method.
 - `callback` - the callback method using the signature `function (err, count)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `count` - if the query succeeded, a number indicating how many documents
      were deleted.

#### `deleteMany(filter, [options], callback)`

Deletes multiple documents and returns the count of deleted documents using
MongoDB's native `deleteMany` method where:

 - `filter` - a filter object used to select the documents to remove.
 - `options` - an options object passed to MongoDB's native `deleteMany` method.
 - `callback` - the callback method using the signature `function (err, count)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `count` - if the query succeeded, a number indicating how many documents
      were deleted.


### Proxied methods

These methods literally call the native driver methods without any
modification.

#### `ensureIndex(fieldorspec, options, callback)`

Proxied call to MongoDB's native driver. See:
http://mongodb.github.io/node-mongodb-native/api-generated/collection.html#ensureindex

#### `count([filter], [options], callback)`

Proxied call to MongoDB's native driver. See:
http://mongodb.github.io/node-mongodb-native/api-generated/collection.html#count


## Examples

To see `hapi-mongo-models` in action, checkout [Frame](https://github.com/jedireza/frame).


## License

MIT
