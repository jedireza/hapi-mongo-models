var Path = require('path');
var Hoek = require('hoek');
var BaseModel = require('./lib/base-model');


exports.BaseModel = BaseModel;


exports.register = function (server, options, next) {

    Hoek.assert(options.mongodb, 'options.mongodb is required');

    var models = options.models || {};
    var mongodb = options.mongodb;
    var autoIndex = options.hasOwnProperty('autoIndex') ? options.autoIndex : true;
    var addModel = function (key, model) {

        models[key] = model;
        server.expose(key, model);
    };

    Object.keys(models).forEach(function (key) {

        var modelPath = models[key];

        if (modelPath !== Path.resolve(modelPath)) {
            modelPath = Path.join(process.cwd(), modelPath);
        }

        addModel(key, require(modelPath));
    });

    server.expose('addModel', addModel);

    server.expose('BaseModel', BaseModel);

    server.ext('onPreStart', function (serverObj, done) {

        if (autoIndex) {
            Object.keys(models).forEach(function (key) {

                if (models[key].indexes) {
                    models[key].createIndexes(models[key].indexes);
                }
            });
        }

        done();
    });

    BaseModel.connect(mongodb, function (err, db) {

        if (err) {
            server.log('Error connecting to MongoDB via BaseModel.');
            return next(err);
        }

        next();
    });
};


exports.register.attributes = {
    pkg: require('./package.json')
};
