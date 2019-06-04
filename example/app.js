'use strict';

const Hapi = require('@hapi/hapi');
const Path = require('path');
const HapiMongoModels = require('../');

const mongodbPlugin = {
    plugin: HapiMongoModels,
    options: {
        mongodb: {
            connection: {
                uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/',
                db: 'hapi-mongo-models-test'
            },
            options: {
                useNewUrlParser: true
            }
        },
        models: [
            Path.resolve(__dirname, 'models/customer'),
            Path.resolve(__dirname, 'models/stock')
        ],
        autoIndex: false
    }
};

const startServer = async function()
{
    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    try {
        await server.register( mongodbPlugin );
    }
    catch( err ){ return console.log( err ) }


    try {
        await server.start();
    }
    catch (err) {
        console.log(err);
        process.exit(1);
    }

    const startRouters = async function()
    {
        try {
            await server.register({
                plugin: require('./plugins/customer'),
                options: {
                    mongodb: process.env.MONGODB_URI || 'mongodb://localhost:27017/',
                    autoIndex: false,
                    models: {
                        Customer: './models/customer'
                    }
                }
            });
        }
        catch( err ){ return console.log( err ) }

        try {
            await server.register({
                plugin: require('./plugins/stock'),
                options: {
                    mongodb: process.env.MONGODB_URI || 'mongodb://localhost:27017/',
                    autoIndex: false,
                    models: {
                        Stock: './models/stock'
                    }
                }
            });
        }
        catch( err ){ return console.log( {error: err} ) }
    };

    startRouters();
}

startServer();
