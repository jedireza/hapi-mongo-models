var Path = require('path');
var BaseModel = require('./lib/base-model');


exports.register = function (server, options, next) {

    var models = options.models || {};
    var mongodb = options.mongodb;
    var autoIndex = options.hasOwnProperty('autoIndex') ? options.autoIndex : true;

    Object.keys(models).forEach(function (key) {

        var modelPath = models[key];

        if (!Path.isAbsolute(modelPath)) {
            modelPath = Path.join(process.cwd(), modelPath);
        }

        models[key] = require(modelPath);
    });

    server.expose('addModel', function (key, model) {

        models[key] = model;
    });

    server.after(function (server, next) {

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
    });

    next();
};


exports.BaseModel = BaseModel;


exports.register.attributes = {
    pkg: require('./package.json')
};
