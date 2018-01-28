'use strict';
const Hoek = require('hoek');
const MongoModels = require('mongo-models');


const register = async function (server, options) {

    Hoek.assert(options.models, 'options.models is required');
    Hoek.assert(options.mongodb, 'options.mongodb is required');
    Hoek.assert(options.mongodb.connection, 'options.mongodb.connection is required');
    Hoek.assert(options.mongodb.connection.uri, 'options.mongodb.connection.uri is required');
    Hoek.assert(options.mongodb.connection.db, 'options.mongodb.connection.db is required');

    const modelModules = options.models.reduce((accumulator, path) => {

        accumulator[path] = require(path);

        return accumulator;
    }, {});

    server.expose('mongo-models', MongoModels);

    server.ext({
        type: 'onPreStart',
        method: async function (_server) {

            if (options.hasOwnProperty('autoIndex') && options.autoIndex === false) {
                return;
            }

            const indexJobs = options.models
                .map((path) => modelModules[path])
                .filter((model) => Boolean(model.indexes))
                .map((model) => model.createIndexes.bind(model, model.indexes));

            await Promise.all(indexJobs);

            server.log(['info', 'mongodb'], 'HapiMongoModels: finished processing auto indexes.');
        }
    });

    server.ext({
        type: 'onPostStop',
        method: function (_server) {

            MongoModels.disconnect();

            server.log(['info', 'mongodb'], 'HapiMongoModels: closed db connection(s).');
        }
    });

    await MongoModels.connect(options.mongodb.connection, options.mongodb.options);

    server.log(['info', 'mongodb'], 'HapiMongoModels: successfully connected to the db.');
};


module.exports = {
    name: 'hapi-mongo-models',
    pkg: require('./package.json'),
    register
};
