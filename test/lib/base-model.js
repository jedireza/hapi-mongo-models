var Async = require('async');
var Joi = require('joi');
var Lab = require('lab');
var Code = require('code');
var ObjectAssign = require('object-assign');
var Proxyquire = require('proxyquire');
var Config = require('../config');


var lab = exports.lab = Lab.script();
var stub = {
    mongodb: {}
};
var BaseModel = Proxyquire('../../lib/base-model', {
    mongodb: stub.mongodb
});


lab.experiment('BaseModel DB Connection', function () {

    lab.test('it connects and disconnects the database', function (done) {

        BaseModel.connect(Config.mongodb, function (err, db) {

            Code.expect(err).to.not.exist();
            Code.expect(db).to.be.an.object();

            Code.expect(BaseModel.db.serverConfig.isConnected()).to.equal(true);
            BaseModel.disconnect();
            Code.expect(BaseModel.db.serverConfig.isConnected()).to.equal(false);

            done();
        });
    });


    lab.test('it returns an error when the db connection fails', function (done) {

        var realMongoClient = stub.mongodb.MongoClient;

        stub.mongodb.MongoClient = {
            connect: function (url, settings, callback) {

                callback(new Error('mongodb is gone'));
            }
        };

        BaseModel.connect(Config.mongodb, function (err, db) {

            Code.expect(err).to.be.an.object();
            Code.expect(db).to.not.exist();

            stub.mongodb.MongoClient = realMongoClient;

            done();
        });
    });
});


