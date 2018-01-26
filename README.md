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

During Hapi's `onPreStart` server extension point and based on your `autoIndex`
option, we create any indexes defined in the `models` supplied.

#### Register

```js
const HapiMongoModels = require('hapi-mongo-models');

const plugin = {
    plugin: HapiMongoModels,
    options: {
        mongodb: {
            connection: {
                uri: 'mongodb://localhost:27017/',
                db: 'hapi-mongo-models-test'
            },
            options: {}
        },
        models: [
            './path/to/customer',
            './path/to/order'
        ],
        autoIndex: false
    }
};

await server.register(plugin);
```

### Plugin options

The options passed to the plugin is an object where:

- `mongodb` - is an object where:
  - `connection` - is an object where:
    - `uri` - a string representing the connection uri for MongoDB.
    - `db` - the name of the database.
  - `options` - an optional object passed to MongoDB's native connect function.
- `autoIndex` - a boolean specifying if the plugin should call `createIndexes`
   for each model that has a static `indexes` property. Defaults to `true`.
   Typically set to `false` in production environments.
- `models` - an array strings representing the paths to the models (relative to
  the current working directory or absolute) of where to find the model on
  disk.


## Have a question?

Any issues or questions (no matter how basic), open an issue. Please take the
initiative to read relevant documentation and be pro-active with debugging.


## Want to contribute?

Contributions are welcome. If you're changing something non-trivial, you may
want to submit an issue before creating a large pull request.

Note: This plugin is designed for basic use-cases. If you find yourself
needing more, consider using the source as inspiration and create a custom
plugin for your app.


## License

MIT


## Don't forget

What you create with `hapi-mongo-models` is more important than `hapi-mongo-models`.
