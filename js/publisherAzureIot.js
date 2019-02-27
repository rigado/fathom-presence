'use strict'

var util = require('util')

var azProtocolMqtt = require('azure-iot-device-mqtt').Mqtt
var azProtocolMqttWs = require('azure-iot-device-mqtt').MqttWs
var azProtocolHttp = require('azure-iot-device-http').Http
var azProtocolAmqpWs = require('azure-iot-device-amqp').AmqpWs
var azProtocolAmqp = require('azure-iot-device-amqp').Amqp
var azDevice = require('azure-iot-device')

var publisher = require('./publisher.js')


function Publish(endpoints, object) {
    if (endpoints && Array.isArray(endpoints)) {
        endpoints.forEach((endpoint) => {
            try {
                //setup the client
                initializeClient(endpoint)

                //create the message
                var message = new azDevice.Message(JSON.stringify(object))

                //send the message
                endpoint.client.sendEvent(message, (err) => {
                    if (err) {
                        //discard client here?
                        console.log("azureiotPublish error: %s", err)
                        cleanupClient(endpoint)
                    } else {
                        console.log("azureiotPublish success")
                        publisher.OnSuccess()
                    }
                }) //sendEvent
            } catch (e) {
                console.log("azureiotPublish error: %s", e)
            }
        }) //forEach
    }
}


function initializeClient(endpoint) {
    if (endpoint.client != null) {
        return
    }

    //attempt to set the requested protocol
    var protocol = null

    if (endpoint.protocol) {
        switch (endpoint.protocol) {
            case "aqmp":
                protocol = azProtocolAmqp
                break

            case "aqmpws":
                protocol = azProtocolAmqpWs
                break

            case "http":
                protocol = azProtocolHttp
                break

            case "mqtt":
                protocol = azProtocolMqtt
                break

            case "mqttws":
                protocol = azProtocolMqttWs
                break

            default:
                throw (util.format("invalid protocol '%s'", endpoint.protocol))
        }
    } else {
        endpoint.protocol = "mqtt"
        protocol = azProtocolMqtt
    }

    //connect
    endpoint.client = azDevice.Client.fromConnectionString(endpoint.connString, protocol)
    console.log("azureiotPublish connect (%s): %s", endpoint.protocol, endpoint.connString)
    endpoint.client.open((err) => {
        if (err) {
            console.log("azureiotPublish error: %s", error)
            cleanupClient(endpoint)
        } else {
            console.log("azureiotPublish connected")

            endpoint.client.on('error', (error) => {
                console.log("azureiotPublish error: %s", error)
                cleanupClient(endpoint)
            })
        }
    }) //Open
}

function cleanupClient(endpoint) {
    if(endpoint.client == null) {
        return
    }

    try {
        endpoint.client.close()
        endpoint.client = null
    } catch (error) {
        console.log("azureiotPublish cleanup error: %s", error)
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
