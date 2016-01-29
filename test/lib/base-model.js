'use strict';

const Async = require('async');
const Joi = require('joi');
const Lab = require('lab');
const Code = require('code');
const ObjectAssign = require('object-assign');
const Proxyquire = require('proxyquire');
const Config = require('../config');


const lab = exports.lab = Lab.script();
const stub = {
    mongodb: {}
};
const BaseModel = Proxyquire('../../lib/base-model', {
    mongodb: stub.mongodb
});


lab.experiment('BaseModel DB Connection', () => {

    lab.test('it connects and disconnects the database', (done) => {

        BaseModel.connect(Config.mongodb, (err, db) => {

            Code.expect(err).to.not.exist();
            Code.expect(db).to.be.an.object();

            Code.expect(BaseModel.db.serverConfig.isConnected()).to.equal(true);
            BaseModel.disconnect();
            Code.expect(BaseModel.db.serverConfig.isConnected()).to.equal(false);

            done();
        });
    });


    lab.test('it returns an error when the db connection fails', (done) => {

        const realMongoClient = stub.mongodb.MongoClient;

        stub.mongodb.MongoClient = {
            connect: function (url, settings, callback) {

                callback(new Error('mongodb is gone'));
            }
        };

        BaseModel.connect(Config.mongodb, (err, db) => {

            Code.expect(err).to.be.an.object();
            Code.expect(db).to.not.exist();

            stub.mongodb.MongoClient = realMongoClient;

            done();
        });
    });
});


lab.experiment('BaseModel Validation', () => {

    lab.test('it returns the Joi validation results of a SubClass', (done) => {

        const SubModel = BaseModel.extend({
            constructor: function (attrs) {

                ObjectAssign(this, attrs);
            }
        });

        SubModel.schema = Joi.object().keys({
            name: Joi.string().required()
        });

        Code.expect(SubModel.validate()).to.be.an.object();

        done();
    });


    lab.test('it returns the Joi validation results of a SubClass instance', (done) => {

        const SubModel = BaseModel.extend({
            constructor: function (attrs) {

                ObjectAssign(this, attrs);
            }
        });

        SubModel.schema = Joi.object().keys({
            name: Joi.string().required()
        });

        const myModel = new SubModel({ name: 'Stimpy' });

        Code.expect(myModel.validate()).to.be.an.object();

        done();
    });
});


lab.experiment('BaseModel Result Factory', () => {

    let SubModel;


    lab.before((done) => {

        SubModel = BaseModel.extend({
            constructor: function (attrs) {

                ObjectAssign(this, attrs);
            }
        });

        done();
    });


    lab.test('it returns early when an error is present', (done) => {

        const callback = function (err, result) {

            Code.expect(err).to.be.an.object();
            Code.expect(result).to.not.exist();

            done();
        };

        SubModel.resultFactory(callback, new Error('it went boom'), undefined);
    });


    lab.test('it returns an instance for a single document result', (done) => {

        const callback = function (err, result) {

            Code.expect(err).to.not.exist();
            Code.expect(result).to.be.an.instanceOf(SubModel);

            done();
        };
        const document = {
            _id: '54321',
            name: 'Stimpy'
        };

        SubModel.resultFactory(callback, undefined, document);
    });


    lab.test('it returns an array of instances for a `writeOpResult` object', (done) => {

        const callback = function (err, docs) {

            Code.expect(err).to.not.exist();
            Code.expect(docs).to.be.an.array();

            docs.forEach((result) => {

                Code.expect(result).to.be.an.instanceOf(SubModel);
            });

            done();
        };
        const docs = {
            ops: [
                { name: 'Ren' },
                { name: 'Stimpy' }
            ]
        };

        SubModel.resultFactory(callback, undefined, docs);
    });


    lab.test('it returns a instance for a `findOpResult` object', (done) => {

        const callback = function (err, result) {

            Code.expect(err).to.not.exist();
            Code.expect(result).to.be.an.object();
            Code.expect(result).to.be.an.instanceOf(SubModel);

            done();
        };
        const result = {
            value: { _id: 'ren', name: 'Ren' }
        };

        SubModel.resultFactory(callback, undefined, result);
    });


    lab.test('it returns undefined for a `findOpResult` object that missed', (done) => {

        const callback = function (err, result) {

            Code.expect(err).to.not.exist();
            Code.expect(result).to.not.exist();

            done();
        };
        const result = {
            value: null
        };

        SubModel.resultFactory(callback, undefined, result);
    });


    lab.test('it does not convert an object into an instance without an _id property', (done) => {

        const callback = function (err, result) {

            Code.expect(err).to.not.exist();
            Code.expect(result).to.be.an.object();
            Code.expect(result).to.not.be.an.instanceOf(SubModel);

            done();
        };
        const document = { name: 'Ren' };

        SubModel.resultFactory(callback, undefined, document);
    });
});


