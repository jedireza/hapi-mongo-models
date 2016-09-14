# hapi-mongo-models

A hapi plugin for [`mongo-models`](https://github.com/jedireza/mongo-models).

[![Build Status](https://travis-ci.org/jedireza/hapi-mongo-models.svg?branch=master)](https://travis-ci.org/jedireza/hapi-mongo-models)
[![Dependency Status](https://david-dm.org/jedireza/hapi-mongo-models.svg?style=flat)](https://david-dm.org/jedireza/hapi-mongo-models)
[![devDependency Status](https://david-dm.org/jedireza/hapi-mongo-models/dev-status.svg?style=flat)](https://david-dm.org/jedireza/hapi-mongo-models#info=devDependencies)
[![peerDependency Status](https://david-dm.org/jedireza/hapi-mongo-models/peer-status.svg?style=flat)](https://david-dm.org/jedireza/hapi-mongo-models#info=peerDependencies)


## Install

```bash
$ npm install hapi-mongo-models
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
          uri: 'mongodb://localhost:27017/hapi-mongo-models-test',
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
                    "uri": "mongodb://localhost:27017/hapi-mongo-models-test",
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
   - `uri` - a string representing the connection uri for MongoDB.
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


## In the wild

To see `hapi-mongo-models` in action, checkout the
[Frame](https://github.com/jedireza/frame) project's
[models](https://github.com/jedireza/frame/tree/master/server/models).


## Have a question?

Any issues or questions (no matter how basic), open an issue. Please take the
initiative to read relevant documentation and be pro-active with debugging.


## Want to contribute?

Contributions are welcome. If you're changing something non-trivial, you may
want to submit an issue before creating a large pull request.


## License

MIT


## Don't forget

What you create with `hapi-mongo-models` is more important than `hapi-mongo-models`.
