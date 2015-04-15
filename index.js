var Path = require('path');
var BaseModel = require('./lib/base-model');


exports.register = function (server, options, next) {

    var models = options.models || {};
    var mongodb = options.mongodb;
    var autoIndex = options.hasOwnProperty('autoIndex') ? options.autoIndex : true;

    Object.keys(models).forEach(function (key) {
        if (typeof models[key] === 'string') {
            if (models[key].charAt(0) === '/') {
                models[key] = require(models[key]);
            } else if (models[key].charAt(0) === '.') {
                models[key] = require(Path.join(process.cwd(), models[key]));
            } else {
                models[key] = require(models[key]);
            }
        }
    });

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


exports.BaseModel = BaseModel;


exports.register.attributes = {
    pkg: require('./package.json')
};
