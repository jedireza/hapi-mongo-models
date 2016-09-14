'use strict';

const Path = require('path');
const Hoek = require('hoek');
const MongoModels = require('mongo-models');


exports.MongoModels = MongoModels;


exports.register = function (server, options, next) {

    Hoek.assert(options.mongodb, 'options.mongodb is required');

    const models = options.models || {};
    const mongodb = options.mongodb;
    const autoIndex = options.hasOwnProperty('autoIndex') ? options.autoIndex : true;
    const addModel = function (key, model) {

        models[key] = model;
        server.expose(key, model);
    };

    Object.keys(models).forEach((key) => {

        let modelPath = models[key];

        if (modelPath !== Path.resolve(modelPath)) {
            modelPath = Path.join(process.cwd(), modelPath);
        }

        addModel(key, require(modelPath));
    });

    server.expose('addModel', addModel);

    server.expose('MongoModels', MongoModels);

    server.ext('onPreStart', (serverObj, done) => {

        if (autoIndex) {
            Object.keys(models).forEach((key) => {

                if (models[key].indexes) {
                    models[key].createIndexes(models[key].indexes);
                }
            });
        }

        done();
    });

    MongoModels.connect(mongodb.uri, mongodb.options, (err, db) => {

        if (err) {
            server.log('Error connecting to MongoDB via MongoModels.');
            return next(err);
        }

        next();
    });
};


exports.register.attributes = {
    pkg: require('./package.json')
};
