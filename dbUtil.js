'use strict';

/**
 * Utility module for dynamodb.
 * @module
 */
const AWS = require('aws-sdk');

AWS.config.update({
  region: "us-east-1"
});

let docClient = new AWS.DynamoDB.DocumentClient();

/**
 * Save a document for a table by key for a document. Promise implementation
 * @param {String} table Name of the table to get the document
 * @param {Object} key The primary key of the table
 * @param {Object} data The document to be saved.
 * @return {Promise} A promise that resolves to the status of the save action
 */
module.exports.setReportStatus = function(table, key, data) {
    key.info = data;
    let param = {
        TableName: table,
        Item: key
    };

    return new Promise(function(resolve, reject) {
        docClient.put(param, function(err, doc) {
            if (err) {
                console.error(`Failed to save status to DynamoDB ` + err);
                reject(err);
            } else {
                console.log(`${JSON.stringify(doc)}`);
                resolve(doc);
            }
        });
    });
};

