var Joi = require('joi');
var ObjectAssign = require('object-assign');
var BaseModel = require('../../lib/base-model');


var NoIndex = BaseModel.extend({
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
