'use strict'
var mqtt = require('mqtt')
var publisher = require('./publisher.js')
var os = require('os')

function Publish(endpoints, object) {
    if (endpoints && Array.isArray(endpoints)) {
        endpoints.forEach((endpoint) => {
            try {
                //create the client if it doesn't exist
                initializeClient(endpoint)

                var options = endpoint.pubOptions
                if (options == null) {
                    options = {}
                }

                //publish

                //sub eth0 mac
                var adapter = os.networkInterfaces().eth0
                if( endpoint.topic.includes("[MAC]") && Array.isArray(adapter) && adapter[0] && adapter[0].mac) {
                    endpoint.topic = endpoint.topic.replace(/\[MAC\]/g, adapter[0].mac)
                }
                
                endpoint.client.publish(endpoint.topic, JSON.stringify(object), options, (err) => {
                    if (err) {
                        console.log("mqttPublish error %s/%s: %s", endpoint.url, endpoint.topic, err)
                        cleanupClient(endpoint)
                    } else {
                        console.log("mqttPublish success: %s/%s", endpoint.url, endpoint.topic)
                        publisher.OnSuccess()
                    }
                }) //publish
            } catch (e) {
                console.log("mqttPublish error: %s\n%s", endpoint.url, e)
                cleanupClient(endpoint)
            }
        }) //forEach
    }
}

function initializeClient(endpoint) {
    if (endpoint.client != null) {
        return
    }

    console.log("mqttPublish connect: %s", endpoint.url)
    endpoint.client = mqtt.connect(endpoint.url, endpoint.connOptions)

    endpoint.client.on('connect', () => {
        console.log("mqttPublish connected: %s", endpoint.url)
    })

    endpoint.client.on('offline', () => {
        console.log("mqttPublish reconnecting: %s", endpoint.url)
        endpoint.client.reconnect()
    })

    endpoint.client.on('error', (error) => {
        console.log("mqttPublish error: %s", error)
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
        console.log("mqttPublish cleanup error: %s", e);
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