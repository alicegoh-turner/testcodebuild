'use strict'
// packages
const moment = require('moment');
const utils = require('./utils/utils');
const setdata = require('./utils/setdata');
const aws = require('aws-sdk');
const pkg = require('./package');
const fs = require('fs');

// environment variables
const awsBucket = process.env.BUCKET;
const tableName = process.env.DYNAMODB_TABLE;
const appName = process.env.APPNAME;
const appFiguresAPIUrl = process.env.APPFIGURESAPIURL
const tmpDir = `/tmp/`;  

// Create S3 service object
const s3 = new aws.S3({apiVersion: '2006-03-01'});

/**
 * Save response to report body.
 *
 * @param {Object} report object contains the report data: report name, local file name etc
 * @param {Promise} promise that resolves to report that contains https response body
 */
function generateReport (report) {
    return new Promise(
        function (resolve, reject) { 
            utils.getRequest(report.options, function(err, body) {
                if (err) {
                    console.error(`HTTPS request failed. ` + err);
                    reject(err);
                } else {
                    report.body = body;
                    resolve(report);
                }
            });
        }
    );
};

/**
 * Write report body content to a temporary local file.
 *
 * @param {Object} report object contains the report data: report name, local file name etc
 * @param {Promise} promised that resolves to report
 */
function printReportToFile (report) {
    return new Promise(
        function (resolve, reject) {
            fs.writeFile(report.filename, report.body, (err) => {
                if (err) {
                    console.error(`Failed to write to file, ${report.filename}`);
                    reject(err);
                } else {
                    console.log(`Report saved in ${report.filename}.`);
                    resolve(report);
                }
            });
        }
    );
};

/**
 * publish a list of reports to S3 bucket.
 *
 * @param {Object} report object contains the report data: report name, local file name etc
 * @param {Promise} promised that resolves to report
 */
async function pushReportsToS3(report) {
    let s3folder = appName;
    let fileExt = ".json";

    if (report.filename) {
        try {
            if (report.name) {
                report.S3key = `${s3folder}/${report.category}/${report.date}/${report.category}-${report.name}${fileExt}`;
            } else {
                report.S3key = `${s3folder}/${report.category}/${report.date}/${report.category}${fileExt}`;
            }            
            await uploadFileToS3(awsBucket, report.filename, report.S3key);
            report.status = 'Report uploaded to S3';
            return Promise.resolve(report);
        } catch (ex) {
            console.error('Failed to upload files to S3');
            return Promise.reject(ex);
        }
    } else {
        console.error('There are no files to push to S3');
        return Promise.reject(new Error('Warning: No data available push to S3'));
    }
}

/**
 * upload file to aws server,for security, login credential is setup on the environment variables
 *
 * @param {String} bucket S3 bucket name
 * @param {String} fileName Local file to be pushed to S3 bucket
 * @param {Strig} key File name in the S3 bucket
 * @rturn {Promise} A promise resolves to S3 bucket key
 */
function uploadFileToS3 (bucket, filename, key) {
    var stream = fs.createReadStream(filename);

    console.log(`S3 Key: ${key}, Bucket: ${bucket}`);

    return new Promise(function(resolve, reject) {
        s3.upload({
            Bucket: bucket,
            Key: key,
            Body: stream,
            ContentType: 'application/json'
        }, function(err, data) {
            if (err) {
                console.error(`Catch exception on pushing file to S3. ` + err);
                reject(err);
            } else {
                console.log(`Report file uploaded to S3: ${key}`);
                // delete local file
                fs.unlink(filename, function(err) {
                    if (err) {
                        console.error(`Failed to delete ${filename}`, err);
                    } else {
                        console.log(`Successfully deleted ${filename}`);
                    }     
                });
                resolve(key);
            }
        });
    });
}

/**
 * Save status to a table by key
 * 
 * @param {Object} report report object
 */
function saveToDynamoDB (report) {
    let reportType;
    if (report.name) {
        reportType =  `${appName}_${report.category}_${report.name}`;
    } else {
        reportType =  `${appName}_${report.category}`;
    }
    let key = {
        reportType: `${reportType}`,
        reportDate: `${report.date}`
    };
    let reportInfo = {
        AppFiguresURL: `${appFiguresAPIUrl}${report.uri}`,
        ReportStatus: `${report.status}`,
        S3Path: `${report.S3key}`,
        Timestamp: `${report.currentTime}`
    };  

    let docClient = new aws.DynamoDB.DocumentClient();

    key.info = reportInfo;
    let param = {
        TableName: tableName,
        Item: key,
        ReturnValues: 'ALL_OLD'
    };

    return new Promise(function(resolve, reject) {
        docClient.put(param, function(err, data) {
            if (err) {
                console.error(`Failed to save status to DynamoDB ` + err);
                reject(err);
            } else {
                console.log(`Saved to DynamoDB: ${data.Attributes.reportType} report`);
                resolve(data);
            }
        });
    });
};

/**
 * getReport() process one type of report. Submitting job request, saving and pushing to S3
 * 
 * @param {Object} report report object
 * @return {Promise} Promise that resolves to report.
 */
async function getReport(report) {    
    report.currentTime = moment();
    report.options = setdata.createOptions(report);

    if (report.name) {
        report.filename = `${tmpDir}${report.category}-${report.name}.json`;
    } else {
        report.filename = `${tmpDir}${report.category}.json`;
    }

    return new Promise(function(resolve, reject) { 
        generateReport(report)
        .then(printReportToFile)
        .then(pushReportsToS3)
        .then(saveToDynamoDB)
        .then(resolve)
        .catch(reject);
    });
}

/**
 * Business method that generates requested reports. A list of reports is specified in this method, the
 * data range of the reports is calculated from the current utc timestamp. 
 * The report is for previous 24 hours.
 * 
 * @return {Promises[]} An array of promises that resolve to a list of S3 file names pushed to S3 bucket
 */
function getReportSet() {
    let reportDate = (moment.utc().startOf('day').subtract(1,'day')).format('YYYY-MM-DD');
    let reports = setdata.createReportTypes(reportDate);
    let reportStatus = [];

    console.info(`getReportSet(Report Date: ${reportDate}`);
    reports.forEach(function(report){
        console.info(`Running getReport(${report.category})`);
        reportStatus.push(getReport(report));
    });
    return Promise.all(reportStatus);
}

/**
 * Serverless Lambda function entry point.
 * @param {Object} event The event object that invokes this function
 * @param {Object} context The context this function is in
 * @param {Callback} callback The call back function to return the status of the function execution.
 *
 */
module.exports.exportreport = (event, context, callback) => {
    console.log(`Version ${pkg.version}`);
    
    if (event) {
        console.log('Lambda event:');
        console.log(event);
    }
    if (context) {
        console.log('Lambda context:');
        console.log(context);
    }

    getReportSet()
    .then(function(data) {
        console.log(`Published ${data.length} report files`);
        callback(null, `Published all reports from ${appName} to S3 successfully!`);
    })
    .catch(function(ex) {
        console.error(`Failed to publish reports for ${appName}. ${ex}`);
        ex.message = ` Failed to publish reports for ${appName}. ${ex.message}`;
        callback(ex);
    });

}
