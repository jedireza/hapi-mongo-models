'use strict';
const Code = require('code');
const Config = require('./config');
const DummyPlugin = require('./fixtures/dummy-plugin');
const Hapi = require('hapi');
const Lab = require('lab');
const Path = require('path');
const Proxyquire = require('proxyquire');


const lab = exports.lab = Lab.script();
const stub = {
    MongoModels: {}
};
const ModelsPlugin = Proxyquire('..', {
    'mongo-models': stub.MongoModels
});


lab.experiment('Plugin', () => {

    lab.test('it returns an error when the db connection fails', (done) => {

        const realConnect = stub.MongoModels.connect;

        stub.MongoModels.connect = function (uri, options, callback) {

            callback(Error('connect failed'));
        };

        const server = new Hapi.Server();
        const Plugin = {
            register: ModelsPlugin,
            options: Config
        };

        server.connection({});

        server.register(Plugin, (err) => {

            Code.expect(err).to.be.an.object();

            stub.MongoModels.connect = realConnect;

            done();
        });
    });


    lab.test('it successfuly connects to the db and exposes the base model', (done) => {

        const server = new Hapi.Server();
        const Plugin = {
            register: ModelsPlugin,
            options: Config
        };

        server.connection({});

        server.register(Plugin, (err) => {

            if (err) {
                return done(err);
            }

            Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();
            Code.expect(server.plugins['hapi-mongo-models'].MongoModels).to.exist();

            server.plugins['hapi-mongo-models'].MongoModels.disconnect();

            done();
        });
    });


    lab.test('it successfuly connects to the db and exposes defined models', (done) => {

        const server = new Hapi.Server();
        const Plugin = {
            register: ModelsPlugin,
            options: {
                mongodb: Config.mongodb,
                models: {
                    Dummy: './test/fixtures/dummy-model'
                }
            }
        };

        server.connection({});

        server.register(Plugin, (err) => {

            if (err) {
                return done(err);
            }

            Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();
            Code.expect(server.plugins['hapi-mongo-models'].Dummy).to.exist();

            server.plugins['hapi-mongo-models'].MongoModels.disconnect();

            done();
        });
    });


    lab.test('it successfuly connects to the db and exposes defined models (with absolute paths)', (done) => {

        const server = new Hapi.Server();
        const Plugin = {
            register: ModelsPlugin,
            options: {
                mongodb: Config.mongodb,
                models: {
                    Dummy: Path.join(__dirname, 'fixtures/dummy-model')
                }
            }
        };

        server.connection({});

        server.register(Plugin, (err) => {

            if (err) {
                return done(err);
            }

            Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();
            Code.expect(server.plugins['hapi-mongo-models'].Dummy).to.exist();

            server.plugins['hapi-mongo-models'].MongoModels.disconnect();

            done();
        });
    });


    lab.test('it successfuly connects to the db, exposes defined models and skips indexing', (done) => {

        const server = new Hapi.Server();
        const Plugin = {
            register: ModelsPlugin,
            options: {
                mongodb: Config.mongodb,
                models: {
                    Dummy: './test/fixtures/dummy-model'
                },
                autoIndex: false
            }
        };

        server.connection({});

        server.register(Plugin, (err) => {

            if (err) {
                return done(err);
            }

            server.start((err) => {

                if (err) {
                    return done(err);
                }

                Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();
                Code.expect(server.plugins['hapi-mongo-models'].Dummy).to.exist();

                server.plugins['hapi-mongo-models'].MongoModels.disconnect();

                done();
            });
        });
    });


    lab.test('it skips calling `createIndexes` when none are defined', (done) => {

        const server = new Hapi.Server();
        const Plugin = {
            register: ModelsPlugin,
            options: {
                mongodb: Config.mongodb,
                models: {
                    NoIndex: './test/fixtures/noindex-model'
                }
            }
        };

        server.connection({});

        server.register(Plugin, (err) => {

            if (err) {
                return done(err);
            }

            server.start((err) => {

                if (err) {
                    return done(err);
                }

                Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();
                Code.expect(server.plugins['hapi-mongo-models'].NoIndex).to.exist();

                server.plugins['hapi-mongo-models'].MongoModels.disconnect();

                done();
            });
        });
    });


    lab.test('it allows models to be added dynamically specifically during another plugin\'s registration', (done) => {

        const server = new Hapi.Server();
        const hapiMongoModelsPlugin = {
            register: ModelsPlugin,
            options: {
                mongodb: Config.mongodb
            }
        };
        const plugins = [hapiMongoModelsPlugin, DummyPlugin];

        server.connection({});

        server.register(plugins, (err) => {

            if (err) {
                return done(err);
            }

            server.start((err) => {

                Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();
                Code.expect(server.plugins['hapi-mongo-models'].Dummy).to.exist();

                server.plugins['hapi-mongo-models'].MongoModels.disconnect();

                done(err);
            });
        });
    });
});