lab.experiment('BaseModel Validation', function () {

    lab.test('it returns the Joi validation results of a SubClass', function (done) {

        var SubModel = BaseModel.extend({
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


    lab.test('it returns the Joi validation results of a SubClass instance', function (done) {

        var SubModel = BaseModel.extend({
            constructor: function (attrs) {

                ObjectAssign(this, attrs);
            }
        });

        SubModel.schema = Joi.object().keys({
            name: Joi.string().required()
        });

        var myModel = new SubModel({ name: 'Stimpy' });

        Code.expect(myModel.validate()).to.be.an.object();

        done();
    });
});


lab.experiment('BaseModel Result Factory', function () {

    var SubModel;


    lab.before(function (done) {

        SubModel = BaseModel.extend({
            constructor: function (attrs) {

                ObjectAssign(this, attrs);
            }
        });

        done();
    });


    lab.test('it returns early when an error is present', function (done) {

        var callback = function (err, result) {

            Code.expect(err).to.be.an.object();
            Code.expect(result).to.not.exist();

            done();
        };

        SubModel.resultFactory(callback, new Error('it went boom'), undefined);
    });


    lab.test('it returns an instance for a single document result', function (done) {

        var callback = function (err, result) {

            Code.expect(err).to.not.exist();
            Code.expect(result).to.be.an.instanceOf(SubModel);

            done();
        };
        var document = {
            _id: '54321',
            name: 'Stimpy'
        };

        SubModel.resultFactory(callback, undefined, document);
    });


    lab.test('it returns an array of instances for a `writeOpResult` object', function (done) {

        var callback = function (err, docs) {

            Code.expect(err).to.not.exist();
            Code.expect(docs).to.be.an.array();

            docs.forEach(function (result) {

                Code.expect(result).to.be.an.instanceOf(SubModel);
            });

            done();
        };
        var docs = {
            ops: [
                { name: 'Ren' },
                { name: 'Stimpy' }
            ]
        };

        SubModel.resultFactory(callback, undefined, docs);
    });


    lab.test('it returns a instance for a `findOpResult` object', function (done) {

        var callback = function (err, result) {

            Code.expect(err).to.not.exist();
            Code.expect(result).to.be.an.object();
            Code.expect(result).to.be.an.instanceOf(SubModel);

            done();
        };
        var result = {
            value: { _id: 'ren', name: 'Ren' }
        };

        SubModel.resultFactory(callback, undefined, result);
    });


    lab.test('it returns undefined for a `findOpResult` object that missed', function (done) {

        var callback = function (err, result) {

            Code.expect(err).to.not.exist();
            Code.expect(result).to.not.exist();

            done();
        };
        var result = {
            value: null
        };

        SubModel.resultFactory(callback, undefined, result);
    });


    lab.test('it does not convert an object into an instance without an _id property', function (done) {

        var callback = function (err, result) {

            Code.expect(err).to.not.exist();
            Code.expect(result).to.be.an.object();
            Code.expect(result).to.not.be.an.instanceOf(SubModel);

            done();
        };
        var document = { name: 'Ren' };

        SubModel.resultFactory(callback, undefined, document);
    });
});


lab.experiment('BaseModel Indexes', function () {

    var SubModel;


    lab.before(function (done) {

        SubModel = BaseModel.extend({
            constructor: function (attrs) {

                ObjectAssign(this, attrs);
            }
        });

        SubModel._collection = 'submodels';

        BaseModel.connect(Config.mongodb, function (err, db) {

            done(err);
        });
    });


    lab.after(function (done) {

        BaseModel.disconnect();
        done();
    });


    lab.test('it successfully creates an index', function (done) {

        SubModel.ensureIndex({ username: 1 }, {}, function (err, indexName) {

            Code.expect(err).to.not.exist();
            Code.expect(indexName).to.be.a.string();

            done();
        });
    });


    lab.test('it exists early when there are no indexes', function (done) {

        SubModel.ensureIndexes();

        SubModel.ensureIndexes(function (err, docs) {

            Code.expect(err).to.not.exist();
            Code.expect(docs).to.not.exist();

            done();
        });
    });


    lab.test('it successfully ensures indexes', function (done) {

        SubModel.indexes = [
            [{ foo: 1 }],
            [{ bar: -1 }]
        ];

        SubModel.ensureIndexes(function (err, docs) {

            Code.expect(err).to.not.exist();
            Code.expect(docs).to.be.an.array();

            done();
        });
    });


    lab.test('it successfully ensures indexes without a callback', function (done) {

        SubModel.indexes = [
            [{ foo: 1 }],
            [{ bar: -1 }]
        ];

        Code.expect(SubModel.ensureIndexes()).to.equal(undefined);
        done();
    });
});


lab.experiment('BaseModel Helpers', function () {

    lab.test('it returns expected results for the fields adapter', function (done) {

        var fieldsDoc = BaseModel.fieldsAdapter('one two three');
        Code.expect(fieldsDoc).to.be.an.object();
        Code.expect(fieldsDoc.one).to.equal(true);
        Code.expect(fieldsDoc.two).to.equal(true);
        Code.expect(fieldsDoc.three).to.equal(true);

        var fieldsDoc2 = BaseModel.fieldsAdapter('');
        Code.expect(Object.keys(fieldsDoc2)).to.have.length(0);

        done();
    });


    lab.test('it returns expected results for the sort adapter', function (done) {

        var sortDoc = BaseModel.sortAdapter('one -two three');
        Code.expect(sortDoc).to.be.an.object();
        Code.expect(sortDoc.one).to.equal(1);
        Code.expect(sortDoc.two).to.equal(-1);
        Code.expect(sortDoc.three).to.equal(1);

        var sortDoc2 = BaseModel.sortAdapter('');
        Code.expect(Object.keys(sortDoc2)).to.have.length(0);

        done();
    });
});


lab.experiment('BaseModel Paged Find', function () {

    var SubModel;


    lab.beforeEach(function (done) {

        SubModel = BaseModel.extend({
            constructor: function (attrs) {

                ObjectAssign(this, attrs);
            }
        });

        SubModel._collection = 'submodels';

        BaseModel.connect(Config.mongodb, function (err, db) {

            done(err);
        });
    });


    lab.after(function (done) {

        BaseModel.disconnect();
        done();
    });


    lab.afterEach(function (done) {

        SubModel.deleteMany({}, function (err, result) {

            done();
        });
    });


    lab.test('it returns early when an error occurs', function (done) {

        var realCount = SubModel.count;
        SubModel.count = function (filter, callback) {

            callback(new Error('count failed'));
        };

        var filter = {};
        var fields;
        var limit = 10;
        var page = 1;
        var sort = { _id: -1 };

        SubModel.pagedFind(filter, fields, sort, limit, page, function (err, docs) {

            Code.expect(err).to.be.an.object();
            Code.expect(docs).to.not.exist();

            SubModel.count = realCount;

            done();
        });
    });


    lab.test('it returns paged results', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, function (err, results) {

            var filter = {};
            var fields;
            var limit = 10;
            var page = 1;
            var sort = { _id: -1 };

            SubModel.pagedFind(filter, fields, sort, limit, page, function (err, docs) {

                Code.expect(err).to.not.exist();
                Code.expect(docs).to.be.an.object();

                done();
            });
        });
    });


    lab.test('it returns paged results where end item is less than total', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, function (err, results) {

            var filter = {};
            var fields;
            var limit = 2;
            var page = 1;
            var sort = { _id: -1 };

            SubModel.pagedFind(filter, fields, sort, limit, page, function (err, docs) {

                Code.expect(err).to.not.exist();
                Code.expect(docs).to.be.an.object();

                done();
            });
        });
    });


    lab.test('it returns paged results where begin item is less than total', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, function (err, results) {

            var filter = { 'role.special': { $exists: true } };
            var fields;
            var limit = 2;
            var page = 1;
            var sort = { _id: -1 };

            SubModel.pagedFind(filter, fields, sort, limit, page, function (err, docs) {

                Code.expect(err).to.not.exist();
                Code.expect(docs).to.be.an.object();

                done();
            });
        });
    });
});


