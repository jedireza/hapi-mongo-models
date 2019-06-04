'use strict';

const Joi = require('@hapi/joi');
const MongoModels = require('mongo-models');


const schema = Joi.object({
    _id: Joi.object(),
    name: Joi.string().required(),
    email: Joi.string().email(),
    phone: Joi.string()
});


class Customer extends MongoModels {
    static create(name, email, phone) {

        const document = new Customer({
            name,
            email,
            phone
        });

        return this.insertOne(document);
    }

    speak() {

        console.log(`${this.name}: call me at ${this.phone}.`);
    }
}

Customer.collectionName = 'customers'; // the mongodb collection name
Customer.schema = schema;

module.exports = Customer;
