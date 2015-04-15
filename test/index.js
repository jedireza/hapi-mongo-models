var Lab = require('lab');
var Code = require('code');
var Hapi = require('hapi');
var Proxyquire = require('proxyquire');
var Config = require('./config');


var lab = exports.lab = Lab.script();
var stub = {
    BaseModel: {}
};
var ModelsPlugin = Proxyquire('..', {
    './lib/base-model': stub.BaseModel
});


lab.experiment('Plugin', function () {

    lab.test('it returns and error when the db connection fails', function (done) {

        var realConnect = stub.BaseModel.connect;
        stub.BaseModel.connect = function (config, callback) {

            callback(Error('connect failed'));
        };

        var server = new Hapi.Server();
        server.connection({ port: 0 });
        server.register(ModelsPlugin, function (err) {

            // Wait for the server to start,
            // simulating the connect-on-after behavior
            server.start(function (err) {
                Code.expect(err).to.be.an.object();
                stub.BaseModel.connect = realConnect;
                done();
            });
        });
    });


    lab.test('it successfuly connects to the db and exposes the base model', function (done) {

        var server = new Hapi.Server();
        var Plugin = {
            register: ModelsPlugin,
            options: Config
        };

        server.connection({ port: 0 });
        server.register(Plugin, function (err) {

            if (err) {
                return done(err);
            }

            server.start(function (err) {
                Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();
                Code.expect(server.plugins['hapi-mongo-models'].BaseModel).to.exist();

                server.plugins['hapi-mongo-models'].BaseModel.disconnect();

                done();
            });
        });
    });


    lab.test('it successfuly connects to the db and exposes defined models', function (done) {

        var server = new Hapi.Server();
        var Plugin = {
            register: ModelsPlugin,
            options: {
                mongodb: Config.mongodb,
                models: {
                    Dummy: './test/fixtures/dummy-model'
                }
            }
        };

        server.connection({ port: 0 });
        server.register(Plugin, function (err) {

            if (err) {
                return done(err);
            }

            server.start(function (err) {
                Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();
                Code.expect(server.plugins['hapi-mongo-models'].Dummy).to.exist();

                server.plugins['hapi-mongo-models'].BaseModel.disconnect();

                done();
            });
        });
    });

    lab.test('it exposes required and relatively pathed models', function (done) {
        var server = new Hapi.Server();
        var Plugin = {
            register: ModelsPlugin,
            options: {
                mongodb: Config.mongodb,
                models: {
                    DummyRelative: './test/fixtures/dummy-model',
                    DummyRequire: require('./fixtures/dummy-model')
                }
            }
        };

        server.connection({ port: 0 });
        server.register(Plugin, function (err) {
            if (err) {
                return done(err);
            }

            server.start(function (err) {
                if (err) {
                    return done(err);
                }

                Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();

                Code.expect(server.plugins['hapi-mongo-models'].DummyRelative).to.exist();
                Code.expect(server.plugins['hapi-mongo-models'].DummyRequire).to.exist();

                server.plugins['hapi-mongo-models'].BaseModel.disconnect();

                done();
            });
        });
    });

    lab.test('it successfuly connects to the db and exposes defined models and skips indexing', function (done) {

        var server = new Hapi.Server();
        var Plugin = {
            register: ModelsPlugin,
            options: {
                mongodb: Config.mongodb,
                models: {
                    Dummy: './test/fixtures/dummy-model'
                },
                autoIndex: false
            }
        };

        server.connection({ port: 0 });
        server.register(Plugin, function (err) {

            if (err) {
                return done(err);
            }

            server.start(function (err) {
                Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();
                Code.expect(server.plugins['hapi-mongo-models'].Dummy).to.exist();

                server.plugins['hapi-mongo-models'].BaseModel.disconnect();

                done();
            });
        });
    });

    lab.test('it allows models to be added dynamically during registration', function (done) {

        var server = new Hapi.Server();
        var hapiMongoModelsPlugin = {
            register: ModelsPlugin,
            options: {
                mongodb: Config.mongodb,
                autoIndex: false
            }
        };

        var dummyPlugin = {
            register: require('./fixtures/dummy-plugin')
        };

        var plugins = [hapiMongoModelsPlugin, dummyPlugin];

        server.connection({ port: 0 });
        server.register(plugins, function (err) {

            if (err) {
                return done(err);
            }

            server.start(function (err) {
                Code.expect(server.plugins['hapi-mongo-models']).to.be.an.object();
                Code.expect(server.plugins['hapi-mongo-models'].Dummy).to.exist();

                server.plugins['hapi-mongo-models'].BaseModel.disconnect();

                done();
            });
        });
    });
});