lab.experiment('BaseModel Indexes', () => {

    let SubModel;


    lab.before((done) => {

        SubModel = BaseModel.extend({
            constructor: function (attrs) {

                ObjectAssign(this, attrs);
            }
        });

        SubModel._collection = 'submodels';

        BaseModel.connect(Config.mongodb, (err, db) => {

            done(err);
        });
    });


    lab.after((done) => {

        BaseModel.disconnect();
        done();
    });


    lab.test('it successfully creates indexes', (done) => {

        SubModel.createIndexes([{ key: { username: 1 } }], (err, results) => {

            Code.expect(err).to.not.exist();
            Code.expect(results).to.be.an.object();

            done();
        });
    });
});


lab.experiment('BaseModel Helpers', () => {

    lab.test('it returns expected results for the fields adapter', (done) => {

        const fieldsDoc = BaseModel.fieldsAdapter('one -two three');
        Code.expect(fieldsDoc).to.be.an.object();
        Code.expect(fieldsDoc.one).to.equal(true);
        Code.expect(fieldsDoc.two).to.equal(false);
        Code.expect(fieldsDoc.three).to.equal(true);

        const fieldsDoc2 = BaseModel.fieldsAdapter('');
        Code.expect(Object.keys(fieldsDoc2)).to.have.length(0);

        done();
    });


    lab.test('it returns expected results for the sort adapter', (done) => {

        const sortDoc = BaseModel.sortAdapter('one -two three');
        Code.expect(sortDoc).to.be.an.object();
        Code.expect(sortDoc.one).to.equal(1);
        Code.expect(sortDoc.two).to.equal(-1);
        Code.expect(sortDoc.three).to.equal(1);

        const sortDoc2 = BaseModel.sortAdapter('');
        Code.expect(Object.keys(sortDoc2)).to.have.length(0);

        done();
    });
});


lab.experiment('BaseModel Paged Find', () => {

    let SubModel;


    lab.beforeEach((done) => {

        SubModel = BaseModel.extend({
            constructor: function (attrs) {

                ObjectAssign(this, attrs);
            }
        });

        SubModel._collection = 'submodels';

        BaseModel.connect(Config.mongodb, (err, db) => {

            done(err);
        });
    });


    lab.after((done) => {

        BaseModel.disconnect();
        done();
    });


    lab.afterEach((done) => {

        SubModel.deleteMany({}, (err, result) => {

            done(err);
        });
    });


    lab.test('it returns early when an error occurs', (done) => {

        const realCount = SubModel.count;
        SubModel.count = function (filter, callback) {

            callback(new Error('count failed'));
        };

        const filter = {};
        let fields;
        const limit = 10;
        const page = 1;
        const sort = { _id: -1 };

        SubModel.pagedFind(filter, fields, sort, limit, page, (err, docs) => {

            Code.expect(err).to.be.an.object();
            Code.expect(docs).to.not.exist();

            SubModel.count = realCount;

            done();
        });
    });


    lab.test('it returns paged results', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = {};
            let fields;
            const limit = 10;
            const page = 1;
            const sort = { _id: -1 };

            SubModel.pagedFind(filter, fields, sort, limit, page, (err, docs) => {

                Code.expect(err).to.not.exist();
                Code.expect(docs).to.be.an.object();

                done(err);
            });
        });
    });


    lab.test('it returns paged results where end item is less than total', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = {};
            let fields;
            const limit = 2;
            const page = 1;
            const sort = { _id: -1 };

            SubModel.pagedFind(filter, fields, sort, limit, page, (err, docs) => {

                Code.expect(err).to.not.exist();
                Code.expect(docs).to.be.an.object();

                done(err);
            });
        });
    });


    lab.test('it returns paged results where begin item is less than total', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = { 'role.special': { $exists: true } };
            let fields;
            const limit = 2;
            const page = 1;
            const sort = { _id: -1 };

            SubModel.pagedFind(filter, fields, sort, limit, page, (err, docs) => {

                Code.expect(err).to.not.exist();
                Code.expect(docs).to.be.an.object();

                done(err);
            });
        });
    });
});


