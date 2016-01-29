'use strict';

const Joi = require('joi');
const Hoek = require('hoek');
const Async = require('async');
const Mongodb = require('mongodb');
const ClassExtend = require('ampersand-class-extend');


const BaseModel = function () {};
BaseModel.extend = ClassExtend;
BaseModel._idClass = Mongodb.ObjectID;
BaseModel.ObjectId = BaseModel.ObjectID = Mongodb.ObjectID;


BaseModel.connect = function (config, callback) {

    Mongodb.MongoClient.connect(config.url, config.options, (err, db) => {

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


BaseModel.createIndexes = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    collection.createIndexes.apply(collection, args);
};


BaseModel.validate = function (input, callback) {

    return Joi.validate(input, this.schema, callback);
};


BaseModel.prototype.validate = function (callback) {

    return Joi.validate(this, this.constructor.schema, callback);
};


BaseModel.resultFactory = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const next = args.shift();
    const err = args.shift();
    let result = args.shift();

    if (err) {
        args.unshift(result);
        args.unshift(err);
        return next.apply(undefined, args);
    }

    const self = this;

    if (Object.prototype.toString.call(result) === '[object Array]') {
        result.forEach((item, index) => {

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
            result.ops.forEach((item, index) => {

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

    const self = this;
    const output = {
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

            const options = {
                limit: limit,
                skip: (page - 1) * limit,
                sort: sort
            };

            self.find(filter, fields, options, done);
        }
    }, (err, results) => {

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
        const document = {};

        fields = fields.split(/\s+/);
        fields.forEach((field) => {

            if (field) {
                const include = field[0] === '-' ? false : true;
                if (!include) {
                    field = field.slice(1);
                }
                document[field] = include;
            }
        });

        fields = document;
    }

    return fields;
};


BaseModel.sortAdapter = function (sorts) {

    if (Object.prototype.toString.call(sorts) === '[object String]') {
        const document = {};

        sorts = sorts.split(/\s+/);
        sorts.forEach((sort) => {

            if (sort) {
                const order = sort[0] === '-' ? -1 : 1;
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

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    collection.count.apply(collection, args);
};


BaseModel.distinct = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    collection.distinct.apply(collection, args);
};


BaseModel.find = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const callback = this.resultFactory.bind(this, args.pop());

    collection.find.apply(collection, args).toArray(callback);
};


BaseModel.findOne = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const callback = this.resultFactory.bind(this, args.pop());

    args.push(callback);
    collection.findOne.apply(collection, args);
};


BaseModel.findOneAndUpdate = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const callback = this.resultFactory.bind(this, args.pop());
    const filter = args.shift();
    const doc = args.shift();
    const options = Hoek.applyToDefaults({ returnOriginal: false }, args.pop() || {});

    args.push(filter);
    args.push(doc);
    args.push(options);
    args.push(callback);

    collection.findOneAndUpdate.apply(collection, args);
};


BaseModel.findOneAndDelete = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const callback = this.resultFactory.bind(this, args.pop());

    args.push(callback);
    collection.findOneAndDelete.apply(collection, args);
};


BaseModel.findOneAndReplace = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const callback = this.resultFactory.bind(this, args.pop());
    const filter = args.shift();
    const doc = args.shift();
    const options = Hoek.applyToDefaults({ returnOriginal: false }, args.pop() || {});

    args.push(filter);
    args.push(doc);
    args.push(options);
    args.push(callback);

    collection.findOneAndReplace.apply(collection, args);
};


BaseModel.findById = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const id = args.shift();
    const callback = this.resultFactory.bind(this, args.pop());
    let filter;

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

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const id = args.shift();
    const update = args.shift();
    const callback = this.resultFactory.bind(this, args.pop());
    const options = Hoek.applyToDefaults({ returnOriginal: false }, args.pop() || {});
    let filter;

    try {
        filter = { _id: this._idClass(id) };
    }
    catch (exception) {
        return callback(exception);
    }

    collection.findOneAndUpdate(filter, update, options, callback);
};


BaseModel.findByIdAndDelete = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const id = args.shift();
    const callback = this.resultFactory.bind(this, args.pop());
    const options = Hoek.applyToDefaults({}, args.pop() || {});
    let filter;

    try {
        filter = { _id: this._idClass(id) };
    }
    catch (exception) {
        return callback(exception);
    }

    collection.findOneAndDelete(filter, options, callback);
};


BaseModel.insertOne = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const callback = this.resultFactory.bind(this, args.pop());

    args.push(callback);
    collection.insertOne.apply(collection, args);
};


BaseModel.insertMany = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const callback = this.resultFactory.bind(this, args.pop());

    args.push(callback);
    collection.insertMany.apply(collection, args);
};


BaseModel.updateOne = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const filter = args.shift();
    const update = args.shift();
    const callback = args.pop();
    const options = Hoek.applyToDefaults({}, args.pop() || {});

    args.push(filter);
    args.push(update);
    args.push(options);
    args.push((err, results) => {

        if (err) {
            return callback(err);
        }

        callback(null, results.modifiedCount);
    });

    collection.updateOne.apply(collection, args);
};


BaseModel.updateMany = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const filter = args.shift();
    const update = args.shift();
    const callback = args.pop();
    const options = Hoek.applyToDefaults({}, args.pop() || {});

    args.push(filter);
    args.push(update);
    args.push(options);
    args.push((err, results) => {

        if (err) {
            return callback(err);
        }

        callback(null, results.modifiedCount);
    });

    collection.updateMany.apply(collection, args);
};


BaseModel.replaceOne = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const filter = args.shift();
    const doc = args.shift();
    const callback = args.pop();
    const options = Hoek.applyToDefaults({}, args.pop() || {});

    args.push(filter);
    args.push(doc);
    args.push(options);
    args.push((err, results) => {

        if (err) {
            return callback(err);
        }

        callback(null, results.modifiedCount);
    });

    collection.replaceOne.apply(collection, args);
};


BaseModel.deleteOne = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const callback = args.pop();

    args.push((err, results) => {

        if (err) {
            return callback(err);
        }

        callback(null, results.deletedCount);
    });

    collection.deleteOne.apply(collection, args);
};


BaseModel.deleteMany = function () {

    const args = new Array(arguments.length);
    for (let i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    const collection = BaseModel.db.collection(this._collection);
    const callback = args.pop();

    args.push((err, results) => {

        if (err) {
            return callback(err);
        }

        callback(null, results.deletedCount);
    });

    collection.deleteMany.apply(collection, args);
};


module.exports = BaseModel;
