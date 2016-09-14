'use strict';
const Dummy = require('./dummy-model');


exports.register = function (server, options, next) {

    const addModel = server.plugins['hapi-mongo-models'].addModel;

    addModel('Dummy', Dummy);

    next();
};


exports.register.attributes = {
    name: 'dummy',
    version: '0.0.0',
    dependencies: ['hapi-mongo-models']
};
