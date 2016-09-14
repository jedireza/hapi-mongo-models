'use strict';
const Joi = require('joi');
const MongoModels = require('mongo-models');


class Dummy extends MongoModels {}

Dummy.collection = 'dummies';

Dummy.schema = Joi.object().keys({
    name: Joi.string().required(),
    hasHat: Joi.boolean()
});

Dummy.indexes = [
    { key: { name: 1 } },
    { key: { hasHat: -1 } }
];


module.exports = Dummy;
