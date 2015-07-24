var Joi = require('joi');
var Hoek = require('hoek');
var Async = require('async');
var Mongodb = require('mongodb');
var ClassExtend = require('ampersand-class-extend');


var BaseModel = function () {};
BaseModel.extend = ClassExtend;
BaseModel._idClass = Mongodb.ObjectID;
BaseModel.ObjectId = BaseModel.ObjectID = Mongodb.ObjectID;


BaseModel.connect = function (config, callback) {

    Mongodb.MongoClient.connect(config.url, config.options, function (err, db) {

        if (err) {
            return callback(err);
        }

        BaseModel.db = db;
        callback(null, db);
    });
};


BaseModel.disconnect = function () {

    BaseModel.db.close();
};


BaseModel.ensureIndexes = function (callback) {

    if (!this.indexes) {
        return callback && callback();
    }

    var self = this;

    var tasks = this.indexes.map(function (index) {

        return function (done) {

            self.ensureIndex(index[0], index[1], done);
        };
    });

    Async.parallel(tasks, callback);
};


BaseModel.ensureIndex = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    collection.ensureIndex.apply(collection, args);
};


BaseModel.validate = function (input, callback) {

    return Joi.validate(input, this.schema, callback);
};


BaseModel.prototype.validate = function (callback) {

    return Joi.validate(this, this.constructor.schema, callback);
};


BaseModel.resultFactory = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var next = args.shift();
    var err = args.shift();
    var result = args.shift();

    if (err) {
        args.unshift(result);
        args.unshift(err);
        return next.apply(undefined, args);
    }

    var self = this;

    if (Object.prototype.toString.call(result) === '[object Array]') {
        result.forEach(function (item, index) {

            result[index] = new self(item);
        });
    }

    if (Object.prototype.toString.call(result) === '[object Object]') {
        if (result.hasOwnProperty('value') && !result.hasOwnProperty('_id')) {
            if (result.value) {
                result = new this(result.value);
            }
            else {
                result = undefined;
            }
        }
        else if (result.hasOwnProperty('ops')) {
            result.ops.forEach(function (item, index) {

                result.ops[index] = new self(item);
            });

            result = result.ops;
        }
        else if (result.hasOwnProperty('_id')) {
            result = new this(result);
        }
    }

    args.unshift(result);
    args.unshift(err);
    next.apply(undefined, args);
};


BaseModel.pagedFind = function (filter, fields, sort, limit, page, callback) {

    var self = this;
    var output = {
        data: undefined,
        pages: {
            current: page,
            prev: 0,
            hasPrev: false,
            next: 0,
            hasNext: false,
            total: 0
        },
        items: {
            limit: limit,
            begin: ((page * limit) - limit) + 1,
            end: page * limit,
            total: 0
        }
    };

    fields = this.fieldsAdapter(fields);
    sort = this.sortAdapter(sort);

    Async.auto({
        count: function (done) {

            self.count(filter, done);
        },
        find: function (done) {

            var options = {
                limit: limit,
                skip: (page - 1) * limit,
                sort: sort
            };

            self.find(filter, fields, options, done);
        }
    }, function (err, results) {

        if (err) {
            return callback(err);
        }

        output.data = results.find;
        output.items.total = results.count;

        // paging calculations
        output.pages.total = Math.ceil(output.items.total / limit);
        output.pages.next = output.pages.current + 1;
        output.pages.hasNext = output.pages.next <= output.pages.total;
        output.pages.prev = output.pages.current - 1;
        output.pages.hasPrev = output.pages.prev !== 0;
        if (output.items.begin > output.items.total) {
            output.items.begin = output.items.total;
        }
        if (output.items.end > output.items.total) {
            output.items.end = output.items.total;
        }

        callback(null, output);
    });
};


BaseModel.fieldsAdapter = function (fields) {

    if (Object.prototype.toString.call(fields) === '[object String]') {
        var document = {};

        fields = fields.split(/\s+/);
        fields.forEach(function (field) {

            if (field) {
                document[field] = true;
            }
        });

        fields = document;
    }

    return fields;
};


BaseModel.sortAdapter = function (sorts) {

    if (Object.prototype.toString.call(sorts) === '[object String]') {
        var document = {};

        sorts = sorts.split(/\s+/);
        sorts.forEach(function (sort) {

            if (sort) {
                var order = sort[0] === '-' ? -1 : 1;
                if (order === -1) {
                    sort = sort.slice(1);
                }
                document[sort] = order;
            }
        });

        sorts = document;
    }

    return sorts;
};


BaseModel.count = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    collection.count.apply(collection, args);
};


