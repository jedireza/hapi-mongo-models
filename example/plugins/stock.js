'use strict';

const Joi = require('@hapi/joi');
const Stock = require('../models/stock');

exports.plugin = {
    name: 'stock',
    register:( server, options ) => {

        server.route({
            method: 'GET',
            path: '/stock',
            options: { auth: false },
            handler: async function( request, h )
            {
                var result = null;
                try{
                     result = await Stock.find( {}, { projection: { _id:0 }});
                }
                catch( err ){ return console.log( err )}

                return result;
            }
        });
    }
};