lab.experiment('BaseModel Proxied Methods', function () {

    var SubModel;


    lab.before(function (done) {

        SubModel = BaseModel.extend({
            constructor: function (attrs) {

                ObjectAssign(this, attrs);
            }
        });

        SubModel._collection = 'submodels';

        BaseModel.connect(Config.mongodb, function (err, db) {

            done(err);
        });
    });


    lab.after(function (done) {

        BaseModel.disconnect();
        done();
    });


    lab.afterEach(function (done) {

        SubModel.deleteMany({}, function (err, result) {

            done();
        });
    });


    lab.test('it inserts data and returns the results', function (done) {

        var testDocs = [
            { name: 'Ren' },
            { name: 'Stimpy' },
            { name: 'Yak' }
        ];

        SubModel.insertMany(testDocs, function (err, docs) {

            Code.expect(err).to.not.exist();
            Code.expect(docs).to.be.an.array();
            Code.expect(docs.length).to.equal(3);

            done(err);
        });
    });


    lab.test('it inserts one document and returns the result', function (done) {

        var testDoc = { name: 'Horse' };

        SubModel.insertOne(testDoc, function (err, docs) {

            Code.expect(err).to.not.exist();
            Code.expect(docs).to.be.an.array();

            done(err);
        });
    });


    lab.test('it inserts many documents and returns the results', function (done) {

        var testDocs = [
            { name: 'Toast' },
            { name: 'Space' }
        ];

        SubModel.insertMany(testDocs, function (err, docs) {

            Code.expect(err).to.not.exist();
            Code.expect(docs).to.be.an.array();
            Code.expect(docs.length).to.equal(2);

            done(err);
        });
    });


    lab.test('it updates a document and returns the results', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, function (err, results) {

            var filter = {
                _id: results.setup[0]._id
            };
            var update = {
                $set: { isCool: true }
            };

            SubModel.updateOne(filter, update, function (err, count) {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(1);

                done(err);
            });
        });
    });


    lab.test('it updates a document and returns the results (with options)', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, function (err, results) {

            var filter = {
                _id: results.setup[0]._id
            };
            var update = {
                $set: { isCool: true }
            };
            var options = { upsert: true };

            SubModel.updateOne(filter, update, options, function (err, count) {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(1);

                done(err);
            });
        });
    });


    lab.test('it returns an error when updateOne fails', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var realCollection = BaseModel.db.collection;
            BaseModel.db.collection = function () {

                return {
                    updateOne: function (filter, update, options, callback) {

                        callback(new Error('Whoops!'));
                    }
                };
            };

            var filter = {};
            var update = { $set: { isCool: true } };

            SubModel.updateOne(filter, update, function (err, count) {

                Code.expect(err).to.exist();
                Code.expect(count).to.not.exist();

                BaseModel.db.collection = realCollection;
                done();
            });
        });
    });


    lab.test('it updates many documents and returns the results', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, function (err, results) {

            var filter = {};
            var update = { $set: { isCool: true } };

            SubModel.updateMany(filter, update, function (err, count) {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(3);

                done(err);
            });
        });
    });


    lab.test('it updates many documents and returns the results (with options)', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, function (err, results) {

            var filter = {};
            var update = { $set: { isCool: true } };
            var options = { upsert: true };

            SubModel.updateMany(filter, update, options, function (err, count) {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(3);

                done(err);
            });
        });
    });


    lab.test('it returns an error when updateMany fails', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var realCollection = BaseModel.db.collection;
            BaseModel.db.collection = function () {

                return {
                    updateMany: function (filter, update, options, callback) {

                        callback(new Error('Whoops!'));
                    }
                };
            };

            var filter = {};
            var update = { $set: { isCool: true } };

            SubModel.updateMany(filter, update, function (err, count) {

                Code.expect(err).to.exist();
                Code.expect(count).to.not.exist();

                BaseModel.db.collection = realCollection;
                done();
            });
        });
    });


    lab.test('it returns a collection count', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, function (err, results) {

            SubModel.count({}, function (err, result) {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.a.number();
                Code.expect(result).to.equal(3);

                done();
            });
        });
    });


    lab.test('it returns distinct results from a collection', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDocs = [
                    { name: 'Ren', group: 'Friend' },
                    { name: 'Stimpy', group: 'Friend' },
                    { name: 'Yak', group: 'Foe' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, function (err, results) {

            SubModel.distinct('group', function (err, values) {

                Code.expect(err).to.not.exist();
                Code.expect(values).to.be.an.array();
                Code.expect(values.length).to.equal(2);

                done();
            });
        });
    });


    lab.test('it returns a result array', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' },
                    { name: 'Yak' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, function (err, results) {

            SubModel.find({}, function (err, docs) {

                Code.expect(err).to.not.exist();
                Code.expect(docs).to.be.an.array();

                docs.forEach(function (result) {

                    Code.expect(result).to.be.an.instanceOf(SubModel);
                });

                done();
            });
        });
    });


    lab.test('it returns a single result', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            SubModel.findOne({}, function (err, result) {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it returns a single result via id', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var id = results.setup[0]._id;

            SubModel.findById(id, function (err, result) {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it returns and error when id casting fails during findById', function (done) {

        SubModel.findById('NOTVALIDOBJECTID', function (err, result) {

            Code.expect(err).to.exist();
            done();
        });
    });


    lab.test('it updates a single document via findByIdAndUpdate', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var id = results.setup[0]._id;
            var update = { name: 'New Name' };

            SubModel.findByIdAndUpdate(id, update, function (err, result) {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it returns an error when casting fails during findByIdAndUpdate', function (done) {

        SubModel.findByIdAndUpdate('NOTVALIDOBJECTID', {}, function (err, result) {

            Code.expect(err).to.exist();
            done();
        });
    });


    lab.test('it updates a single document via id (with options)', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var id = results.setup[0]._id;
            var update = { name: 'New Name' };
            var options = { returnOriginal: false };

            SubModel.findByIdAndUpdate(id, update, options, function (err, result) {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it updates a single document via findOneAndUpdate', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var filter = { name: 'Ren' };
            var update = { name: 'New Name' };

            SubModel.findOneAndUpdate(filter, update, function (err, result) {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it updates a single document via findOneAndUpdate (with options)', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var filter = { name: 'Ren' };
            var update = { name: 'New Name' };
            var options = { returnOriginal: true };

            SubModel.findOneAndUpdate(filter, update, options, function (err, result) {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it replaces a single document via findOneAndReplace', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var filter = { name: 'Ren' };
            var doc = { isCool: true };

            SubModel.findOneAndReplace(filter, doc, function (err, result) {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it replaces a single document via findOneAndReplace (with options)', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var filter = { name: 'Ren' };
            var doc = { isCool: true };
            var options = { returnOriginal: true };

            SubModel.findOneAndReplace(filter, doc, options, function (err, result) {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it replaces one document and returns the result', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var filter = { name: 'Ren' };
            var doc = { isCool: true };

            SubModel.replaceOne(filter, doc, function (err, count) {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(1);

                done(err);
            });
        });
    });


    lab.test('it replaces one document and returns the result (with options)', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var filter = { name: 'Ren' };
            var doc = { isCool: true };
            var options = { upsert: true };

            SubModel.replaceOne(filter, doc, options, function (err, count) {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(1);

                done(err);
            });
        });
    });


    lab.test('it returns an error when replaceOne fails', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var realCollection = BaseModel.db.collection;
            BaseModel.db.collection = function () {

                return {
                    replaceOne: function (filter, doc, options, callback) {

                        callback(new Error('Whoops!'));
                    }
                };
            };

            var filter = { name: 'Ren' };
            var doc = { isCool: true };

            SubModel.replaceOne(filter, doc, function (err, count) {

                Code.expect(err).to.exist();
                Code.expect(count).to.not.exist();

                BaseModel.db.collection = realCollection;
                done();
            });
        });
    });


    lab.test('it deletes a document via findOneAndDelete', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var filter = { name: 'Ren' };

            SubModel.findOneAndDelete(filter, function (err, result) {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it deletes a document via findByIdAndDelete', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var id = results.setup[0]._id;

            SubModel.findByIdAndDelete(id, function (err, result) {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it deletes a single document via findByIdAndDelete (with options)', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            var id = results.setup[0]._id;
            var options = {
                projection: {
                    name: 1
                }
            };

            SubModel.findByIdAndDelete(id, options, function (err, result) {

                Code.expect(err).to.not.exist();
                Code.expect(result).to.be.an.object();
                Code.expect(result).to.be.an.instanceOf(SubModel);

                done();
            });
        });
    });


    lab.test('it returns an error when id casting fails during findByIdAndDelete', function (done) {

        SubModel.findByIdAndDelete('NOTVALIDOBJECTID', function (err, result) {

            Code.expect(err).to.exist();
            done();
        });
    });


    lab.test('it deletes one document via deleteOne', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDoc = { name: 'Ren' };

                SubModel.insertOne(testDoc, cb);
            }
        }, function (err, results) {

            SubModel.deleteOne({}, function (err, count) {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(1);

                done();
            });
        });
    });


    lab.test('it returns an error when deleteOne fails', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, function (err, results) {

            var realCollection = BaseModel.db.collection;
            BaseModel.db.collection = function () {

                return {
                    deleteOne: function (filter, callback) {

                        callback(new Error('Whoops!'));
                    }
                };
            };

            SubModel.deleteOne({}, function (err, count) {

                Code.expect(err).to.exist();
                Code.expect(count).to.not.exist();

                BaseModel.db.collection = realCollection;
                done();
            });
        });
    });


    lab.test('it deletes multiple documents and returns the count via deleteMany', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, function (err, results) {

            SubModel.deleteMany({}, function (err, count) {

                Code.expect(err).to.not.exist();
                Code.expect(count).to.be.a.number();
                Code.expect(count).to.equal(2);

                done();
            });
        });
    });


    lab.test('it returns an error when deleteMany fails', function (done) {

        Async.auto({
            setup: function (cb) {

                var testDocs = [
                    { name: 'Ren' },
                    { name: 'Stimpy' }
                ];

                SubModel.insertMany(testDocs, cb);
            }
        }, function (err, results) {

            var realCollection = BaseModel.db.collection;
            BaseModel.db.collection = function () {

                return {
                    deleteMany: function (filter, callback) {

                        callback(new Error('Whoops!'));
                    }
                };
            };

            SubModel.deleteMany({}, function (err, count) {

                Code.expect(err).to.exist();
                Code.expect(count).to.not.exist();

                BaseModel.db.collection = realCollection;
                done();
            });
        });
    });
});