BaseModel.distinct = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    collection.distinct.apply(collection, args);
};


BaseModel.find = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var callback = this.resultFactory.bind(this, args.pop());

    collection.find.apply(collection, args).toArray(callback);
};


BaseModel.findOne = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var callback = this.resultFactory.bind(this, args.pop());

    args.push(callback);
    collection.findOne.apply(collection, args);
};


BaseModel.findOneAndUpdate = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var callback = this.resultFactory.bind(this, args.pop());
    var filter = args.shift();
    var doc = args.shift();
    var options = Hoek.applyToDefaults({ returnOriginal: false }, args.pop() || {});

    args.push(filter);
    args.push(doc);
    args.push(options);
    args.push(callback);

    collection.findOneAndUpdate.apply(collection, args);
};


BaseModel.findOneAndDelete = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var callback = this.resultFactory.bind(this, args.pop());

    args.push(callback);
    collection.findOneAndDelete.apply(collection, args);
};


BaseModel.findOneAndReplace = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var callback = this.resultFactory.bind(this, args.pop());
    var filter = args.shift();
    var doc = args.shift();
    var options = Hoek.applyToDefaults({ returnOriginal: false }, args.pop() || {});

    args.push(filter);
    args.push(doc);
    args.push(options);
    args.push(callback);

    collection.findOneAndReplace.apply(collection, args);
};


BaseModel.findById = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var id = args.shift();
    var callback = this.resultFactory.bind(this, args.pop());
    var filter;

    try {
        filter = { _id: this._idClass(id) };
    }
    catch (exception) {
        return callback(exception);
    }

    args.unshift(filter);
    args.push(callback);
    collection.findOne.apply(collection, args);
};


BaseModel.findByIdAndUpdate = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var id = args.shift();
    var update = args.shift();
    var callback = this.resultFactory.bind(this, args.pop());
    var options = Hoek.applyToDefaults({ returnOriginal: false }, args.pop() || {});
    var filter;

    try {
        filter = { _id: this._idClass(id) };
    }
    catch (exception) {
        return callback(exception);
    }

    collection.findOneAndUpdate(filter, update, options, callback);
};


BaseModel.findByIdAndDelete = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var id = args.shift();
    var callback = this.resultFactory.bind(this, args.pop());
    var options = Hoek.applyToDefaults({}, args.pop() || {});
    var filter;

    try {
        filter = { _id: this._idClass(id) };
    }
    catch (exception) {
        return callback(exception);
    }

    collection.findOneAndDelete(filter, options, callback);
};


BaseModel.insertOne = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var callback = this.resultFactory.bind(this, args.pop());

    args.push(callback);
    collection.insertOne.apply(collection, args);
};


BaseModel.insertMany = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var callback = this.resultFactory.bind(this, args.pop());

    args.push(callback);
    collection.insertMany.apply(collection, args);
};


BaseModel.updateOne = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var filter = args.shift();
    var update = args.shift();
    var callback = args.pop();
    var options = Hoek.applyToDefaults({}, args.pop() || {});

    args.push(filter);
    args.push(update);
    args.push(options);
    args.push(function (err, results) {

        if (err) {
            return callback(err);
        }

        callback(null, results.modifiedCount);
    });

    collection.updateOne.apply(collection, args);
};


BaseModel.updateMany = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var filter = args.shift();
    var update = args.shift();
    var callback = args.pop();
    var options = Hoek.applyToDefaults({}, args.pop() || {});

    args.push(filter);
    args.push(update);
    args.push(options);
    args.push(function (err, results) {

        if (err) {
            return callback(err);
        }

        callback(null, results.modifiedCount);
    });

    collection.updateMany.apply(collection, args);
};


BaseModel.replaceOne = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var filter = args.shift();
    var doc = args.shift();
    var callback = args.pop();
    var options = Hoek.applyToDefaults({}, args.pop() || {});

    args.push(filter);
    args.push(doc);
    args.push(options);
    args.push(function (err, results) {

        if (err) {
            return callback(err);
        }

        callback(null, results.modifiedCount);
    });

    collection.replaceOne.apply(collection, args);
};


BaseModel.deleteOne = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var callback = args.pop();

    args.push(function (err, results) {

        if (err) {
            return callback(err);
        }

        callback(null, results.deletedCount);
    });

    collection.deleteOne.apply(collection, args);
};


BaseModel.deleteMany = function () {

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    var collection = BaseModel.db.collection(this._collection);
    var callback = args.pop();

    args.push(function (err, results) {

        if (err) {
            return callback(err);
        }

        callback(null, results.deletedCount);
    });

    collection.deleteMany.apply(collection, args);
};


module.exports = BaseModel;
