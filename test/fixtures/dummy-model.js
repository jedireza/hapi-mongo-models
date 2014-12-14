var Joi = require('joi');
var ObjectAssign = require('object-assign');
var BaseModel = require('../../lib/base-model');


var Dummy = BaseModel.extend({
    constructor: function (attrs) {

        ObjectAssign(this, attrs);
    }
});


Dummy.schema = Joi.object().keys({
    name: Joi.string().required(),
    hasHat: Joi.boolean()
});


module.exports = Dummy;
