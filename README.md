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


## Table of Contents

- [Install](#install)
- [Usage](#usage)
    - [Creating models](#creating-models)
    - [Server plugin](#server-plugin)
        - [Register manually](#register-manually)
        - [Register via manifest](#register-via-manifest)
    - [Plugin options](#plugin-options)
    - [Usage in other plugins](#usage-in-other-plugins)
    - [Example](#example)
- [Model API](#model-api)
    - [Constructor](#constructor)
        - [`extend(protoProps)`](#extendprotoprops)
    - [Properties](#properties)
        - [`_idClass`](#_idclass)
        - [`_collection`](#_collection)
        - [`schema`](#schema)
        - [`ObjectId`](#objectid)
    - [Methods](#methods)
        - [`connect(config, callback)`](#connectconfig-callback)
        - [`disconnect()`](#disconnect)
        - [`createIndexes(indexSpecs, [callback])`](#createindexesindexspecs-callback)
        - [`validate(input, callback)`](#validateinput-callback)
        - [`validate(callback)`](#validatecallback)
        - [`fieldsAdapter(fields)`](#fieldsadapterfields)
        - [`sortAdapter(sorts)`](#sortadaptersorts)
        - [`count(filter, [options], callback)`](#countfilter-options-callback)
        - [`distinct(field, [filter], callback)`](#distinctfield-filter-callback)
        - [`find(filter, [options], callback)`](#findfilter-options-callback)
        - [`pagedFind(filter, fields, sort, limit, page, callback)`](#pagedfindfilter-fields-sort-limit-page-callback)
        - [`findById(id, [options], callback)`](#findbyidid-options-callback)
        - [`findByIdAndUpdate(id, update, [options], callback)`](#findbyidandupdateid-update-options-callback)
        - [`findByIdAndDelete(id, callback)`](#findbyidanddeleteid-callback)
        - [`findOne(filter, [options], callback)`](#findonefilter-options-callback)
        - [`findOneAndUpdate(filter, update, [options], callback)`](#findoneandupdatefilter-options-callback)
        - [`findOneAndDelete(filter, [options], callback)`](#findoneanddeletefilter-options-callback)
        - [`insertOne(doc, [options], callback)`](#insertonedoc-options-callback)
        - [`insertMany(docs, [options], callback)`](#insertmanydocs-options-callback)
        - [`updateOne(filter, update, [options], callback)`](#updateonefilter-update-options-callback)
        - [`updateMany(filter, update, [options], callback)`](#updatemanyfilter-update-options-callback)
        - [`replaceOne(filter, doc, [options], callback)`](#replaceonefilter-doc-options-callback)
        - [`deleteOne(filter, [options], callback)`](#deleteonefilter-options-callback)
        - [`deleteMany(filter, [options], callback)`](#deletemanyfilter-options-callback)
- [In the wild](#in-the-wild)
- [Questions and contributing](#questions-and-contributing)
- [License](#license)


## Install

```bash
$ npm install hapi-mongo-models
```


## Usage

### Creating models

You extend the `BaseModel` to create new model classes. The base model also
acts as a singleton so all models can share one db connection.

Let's create a `Customer` model.

```js
const Joi = require('joi');
const ObjectAssign = require('object-assign');
const BaseModel = require('hapi-mongo-models').BaseModel;

const Customer = BaseModel.extend({
    // instance prototype
    constructor: function (attrs) {

        ObjectAssign(this, attrs);
    }
});

Customer._collection = 'customers'; // the mongo collection name

Customer.schema = Joi.object().keys({
    name: Joi.string().required()
});

Customer.staticFunction = function () {

    // static class function
};

module.exports = Customer;
```

### Server plugin

During plugin registration we connect to MongoDB using the supplied options.

#### Register manually

```js
const HapiMongoModels = require('hapi-mongo-models');

const plugin = {
    register: HapiMongoModels,
    options: {
        mongodb: {
          url: 'mongodb://localhost:27017/hapi-mongo-models-test',
          options: {}
        },
        autoIndex: false,
        models: {
            Customer: './path/to/customer',
            Order: './path/to/order'
        }
    }
};

server.register(plugin, (err) => {

     if (err) {
         console.log('Failed loading plugin');
     }
 });
```

#### Register via manifest

```json
{
    "connections": [{
        "port": 8080
    }],
    "registrations": [{
        "plugin": {
            "register": "hapi-mongo-models",
            "options": {
                "mongodb": {
                    "url": "mongodb://localhost:27017/hapi-mongo-models-test",
                    "options": {},
                },
                "autoIndex": false,
                "models": {
                    "Customer": "./path/to/customer",
                    "Order": "./path/to/order"
                }
            }
        }
    }]
}
```

### Plugin options

The options passed to the plugin is an object where:

 - `mongodb` - is an object where:
   - `url` - a string representing the connection url for MongoDB.
   - `options` - an optional object passed to MongoDB's native connect function.
 - `autoIndex` - a boolean specifying if the plugin should call `createIndexes`
   for each model that has a static `indexes` property. Defaults to `true`.
   Typically set to `false` in production environments.
 - `models` - an object where each key is the exposed model name and each value
   is the path (relative to the current working directory or absolute) of where
   to find the model on disk.

### Usage in other plugins

You can depend on `hapi-mongo-models` inside other plugins. This allows you to
access models that were defined in the plugin config and add models
dynamically.

For example, in a plugin you author:

```js
const DynamoKitty = require('./models/dynamo-kitty');

exports.register = function (server, options, next) {

    const addModel = server.plugins['hapi-mongo-models'].addModel;
    addModel('DynamoKitty', DynamoKitty);
    next();
};

exports.register.attributes = {
    name: 'dynamo',
    version: '1.0.0',
    dependencies: ['hapi-mongo-models']
};
```

The `addModel` method is a function with the signature `function (key, model)`
where:
  - `key` - is a string representing the name that will be exported.
  - `model` - is a model class created by using `BaseModel.extend(...)`.

### Example

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

            const Customer = request.server.plugins['hapi-mongo-models'].Customer;
            const filter = {};

            if (request.query.name) {
                filter.name = request.query.name;
            }

            Customer.find(filter, (err, results) => {

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


## Model API

### Constructor

#### `extend(protoProps)`

Creates a new model class where:

 - `protoProps` - an object defining the prototype of the new class where:
    - `constructor` - an optional function that will be used as the instance
      constructor.

```js
const BaseModel = require('hapi-mongo-models').BaseModel;
const ObjectAssign = require('object-assign');

const Kitten = BaseModel.extend({
    constructor: function (attrs) {

        ObjectAssign(this, attrs);
    },
    speak: function () {

        console.log(this.name + ' says: meeeeeeeeow');
    }
});
```

### Properties

#### `_idClass`

The type used to cast `_id` properties. Defaults to
[`MongoDB.ObjectId`](http://docs.mongodb.org/manual/reference/object-id/).

If you wanted to use plain strings for your document `_id` properties you could:

```js
Kitten._idClass = String;
```

When you define a custom `_idClass` property for your model you just need to
pass an `_id` parameter of that type when you create new documents.

```js
const data = {
    _id: 'captain-cute',
    name: 'Captain Cute'
};

Kitten.insert(data, (err, results) => {

    // handle response
});
```

#### `_collection`

The name of the collection in MongoDB.

```js
Kitten._collection = 'kittens';
```

#### `schema`

A `joi` object schema. See: https://github.com/hapijs/joi

```js
Kitten.schema = Joi.object().keys({
    _id: Joi.string(),
    name: Joi.string().required(),
    email: Joi.string().required()
});
```

#### `ObjectId`

An alias to `MongoDB.ObjectId`.

### Methods

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

#### `createIndexes(indexSpecs, [callback])`

Note: `createIndexes` is called during plugin registration for each model when
the `autoIndex` option is set to `true`.

Creates multiple indexes in the collection where:

 - `indexSpecs` - an array of objects containing index specifications to be
   created.
 - `callback` - the callback method using the signature `function (err, result)`
    where:
    - `err` - if creating the indexes failed, the error reason, otherwise `null`.
    - `result` - if creating the indexes succeeded, the result object.

Indexes are defined as a static property on your models like:

```js
Kitten.indexes = [
    { key: { name: 1 } },
    { key: { email: -1 } }
];
```

For details on all the options an index specification may have see:

https://docs.mongodb.org/manual/reference/command/createIndexes/

#### `validate(input, callback)`

Uses `joi` validation using the static `schema` object property of a model
class to validate `input` where:

 - `input` - is the object to validate.
 - `callback` - is the callback method using the signature `function (err,
    value)` where:
    - `err` - if validation failed, the error reason, otherwise null.
    - `value` - the validated value with any type conversions and other
       modifiers applied.

```js
const data = {
    name: 'Captain Cute'
};

Kitten.validate(data, (err, value) => {

    // handle results
});
```

See: https://github.com/hapijs/joi#validatevalue-schema-options-callback

#### `validate(callback)`

Uses `joi` validation using the static `schema` object property of a model
class to validate the instance data of a model where:

 - `callback` - is the callback method using the signature `function (err,
    value)` where:
    - `err` - if validation failed, the error reason, otherwise null.
    - `value` - the validated value with any type conversions and other
       modifiers applied.

```js
const cc = new Kitten({
    name: 'Captain Cute'
});

cc.validate((err, value) => {

    // handle results
});
```

See: https://github.com/hapijs/joi#validatevalue-schema-options-callback

#### `fieldsAdapter(fields)`

A helper method to create a fields object suitable to use with MongoDB queries
where:

 - `fields` - a string with space separated field names. Fields may be prefixed
   with `-` to indicate exclusion instead of inclusion.

Returns a MongoDB friendly fields object.

```js
Kitten.fieldsAdapter('name -email');

// { name: true, email: false }
```

#### `sortAdapter(sorts)`

A helper method to create a sort object suitable to use with MongoDB queries
where:

 - `sorts` - a string with space separated field names. Fields may be prefixed
   with `-` to indicate decending sort order.

Returns a MongoDB friendly sort object.

```js
Kitten.sortAdapter('name -email');

// { name: 1, email: -1 }
```

#### `count(filter, [options], callback)`

Counts documents matching a `filter` where:

 - `filter` - a filter object used to select the documents to count.
 - `options` - an options object passed to MongoDB's native `count` method.
 - `callback` - the callback method using the signature `function (err, count)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `count` - if the query succeeded, a number indicating how many documents
      matched the `filter`.

#### `distinct(field, [filter], callback)`

Finds the distinct values for the specified `field`.

 - `field` - a string representing the field for which to return distinct values.
 - `filter` - an optional filter object used to limit the documents distinct applies to.
 - `callback` - the callback method using the signature `function (err, values)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `values` - if the query succeeded, an array of values representing the
      distinct values for the specified `field`.

#### `find(filter, [options], callback)`

Finds documents where:

 - `filter` - a filter object used to select the documents.
 - `options` - an options object passed to MongoDB's native `find` method.
 - `callback` - the callback method using the signature `function (err, results)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `results` - if the query succeeded, an array of documents as class
      instances.

#### `pagedFind(filter, fields, sort, limit, page, callback)`

Finds documents with paginated results where:

 - `filter` - a filter object used to select the documents.
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

#### `findById(id, [options], callback)`

Finds a document by `_id` where:

 - `id` - is a string value of the `_id` to find. It will be casted to the type
    of `_idClass`.
 - `options` - an options object passed to MongoDB's native `findOne` method.
 - `callback` - the callback method using the signature `function (err, result)`
    where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `result` - if the query succeeded, a document as a class instance.

#### `findByIdAndUpdate(id, update, [options], callback)`

Finds a document by `_id`, updates it and returns it where:

 - `id` - is a string value of the `_id` to find. It will be casted to the type
   of `_idClass`.
 - `update` - an object containing the fields/values to be updated.
 - `options` - an optional options object passed to MongoDB's native
   `findAndModify` method. Defaults to `{ returnOriginal: false }`.
 - `callback` - the callback method using the signature `function (err, result)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `result` - if the query succeeded, a document as a class instance.


#### `findByIdAndDelete(id, callback)`

Finds a document by `_id`, deletes it and returns it where:

 - `id` - is a string value of the `_id` to find. It will be casted to the type
   of `_idClass`.
 - `callback` - the callback method using the signature `function (err, result)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `result` - if the query succeeded, a document as a class instance.

#### `findOne(filter, [options], callback)`

Finds one document matching a `filter` where:

 - `filter` - a filter object used to select the document.
 - `options` - an options object passed to MongoDB's native `findOne` method.
 - `callback` - the callback method using the signature `function (err, result)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `result` - if the query succeeded, a document as a class instance.

#### `findOneAndUpdate(filter, update, [options], callback)`

Finds one document matching a `filter`, updates it and returns it where:

 - `filter` - a filter object used to select the document to update.
 - `update` - an object containing the fields/values to be updated.
 - `options` - an options object passed to MongoDB's native `findOneAndUpdate`
   method. Defaults to `{ returnOriginal: false }`.
 - `callback` - the callback method using the signature `function (err, result)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `result` - if the command succeeded, a document as a class instance.

#### `findOneAndDelete(filter, [options], callback)`

Finds one document matching a `filter`, deletes it and returns it where:

 - `filter` - a filter object used to select the document to delete.
 - `options` - an options object passed to MongoDB's native `findOneAndDelete`
   method.
 - `callback` - the callback method using the signature `function (err, result)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `result` - if the query succeeded, a document as a class instance.

#### `insertOne(doc, [options], callback)`

Inserts a document and returns the new document where:

 - `doc` - a document object to insert.
 - `options` - an options object passed to MongoDB's native `insertOne` method.
 - `callback` - the callback method using the signature `function (err, results)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `results` - if the command succeeded, an array of documents as a class
      instances.

#### `insertMany(docs, [options], callback)`

Inserts multiple documents and returns them where:

 - `docs` - an array of document objects to insert.
 - `options` - an options object passed to MongoDB's native `insertMany` method.
 - `callback` - the callback method using the signature `function (err, results)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `results` - if the command succeeded, an array of documents as a class
      instances.

#### `updateOne(filter, update, [options], callback)`

Updates a document and returns the count of modified documents where:

 - `filter` - a filter object used to select the document to update.
 - `update` - the update operations object.
 - `options` - an options object passed to MongoDB's native `updateOne` method.
 - `callback` - the callback method using the signature `function (err, count)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `count` - if the command succeeded, a number indicating how many documents
      were modified.

#### `updateMany(filter, update, [options], callback)`

Updates multiple documents and returns the count of modified documents where:

 - `filter` - a filter object used to select the documents to update.
 - `update` - the update operations object.
 - `options` - an options object passed to MongoDB's native `updateOne` method.
 - `callback` - the callback method using the signature `function (err, count)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `count` - if the command succeeded, a number indicating how many documents
      were modified.

#### `replaceOne(filter, doc, [options], callback)`

Replaces a document and returns the count of modified documents where:

 - `filter` - a filter object used to select the document to replace.
 - `doc` - the document that replaces the matching document.
 - `options` - an options object passed to MongoDB's native `replaceOne` method.
 - `callback` - the callback method using the signature `function (err, count)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `count` - if the query succeeded, a number indicating how many documents
      were modified.

#### `deleteOne(filter, [options], callback)`

Deletes a document and returns the count of deleted documents where:

 - `filter` - a filter object used to select the document to delete.
 - `options` - an options object passed to MongoDB's native `deleteOne` method.
 - `callback` - the callback method using the signature `function (err, count)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `count` - if the query succeeded, a number indicating how many documents
      were deleted.

#### `deleteMany(filter, [options], callback)`

Deletes multiple documents and returns the count of deleted documents where:

 - `filter` - a filter object used to select the documents to delete.
 - `options` - an options object passed to MongoDB's native `deleteMany` method.
 - `callback` - the callback method using the signature `function (err, count)`
   where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `count` - if the query succeeded, a number indicating how many documents
      were deleted.


## In the wild

To see `hapi-mongo-models` in action, checkout the
[Frame](https://github.com/jedireza/frame) project's
[models](https://github.com/jedireza/frame/tree/master/server/models).


## Questions and contributing

Any issues or questions (no matter how basic), open an issue. Please take the
initiative to include basic debugging information like operating system
and relevant version details such as:

```bash
$ npm version

# { 'hapi-mongo-models': '0.0.0',
#   npm: '2.5.1',
#   http_parser: '2.3',
#   modules: '14',
#   node: '0.12.0',
#   openssl: '1.0.1l',
#   uv: '1.0.2',
#   v8: '3.28.73',
#   zlib: '1.2.8' }
```

Contributions are welcome. Your code should:

 - include 100% test coverage
 - follow the [hapi.js coding conventions](http://hapijs.com/styleguide)

If you're changing something non-trivial, you may want to submit an issue
first.


## License

MIT


## Don't forget

What you create with `hapi-mongo-models` is more important than `hapi-mongo-models`.