lab.experiment('BaseModel Proxied Methods', () => {

    let SubModel;


    lab.before((done) => {

        SubModel = BaseModel.extend({
            constructor: function (attrs) {

                ObjectAssign(this, attrs);
            }
        });

        SubModel._collection = 'submodels';

        BaseModel.connect(Config.mongodb, (err, db) => {

            done(err);
        });
    });


    lab.after((done) => {

        BaseModel.disconnect();
        done();
    });


    lab.afterEach((done) => {

        SubModel.deleteMany({}, (err, result) => {

            done(err);
        });
    });


    lab.test('it inserts data and returns the results', (done) => {

        const testDocs = [
            { name: 'Ren' },
            { name: 'Stimpy' },
            { name: 'Yak' }
        ];

        SubModel.insertMany(testDocs, (err, docs) => {

            Code.expect(err).to.not.exist();
            Code.expect(docs).to.be.an.array();
            Code.expect(docs.length).to.equal(3);

            done(err);
        });
    });


    lab.test('it inserts one document and returns the result', (done) => {

        const testDoc = { name: 'Horse' };

        SubModel.insertOne(testDoc, (err, docs) => {

            Code.expect(err).to.not.exist();
            Code.expect(docs).to.be.an.array();

            done(err);
        });
    });


    lab.test('it inserts many documents and returns the results', (done) => {

        const testDocs = [
            { name: 'Toast' },
            { name: 'Space' }
        ];

        SubModel.insertMany(testDocs, (err, docs) => {

            Code.expect(err).to.not.exist();
            Code.expect(docs).to.be.an.array();
            Code.expect(docs.length).to.equal(2);

            done(err);
        });
    });


    lab.test('it updates a document and returns the results', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = {
                _id: results.setup[0]._id
            };
            const update = {
                $set: { isCool: true }
            };

            SubModel.updateOne(filter, update, (err, count) => {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(1);

                done(err);
            });
        });
    });


    lab.test('it updates a document and returns the results (with options)', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = {
                _id: results.setup[0]._id
            };
            const update = {
                $set: { isCool: true }
            };
            const options = { upsert: true };

            SubModel.updateOne(filter, update, options, (err, count) => {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(1);

                done(err);
            });
        });
    });


    lab.test('it returns an error when updateOne fails', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const realCollection = BaseModel.db.collection;
            BaseModel.db.collection = function () {

                return {
                    updateOne: function (filter, update, options, callback) {

                        callback(new Error('Whoops!'));
                    }
                };
            };

            const filter = {};
            const update = { $set: { isCool: true } };

            SubModel.updateOne(filter, update, (err, count) => {

                Code.expect(err).to.exist();
                Code.expect(count).to.not.exist();

                BaseModel.db.collection = realCollection;
                done();
            });
        });
    });


    lab.test('it updates many documents and returns the results', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = {};
            const update = { $set: { isCool: true } };

            SubModel.updateMany(filter, update, (err, count) => {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(3);

                done(err);
            });
        });
    });


    lab.test('it updates many documents and returns the results (with options)', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = {};
            const update = { $set: { isCool: true } };
            const options = { upsert: true };

            SubModel.updateMany(filter, update, options, (err, count) => {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(3);

                done(err);
            });
        });
    });


    lab.test('it returns an error when updateMany fails', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const realCollection = BaseModel.db.collection;
            BaseModel.db.collection = function () {

                return {
                    updateMany: function (filter, update, options, callback) {

                        callback(new Error('Whoops!'));
                    }
                };
            };

            const filter = {};
            const update = { $set: { isCool: true } };

            SubModel.updateMany(filter, update, (err, count) => {

                Code.expect(err).to.exist();
                Code.expect(count).to.not.exist();

                BaseModel.db.collection = realCollection;
                done();
            });
        });
    });


    lab.test('it returns a collection count', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            SubModel.count({}, (err, result) => {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.a.number();
                Code.expect(result).to.equal(3);

                done();
            });
        });
    });


    lab.test('it returns distinct results from a collection', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDocs = [
                    { name: 'Ren', group: 'Friend' },
                    { name: 'Stimpy', group: 'Friend' },
                    { name: 'Yak', group: 'Foe' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            SubModel.distinct('group', (err, values) => {

                Code.expect(err).to.not.exist();
                Code.expect(values).to.be.an.array();
                Code.expect(values.length).to.equal(2);

                done();
            });
        });
    });


    lab.test('it returns a result array', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            SubModel.find({}, (err, docs) => {

                Code.expect(err).to.not.exist();
                Code.expect(docs).to.be.an.array();

                docs.forEach((result) => {

                    Code.expect(result).to.be.an.instanceOf(SubModel);
                });

                done();
            });
        });
    });


    lab.test('it returns a single result', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            SubModel.findOne({}, (err, result) => {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it returns a single result via id', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const id = results.setup[0]._id;

            SubModel.findById(id, (err, result) => {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it returns and error when id casting fails during findById', (done) => {

        SubModel.findById('NOTVALIDOBJECTID', (err, result) => {

            Code.expect(err).to.exist();
            done();
        });
    });


    lab.test('it updates a single document via findByIdAndUpdate', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const id = results.setup[0]._id;
            const update = { name: 'New Name' };

            SubModel.findByIdAndUpdate(id, update, (err, result) => {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it returns an error when casting fails during findByIdAndUpdate', (done) => {

        SubModel.findByIdAndUpdate('NOTVALIDOBJECTID', {}, (err, result) => {

            Code.expect(err).to.exist();
            done();
        });
    });


    lab.test('it updates a single document via id (with options)', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const id = results.setup[0]._id;
            const update = { name: 'New Name' };
            const options = { returnOriginal: false };

            SubModel.findByIdAndUpdate(id, update, options, (err, result) => {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it updates a single document via findOneAndUpdate', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = { name: 'Ren' };
            const update = { name: 'New Name' };

            SubModel.findOneAndUpdate(filter, update, (err, result) => {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it updates a single document via findOneAndUpdate (with options)', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = { name: 'Ren' };
            const update = { name: 'New Name' };
            const options = { returnOriginal: true };

            SubModel.findOneAndUpdate(filter, update, options, (err, result) => {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it replaces a single document via findOneAndReplace', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = { name: 'Ren' };
            const doc = { isCool: true };

            SubModel.findOneAndReplace(filter, doc, (err, result) => {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it replaces a single document via findOneAndReplace (with options)', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = { name: 'Ren' };
            const doc = { isCool: true };
            const options = { returnOriginal: true };

            SubModel.findOneAndReplace(filter, doc, options, (err, result) => {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it replaces one document and returns the result', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = { name: 'Ren' };
            const doc = { isCool: true };

            SubModel.replaceOne(filter, doc, (err, count) => {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(1);

                done(err);
            });
        });
    });


    lab.test('it replaces one document and returns the result (with options)', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = { name: 'Ren' };
            const doc = { isCool: true };
            const options = { upsert: true };

            SubModel.replaceOne(filter, doc, options, (err, count) => {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(1);

                done(err);
            });
        });
    });


    lab.test('it returns an error when replaceOne fails', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const realCollection = BaseModel.db.collection;
            BaseModel.db.collection = function () {

                return {
                    replaceOne: function (filter, doc, options, callback) {

                        callback(new Error('Whoops!'));
                    }
                };
            };

            const filter = { name: 'Ren' };
            const doc = { isCool: true };

            SubModel.replaceOne(filter, doc, (err, count) => {

                Code.expect(err).to.exist();
                Code.expect(count).to.not.exist();

                BaseModel.db.collection = realCollection;
                done();
            });
        });
    });


    lab.test('it deletes a document via findOneAndDelete', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const filter = { name: 'Ren' };

            SubModel.findOneAndDelete(filter, (err, result) => {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it deletes a document via findByIdAndDelete', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const id = results.setup[0]._id;

            SubModel.findByIdAndDelete(id, (err, result) => {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it deletes a single document via findByIdAndDelete (with options)', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const id = results.setup[0]._id;
            const options = {
                projection: {
                    name: 1
                }
            };

            SubModel.findByIdAndDelete(id, options, (err, result) => {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it returns an error when id casting fails during findByIdAndDelete', (done) => {

        SubModel.findByIdAndDelete('NOTVALIDOBJECTID', (err, result) => {

            Code.expect(err).to.exist();
            done();
        });
    });


    lab.test('it deletes one document via deleteOne', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            SubModel.deleteOne({}, (err, count) => {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(1);

                done();
            });
        });
    });


    lab.test('it returns an error when deleteOne fails', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const realCollection = BaseModel.db.collection;
            BaseModel.db.collection = function () {

                return {
                    deleteOne: function (filter, callback) {

                        callback(new Error('Whoops!'));
                    }
                };
            };

            SubModel.deleteOne({}, (err, count) => {

                Code.expect(err).to.exist();
                Code.expect(count).to.not.exist();

                BaseModel.db.collection = realCollection;
                done();
            });
        });
    });


    lab.test('it deletes multiple documents and returns the count via deleteMany', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            SubModel.deleteMany({}, (err, count) => {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(2);

                done();
            });
        });
    });


    lab.test('it returns an error when deleteMany fails', (done) => {

        Async.auto({
            setup: function (cb) {

                const testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, (err, results) => {

            if (err) {
                return done(err);
            }

            const realCollection = BaseModel.db.collection;
            BaseModel.db.collection = function () {

                return {
                    deleteMany: function (filter, callback) {

                        callback(new Error('Whoops!'));
                    }
                };
            };

            SubModel.deleteMany({}, (err, count) => {

                Code.expect(err).to.exist();
                Code.expect(count).to.not.exist();

                BaseModel.db.collection = realCollection;
                done();
            });
        });
    });
});
