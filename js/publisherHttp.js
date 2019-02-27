'use strict'

var request = require('request')
var publisher = require('./publisher.js')

function Publish(endpoints, object) {
    if (endpoints && Array.isArray(endpoints)) {
        endpoints.forEach((endpoint) => {
            if (endpoint.url &&
                endpoint.method) {

                var options = {
                    method: endpoint.method,
                    json: true,
                    url: endpoint.url,
                    body: object,
                    rejectUnauthorized: endpoint.rejectUnauthorized,
                }

                //optional headers?
                if(endpoint.headers != null && typeof(endpoint.headers) == 'object') {
                    options.headers = endpoint.headers
                }

                request(options, function (error, request, body) {
                    try {
                        if (error) {
                            throw (error)
                        } else {
                            console.log("httpPublish success: %s, statusCode %d", endpoint.url, request.statusCode);
                            publisher.OnSuccess()
                        }
                    } catch (e) {
                        console.log("httpPublish error: %s, %s", endpoint.url, e);
                    }
                })
            }
        }) //forEach
    }
}

module.exports.Publish = Publish
