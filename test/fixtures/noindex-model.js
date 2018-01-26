'use strict';
const Joi = require('joi');
const MongoModels = require('mongo-models');


class NoIndex extends MongoModels {}

NoIndex.collectionName = 'noindexes';

NoIndex.schema = Joi.object().keys({
    name: Joi.string().required(),
    hasHat: Joi.boolean()
});


module.exports = NoIndex;
