var Path = require('path');
var BaseModel = require('./lib/base-model');

var internals = {};

internals.requireModel = function (models) {
    return function (modelName) {
        if (typeof models[modelName] === 'string') {
            models[modelName] = require(Path.join(process.cwd(), models[modelName]));
        }
    };
};

internals.after = function(options, models) {
    var mongodb = options.mongodb;
    var autoIndex = options.hasOwnProperty('autoIndex') ? options.autoIndex : true;

    return function (server, next) {
        BaseModel.connect(mongodb, function (err, db) {

            if (err) {
                server.log('Error connecting to MongoDB via BaseModel.');
                return next(err);
            }

            Object.keys(models).forEach(function (key) {

                if (autoIndex) {
                    models[key].ensureIndexes();
                }

                server.expose(key, models[key]);
            });

            server.expose('BaseModel', BaseModel);

            next();
        });
    };
};

exports.register = function (server, options, next) {

    var models = options.models || {};

    Object.keys(models).forEach(internals.requireModel(models));

    server.expose('addModel', function (modelName, model) {
        models[modelName] = model;
        internals.requireModel(models)(modelName);
    });

    server.after(internals.after(options, models));

    next();
};


exports.BaseModel = BaseModel;


exports.register.attributes = {
    pkg: require('./package.json')
};
