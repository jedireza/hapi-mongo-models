var Path = require('path');
var Hoek = require('hoek');
var BaseModel = require('./lib/base-model');


exports.register = function (server, options, next) {

    var models = options.models || {};
    var mongodb = options.mongodb;
    var autoIndex = options.hasOwnProperty('autoIndex') ? options.autoIndex : true;

    Hoek.assert(mongodb, 'mongodb option is required');

    Object.keys(models).forEach(function modelsRequireExpose(key) {

        var modelPath = models[key];

        if (modelPath !== Path.resolve(modelPath)) {
            modelPath = Path.join(process.cwd(), modelPath);
        }

        models[key] = require(modelPath);
        server.expose(key, models[key]);
    });

    server.expose('addModel', function addModel(key, model) {

        Hoek.assert(
            model.prototype instanceof BaseModel.constructor,
            'Model must be extended from BaseModel.'
        );

        models[key] = model;
        server.expose(key, model);
    });

    server.expose('BaseModel', BaseModel);

    BaseModel.connect(mongodb, function connectToMongo(err, db) {

        if (err) {
            server.log('Error connecting to MongoDB via BaseModel.');
            return next(err);
        }

        next();
    });

    server.after(function serverAfter(server, done) {

        if (autoIndex) {
            Object.keys(models).forEach(function modelsEnsureIndexes(key) {

                models[key].ensureIndexes();
            });
        }

        done();
    });
};


exports.BaseModel = BaseModel;


exports.register.attributes = {
    pkg: require('./package.json')
};
