'use strict';
const Code = require('code');
const Hapi = require('hapi');
const Lab = require('lab');
const Path = require('path');
const Proxyquire = require('proxyquire');


const lab = exports.lab = Lab.script();
const config = {
    mongodb: {
        connection: {
            uri: 'mongodb://localhost:27017/',
            db: 'hapi-mongo-models-test'
        },
        options: {}
    },
    models: [
        Path.resolve(__dirname, 'fixtures/dummy-model'),
        Path.resolve(__dirname, 'fixtures/noindex-model')
    ]
};
const stub = {
    MongoModels: {}
};
const HapiMongoModels = Proxyquire('..', {
    'mongo-models': stub.MongoModels
});


lab.experiment('Plugin', () => {

    lab.test('it throws an error when the db connection fails', async () => {

        const realConnect = stub.MongoModels.connect;

        stub.MongoModels.connect = function (connection, options) {

            throw Error('connect failed');
        };

        const server = Hapi.Server();
        const plugin = {
            plugin: HapiMongoModels,
            options: config
        };
        const throws = async function () {

            await server.register(plugin);
        };

        await Code.expect(throws()).to.reject();

        stub.MongoModels.connect = realConnect;
    });


    lab.test('it successfuly connects and exposes the plugin (default autoIndex value)', async () => {

        const server = Hapi.Server();
        const plugin = {
            plugin: HapiMongoModels,
            options: config
        };

        await server.register(plugin);
        await server.start();

        Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();

        server.plugins['hapi-mongo-models']['mongo-models'].disconnect();

        await server.stop();
    });


    lab.test('it connects to the db and creates indexes during pre-start (autoIndex set manually)', async () => {

        const configClone = JSON.parse(JSON.stringify(config));

        configClone.autoIndex = true;

        const server = Hapi.Server();
        const plugin = {
            plugin: HapiMongoModels,
            options: configClone
        };

        await server.register(plugin);
        await server.start();

        Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();

        server.plugins['hapi-mongo-models']['mongo-models'].disconnect();

        await server.stop();
    });


    lab.test('it connects to the db and skips creating indexes during pre-start (autoIndex set manually)', async () => {

        const configClone = JSON.parse(JSON.stringify(config));

        configClone.autoIndex = false;

        const server = Hapi.Server();
        const plugin = {
            plugin: HapiMongoModels,
            options: configClone
        };

        await server.register(plugin);
        await server.start();

        Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();

        server.plugins['hapi-mongo-models']['mongo-models'].disconnect();

        await server.stop();
    });
});
