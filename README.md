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

We wanted something in between the MongoDB driver and Mongoose. Something more
light weight. Something where we can interact with collections using simple
Javascript classes and get document results as instances of these classes.

We're also big fans of [hapijs](http://hapijs.com/) and their object schema
validation library [joi](https://github.com/hapijs/joi). Joi works really well
for defining a model's data schema.

It's just Javascript.


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
var BaseModel = require('hapi-mongo-models').BaseModel;

var Cat = BaseModel.extend({
    // instance prototype
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
          settings: { ... }
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
              "settings": { ... },
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
    - `settings` - an optional object passed to the MongoDB's native connect function.
 - `autoIndex` - a boolean specifying if the plugin should call `ensureIndex` for each
    model. Defaults to `true`. Typically set to `false` in production environments.
 - `models` - an object where each key is the exposed model name and each value is the
    path (relative to the current working directory) of where to find the model on disk.


## API

#### `extend(protoProps)`

Creates a new model class where:

 - `protoProps` - an object defining the prototype of the new class where:
    - `constructor` - an optional function that will be used as the instance
      constructor.

```js
var Kitten = BaseModel.extend({
    constructor: function (name) {

        this.name = name;
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
    - `settings` - an optional object passed to `MongoClient.connect`.
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

#### `pagedFind(query, fields, sort, limit, page, callback)`

A helper method to find documents with paginated results where:

 - `query` - is a query object, defining the conditions the documents need to
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
        - `data` - an array of results from the query.
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

Finds one document using MongoDB's native `findOne` method where:

 - `id` - is a string value of the id to find. It will be casted to the type
    of `_idClass`.
 - `options` - an options object passed to MongoDB's native `findOne` method.
 - `callback` - the callback method using the signature `function (err, results)`
    where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `results` - if the query succeeded, the results of the query.

Note: `callback` passes through `resultFactory`.

#### `findByIdAndUpdate(id, update, [options], callback)`

Finds one document using MongoDB's native `findAndModify` method where:

 - `id` - is a string value of the id to find. It will be casted to the type
    of `_idClass`.
 - `update` - an object containing the fields/values to be updated.
 - `options` - an optional options object passed to MongoDB's native
    `findAndModify` method.
 - `callback` - the callback method using the signature `function (err, results)`
    where:
    - `err` - if the query failed, the error reason, otherwise `null`.
    - `results` - if the query succeeded, the results of the query.


Note: `callback` passes through `resultFactory`.

#### `findByIdAndRemove(id, callback)`

Removes one document using MongoDB's native `remove` method where:

 - `id` - is a string value of the id to find. It will be casted to the type
    of `_idClass`.
 - `callback` - the callback method using the signature `function (err)`
    where:
    - `err` - if the query failed, the error reason, otherwise `null`.

### Proxied methods

#### `ensureIndex(fieldorspec, options, callback)`

Proxied call to MongoDB's native driver. See:
http://mongodb.github.io/node-mongodb-native/api-generated/collection.html#ensureindex

#### `count([query], [options], callback)`

Proxied call to MongoDB's native driver. See:
http://mongodb.github.io/node-mongodb-native/api-generated/collection.html#count

#### `find(query, [options], callback)`

Proxied call to MongoDB's native driver. See:
http://mongodb.github.io/node-mongodb-native/api-generated/collection.html#find

Note: `callback` passes through `resultFactory`.

#### `findOne(query, [options], callback)`

Proxied call to MongoDB's native driver. See:
http://mongodb.github.io/node-mongodb-native/api-generated/collection.html#findone

Note: `callback` passes through `resultFactory`.

#### `insert(docs, [options], callback)`

Proxied call to MongoDB's native driver. See:
http://mongodb.github.io/node-mongodb-native/api-generated/collection.html#insert

Note: `callback` passes through `resultFactory`.

#### `update(selector, document, [options], [callback])`

Proxied call to MongoDB's native driver. See:
http://mongodb.github.io/node-mongodb-native/api-generated/collection.html#update

#### `remove([selector], [options], [callback])`

Proxied call to MongoDB's native driver. See:
http://mongodb.github.io/node-mongodb-native/api-generated/collection.html#remove


## License

MIT
