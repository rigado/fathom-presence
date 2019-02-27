'use strict'

//awsiot
var awsIot = require('aws-iot-device-sdk')
var publisher = require('./publisher.js')

function Publish(endpoints, object) {
    if (endpoints && Array.isArray(endpoints)) {
        endpoints.forEach((ai) => {
            try {
                //create the client if needed
                initializeClient(ai)

                ai.client.publish(ai.topic, JSON.stringify(object), {}, (err) => {
                    if (err) {
                        console.log("awsiotPublish error: %s/%s\n%s", ai.connOptions.host, ai.topic, e)
                        cleanupClient(ai)
                    } else {
                        console.log("awsiotPublish success: %s/%s", ai.connOptions.host, ai.topic)
                        publisher.OnSuccess()
                    }
                }) //publish
            } catch (e) {
                console.log("awsiotPublish error: %s/%s\n%s", ai.connOptions.host, ai.topic, e)
                cleanupClient(ai)
            }
        }) //forEach
    }
}

function initializeClient(endpoint) {
    if(endpoint.client != null) {
        return
    }

    endpoint.client = awsIot.device(endpoint.connOptions)
    console.log("awsiotPublish connect: %s", endpoint.connOptions.host)

    endpoint.client.on('connect', () => {
        console.log("awsiotPublish connected: %s", endpoint.connOptions.host)
    })

    endpoint.client.on('offline', () => {
        console.log("awsiotPublish reconnecting")
        endpoint.client.reconnect()
    })

    endpoint.client.on('error', (error) => {
        console.log("awsiotPublish error: %s", error)
        cleanupClient(endpoint)
    })
}

function cleanupClient(endpoint) {
    if(endpoint.client == null) {
        return
    }

    //attempt cleanup
    try {
        endpoint.client.end()
        endpoint.client = null
    } catch (e) {
        console.log("awsiotPublish cleanup error: %s", e);
    }
}

function Cleanup(endpoints) {
    if (endpoints && Array.isArray(endpoints)) {
        endpoints.forEach((endpoint) => {
            cleanupClient(endpoint)
        })
    }
}


module.exports.Publish = Publish
module.exports.Cleanup = Cleanup
