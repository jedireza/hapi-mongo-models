'use strict';

const Joi = require('@hapi/joi');
const MongoModels = require('mongo-models');


const schema = Joi.object({
    _id: Joi.object(),
    description: Joi.string().required(),
    qty: Joi.number().integer(),
    cost: Joi.number()
});


class Stock extends MongoModels {
    static create(description, qty, cost) {

        const document = new Stock({
            description,
            qty,
            cost
        });

        return this.insertOne(document);
    }

    speak() {

        console.log(`${this.description}: (${this.qty} @ ${this.cost}).`);
    }
}

Stock.collectionName = 'stock'; // the mongodb collection name
Stock.schema = schema;

module.exports = Stock;
