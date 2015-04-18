var Path = require('path');
var Hoek = require('hoek');
var BaseModel = require('./lib/base-model');


exports.register = function (server, options, next) {

    Hoek.assert(options.mongodb, 'mongodb property is required');

    var models = options.models || {};
    var mongodb = options.mongodb;
    var autoIndex = options.hasOwnProperty('autoIndex') ? options.autoIndex : true;

    var getModelPath = function (modelPath) {

        Hoek.assert(typeof modelPath === 'string', 'Model path must be a string');

        if (!Path.isAbsolute(modelPath)) {
            modelPath = Path.join(process.cwd(), modelPath);
        }

        return modelPath;
    };

    var requireModel = function (modelPath) {
        var model;

        if (typeof modelPath === 'string') {
            model = require(getModelPath(modelPath));
        } else {
            model = modelPath;
        }

        return model;
    };

    var addModel = function (modelName, modelPath) {

        models[modelName] = requireModel(modelPath);
    };

    Object.keys(models).forEach(function (modelName) {
        addModel(modelName, models[modelName]);
    });

    server.expose('addModel', addModel);

    server.after(function (server, done) {

        BaseModel.connect(mongodb, function (err, db) {

            if (err) {
                server.log('Error connecting to MongoDB via BaseModel.');
                return done(err);
            }

            Object.keys(models).forEach(function (modelName) {

                if (autoIndex) {
                    models[modelName].ensureIndexes();
                }

                server.expose(modelName, models[modelName]);
            });

            server.expose('BaseModel', BaseModel);

            done();
        });
    });

    next();
};


exports.BaseModel = BaseModel;


exports.register.attributes = {
    pkg: require('./package.json')
};
