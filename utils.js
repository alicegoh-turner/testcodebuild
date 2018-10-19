
module.exports.getProtocolByUrl = getProtocolByUrl;
module.exports.getJsonProperty = getJsonProperty;

/**
 * Handles http POST request method
 *
 * @param {Object} options The json object represent http request options
 * @param {Object} data The json data that is to be posted.
 * @param {Callback} callback The call back function that returns result to the caller
 */
module.exports.postRequest = function(options, data,  callback) {
    httpRequest (options, data,  callback);
 };

/**
 * Handles http GET request method
 *
 * @param {Object} options The json object represent http request options
 * @param {Object} data The json data that is to be posted.
 * @param {Callback} callback The call back function that returns result to the caller
 */
module.exports.getRequest = function(options, callback) {
    httpRequest (options, '',  callback);
};

/**
 * Making http request to return the reponse body as text to the callback function. If is a post request
 * post the data to the endpoint.
 *
 * @param {Object} options Http options used for the http request.
 * @param {Object} data The json data to post to the resource
 * @param {Callback} callback Call back function to return the reponse body
 */
function httpRequest (options, data,  callback) {
    let protocol = getProtocolByUrl(options.href);

    let req = protocol.request(options, function(res) {
        let body = '';

        res.on('data', function(chunk) {
            body += chunk.toString();
        });

        res.on('end', function() {
            if (res.statusCode < 200 && res.statusCode >= 299) {
                let error = new Error(`http request failed (${res.statusCode}). Response: ${body}`);
                callback(error);
            } else {
                callback(null, body);
            }
        });

        if (res.statusCode < 200 && res.statusCode >= 299) {
            let error = new Error(`http request failed (${res.statusCode})`);
            callback(error);
        }

    });

    req.on('error', function(err) {
        callback(err);
    });

    if (options.method === 'POST' && data) {
        req.write(JSON.stringify(data));
    }

    req.end();
 }

/**
 * Determine which protocal to include by parsing uri
 *
 * @param {String} url The uri resource
 * @return {Object} Express Http or Https object based on the url
 */
function getProtocolByUrl(url) {
    if (url.toLowerCase().startsWith('https://')) {
        return require('https');
    }

    return require('http');
}

/* Provide a safe way to read object property value, with default value if fails. It only support
 * one demensional array in the property path
 */
function getJsonProperty(obj, path, defaultValue) {

    if (typeof obj === 'undefined' || obj === null) {
        return defaultValue;
    }

    if (path.length === 0) {
        return obj ? obj : defaultValue;
    }

    var pos = path.indexOf('.');
    var prop;
    if (pos > 0 ) {
        prop = path.substr(0,pos);
        path = path.substr(pos + 1);
    } else {
        prop = path;
        path = '';
    }

    // handle array suffix
    // Dose 'prop' contains array suffix?
    var regNdx = /\[[0-9]\]$/g;
    var matched = prop.match(regNdx);
    var attributeValue = {};

    if (matched === null) {
        attributeValue = obj[prop];
    } else {
        var attributeName = prop.replace(regNdx, '');
        var ndx = matched[0].substr(1, matched[0].length-2);

        attributeValue = obj[attributeName];
        if (attributeValue && attributeValue.length >= ndx) {
            attributeValue = attributeValue[ndx];
        } else {
            return defaultValue;
        }
    }

    return getJsonProperty(attributeValue, path, defaultValue);
}
