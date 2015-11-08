'use strict';

const Joi = require('joi');
const ObjectAssign = require('object-assign');
const BaseModel = require('../../lib/base-model');


const Dummy = BaseModel.extend({
    constructor: function (attrs) {

        ObjectAssign(this, attrs);
    }
});


Dummy._collection = 'dummies';


Dummy.schema = Joi.object().keys({
    name: Joi.string().required(),
    hasHat: Joi.boolean()
});


Dummy.indexes = [
    { key: { name: 1 } },
    { key: { hasHat: -1 } }
];


module.exports = Dummy;
