'use strict';

const Joi = require('joi');
const ObjectAssign = require('object-assign');
const BaseModel = require('../../lib/base-model');


const NoIndex = BaseModel.extend({
    constructor: function (attrs) {

        ObjectAssign(this, attrs);
    }
});


NoIndex._collection = 'noindexes';


NoIndex.schema = Joi.object().keys({
    name: Joi.string().required(),
    hasHat: Joi.boolean()
});


module.exports = NoIndex;
