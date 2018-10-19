'use strict'

module.exports.createOptions = createOptions;
module.exports.createReportTypes = createReportTypes;
module.exports.createOauthStr = createOauthStr;

// environment variables
const appFiguresHost = process.env.APPFIGURESHOST;
const appFiguresAPIUrl = process.env.APPFIGURESAPIURL; 
const appFigureAPIVersion = process.env.APPFIGURESAPIVERSION
const userEmail = process.env.USEREMAIL;

/** 
 *  Oauth setup to use AppFigures API
 *  Getting OAUTH token and secret is an one time manual process. 
 *  Instruction: https://docs.appfigures.com/api/reference/v2/oauth
 **/
const clientKey = process.env.CLIENTKEY;
const clientSecret = process.env.CLIENTSECRET;
const oauthToken = process.env.OAUTHTOKEN;
const oauthSecret = process.env.OAUTHSECRET;
const oauthSignatureMethod= process.env.OAUTHSIGNATUREMETHOD;

/**
 * Construct auth string.
 * Return auth string
 **/
function createOauthStr() {
    let authstr = `OAuth oauth_signature_method=${oauthSignatureMethod}` + 
        `,oauth_consumer_key=${clientKey}` + 
        `,oauth_token=${oauthToken}` +
        `,oauth_signature=${clientSecret}&${oauthSecret}`;

    if (authstr) {
		return authstr;
	} else {
		console.error('OAuth string is empty.');
    }  
}

/**
 * Create array of reports to export.
 * Return reports, the array of report objects
 **/
function createReportTypes (reportDate) {
    let authStr = createOauthStr();   

    var reports = [
        {
            category: 'products',
            uri: '/products/mine',
            date: reportDate,
            authstr: authStr
        },
        {
            category: 'sales',
            uri: '/sales/dates/-1/-1',
            date: reportDate,
            authstr: authStr
        },
        {
            category: 'revenue',
            uri: `/reports/revenue?group_by=product,country,date&start=${reportDate}&end=${reportDate}`,
            date: reportDate,
            authstr: authStr
        },
        {
            category: 'ratings',
            uri: `/reports/ratings?start=${reportDate}&end=${reportDate}`,
            date: reportDate,
            authstr: authStr
        },
        {
            category: 'featured',
            uri: `/featured/summary/${reportDate}/${reportDate}`,
            date: reportDate,
            authstr: authStr
        },
        {
            category: 'reviews',
            uri: '/reviews',
            date: reportDate,
            authstr: authStr
        },
        {
            category: 'events',
            uri: '/events',
            date: reportDate,
            authstr: authStr
        },
        {
            category: `users`,
            uri: `/users/${userEmail}`,
            date: reportDate,
            authstr: authStr
        },
        {
            category: `data`,
            name: `countries`,
            uri: `/data/countries`,
            date: reportDate,
            authstr: authStr
        },
        {
            category: `data`,
            name: `stores`,
            uri: `/data/stores`,
            date: reportDate,
            authstr: authStr
        },
        {
            category: `data`,
            name: `currencies`,
            uri: `/data/currencies`,
            date: reportDate,
            authstr: authStr
        },
        {
            category: `data`,
            name: `languages`,
            uri: `/data/languages`,
            date: reportDate,
            authstr: authStr
        },
        {
            category: `usage`,
            uri: `/usage`,
            date: reportDate,
            authstr: authStr
        },
        {
            category: `ranks`,
            uri: `/ranks/280706609833/daily/${reportDate}/${reportDate}`,
            date: reportDate,
            authstr: authStr
        }
    ]

    if (reports.length > 0) {
        console.log(`List of reports is ready`);
        return reports;
    } else {
        console.error('Failed to create list of reports.');
    }
}

/**
 * Set options to run https request.
 * Return the constructed object
 **/
function createOptions (report) {
    let options = {
        hostname: `${appFiguresHost}`,
        path: `/${appFigureAPIVersion}/${report.uri}`,
        href: `${appFiguresAPIUrl}${report.uri}`,
        method: 'GET',
        headers: {  
            'Content-Type': 'application/json',
            'Authorization': `${report.authstr}`
        }                              
    };

    if (options) {
        return options;
    } else {
        console.error('Failed to set options for HTTPS request.');
    }
};