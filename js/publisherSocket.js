'use strict'

var net = require('net')
var publisher = require('./publisher.js')

function Publish(endpoints, object) {
    if (endpoints && Array.isArray(endpoints)) {
        endpoints.forEach((endpoint) => {
            if (endpoint.addr &&
                endpoint.port) {
                try {
                    let client = new net.Socket()

                    client.connect(endpoint.port, endpoint.addr, () => {
                        console.log("socketPublish connect: %s:%s", endpoint.addr, endpoint.port);
                        client.write(JSON.stringify(object), "utf8", (error) => {
                            if (error) {
                                console.log("socketPublish error: %s", error)
                                client.destroy()
                            } else {
                                console.log("socketPublish success: %s:%s", endpoint.addr, endpoint.port);
                                client.end()
                                publisher.OnSuccess()
                            }
                        })
                    })

                    client.on('error', (error) => {
                        console.log("socketPublish error: %s", error)
                        client.destroy()
                    })

                    client.on('end', () => {
                        console.log("socketPublish disconnected: %s:%s", endpoint.addr, endpoint.port);
                    })

                } catch (e) {
                    console.log("socketPublish error: %s", e);
                }
            }
        }) //forEach
    }
}

module.exports.Publish = Publish
