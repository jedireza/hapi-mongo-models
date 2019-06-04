'use strict';

const Customer = require('../models/customer');

exports.plugin = {
    name: 'customer',
    register:( server, options ) => {

        server.route({
            method: 'GET',
            path: '/customer',
            options: { auth: false },
            handler: async function (request, h) {

                let result = null;
                try {
                    result = await Customer.find( {}, { projection: { _id:0 } } );
                }
                catch ( err ) {
                    return console.log( err );
                }

                return result;
            }
        });
    }
};

