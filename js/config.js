'use strict'

var execSync = require('child_process').execSync
var fs = require('fs')
var url = require('url')
var util = require('util')

var activeConfiguration = null

function ActiveConfig() {
    return activeConfiguration
}

function argsToConfig(argv) {
    try {
        //empty config
        var argConfig = {
            endpoints: {},
            publish: {
                intervalMs: 10000
            },
            enabledTypes: [],
            filters: {},
            debug: []
        }

        //publish timeout
        if (argv.publishInterval != null) {
            if (typeof argv.publishInterval == 'number' &&
                argv.publishInterval > 0) {
                argConfig.publish.intervalMs = argv.publishInterval * 1000
            } else {
                throw ("must specify publishInterval > 0")
            }
        }

        //http endpoint
        if (argv.url) {
            let epUrl = url.parse(argv.url)
            let method = "POST"

            if (epUrl.protocol != "https:" && epUrl.protocol != "http:") {
                throw ("--url must be http:// or https://, got " + epUrl.protocol)
            }

            if (argv.method) {
                if (argv.method != "PUT" && argv.method != "POST") {
                    throw ("--method must be PUT or POST, got " + argv.method)
                } else {
                    method = argv.method
                }
            }

            argConfig.endpoints.http = [{
                url: epUrl.href,
                method: method
            }]
        }

        //socket endpoint
        if (argv.sockport != null && argv.sockaddr != null) {
            //address could be anything, no way to validate

            //port must be a number
            if (isNaN(argv.sockport)) {
                throw ("--sockport must be a number")
            }

            argConfig.endpoints.socket = [{
                addr: argv.sockaddr,
                port: argv.sockport
            }]
        } else if (argv.sockport || argv.sock) {
            throw ("must define both --sockaddr and --sockport")
        }

        //mqtt endpoint
        if (argv.mqurl && argv.mqtopic) {
            argConfig.endpoints.mqtt = [{
                url: argv.mqurl,
                topic: argv.mqtopic
            }]
        } else if (argv.mqurl || argv.mqtopic) {
            throw ("must define both --mqurl and --mqtopic")
        }

        //debug data
        if (argv.dumpadv === true) {
            argConfig.debug.push("advertisements")
        }

        if (argv.dumppublish === true) {
            argConfig.debug.push("publish")
        }

        if (argv.dumpgps === true) {
            argConfig.debug.push("gps")
        }

        if (argv.gps === true) {
            argConfig.publish.gps = gpsDefault
        }

        //publish behavior
        //publish at every interval
        if (argv.publishalways === true) {
            argConfig.publish.always = true
        }

        //publish only strongest report?
        if (argv.publishsingle === true) {
            argConfig.publish.single = true
        }

        //publish devices that departed?
        if (argv.publishdeparted === true) {
            argConfig.publish.departed = true
        }

        //tag types
        if (argv.all === true || argv.kontakt === true) {
            argConfig.enabledTypes.push("kontakt")
        }

        if (argv.all === true || argv.globalstar === true) {
            argConfig.enabledTypes.push("globalstar")
        }

        if (argv.all === true || argv.ruuvi === true) {
            argConfig.enabledTypes.push("ruuvi")
        }

        if (argv.all === true || argv.ibeacon === true) {
            argConfig.enabledTypes.push("ibeacon")
        }

        if (argv.all === true || argv.eddystone === true) {
            argConfig.enabledTypes.push("eddystone")
        }

        //special case for ibeacon (filter on uuid regex), if argv.all we will not apply a uuid filter!
        if (!argv.all && argv.ibeacon !== true && argv.ibeacon != null) {
            //parse the regex
            argConfig.filters.ibeacon = argv.ibeacon
            argConfig.enabledTypes.push("ibeacon")
        }

        if (argv.all === true || argv.basicble === true) {
            argConfig.enabledTypes.push("ble")
        }

        //mac filter?
        if (argv.mac === true) {
            throw ("must define regular expression!")
        } else if (argv.mac) {
            argConfig.filters.mac = argv.mac
        }

        //scanner
        if (argv.noble) {
            argConfig.scanner = "noble"
        }

        if (argv.edgeconnect) {
            argConfig.scanner = "edge-connect"
        }

        //unsafetls
        if (argv.unsafetls) {
            console.log("**** WARNING: Server certificate verification disabled! ****\n")
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
        }

        return argConfig
    } catch (err) {
        console.log("ArgsToConfig error: %s", err)
        return null
    }
}


function validateConfig(config) {
    try {
        if (config == null || typeof config != "object") {
            throw ("must define 'config' object")
        }

        //must enable a tag type
        if (!(Array.isArray(config.enabledTypes) &&
            (config.enabledTypes.includes("ble") ||
                config.enabledTypes.includes("ibeacon") ||
                config.enabledTypes.includes("ble") ||
                config.enabledTypes.includes("globalstar") ||
                config.enabledTypes.includes("ruuvi") ||
                config.enabledTypes.includes("eddystone")))) {
            throw ("invalid value for 'enabledTypes'")
        }

        //must define endpoints
        if (config.endpoints == null || typeof config.endpoints != "object") {
            throw ("must define 'endpoints' object")
        }

        //must define at least one valid endpoint
        var epTypesFound = 0
        var actualEpTypes = Object.keys(config.endpoints)
        var epTypes = ["http", "socket", "mqtt", "awsiot", "azureiot"]

        epTypes.forEach((type) => {
            if (actualEpTypes.includes(type)) {
                epTypesFound++
            }
        })

        if (epTypesFound == 0) {
            throw ("no valid endpoints found")
        }

        //must have a publish interval
        if (!(config.publish &&
            config.publish.intervalMs &&
            config.publish.intervalMs >= 1000)) {
            throw ("must define 'publish.intervalMs' >= 1000")
        }

        //empty publish count
        if (config.publish &&
            config.publish.emptyExitCount != null &&
            (isNaN(config.publish.emptyExitCount) || config.publish.emptyExitCount < 1)) {
            throw ("must define 'publish.emptyKillThreshold' >= 1")
        }

        //passed all basic checks, now try and process special fields
        var processed = processConfig(config, false)
        return processed
    } catch (e) {
        console.log("ValidateConfig failed: %s", e)
        return false
    }
}


function PrintConfig(config) {
    if (config) {
        var tmp = JSON.parse(JSON.stringify(config))
        processConfig(tmp, true)

        console.log("Configuration:\n%s\n", JSON.stringify(tmp, null, 2))
    }
}

function PrintActiveConfig() {
    PrintConfig(activeConfiguration)
}

function Configure(argv) {
    findValidConfig(argv)
    return (activeConfiguration != null)
}

function findValidConfig(argv) {
    // running in a snap?
    if (process.env.SNAP_NAME != null) {
        try {
            activeConfiguration = JSON.parse(execSync("snapctl get config"))

            if (validateConfig(activeConfiguration)) {
                console.log("Configure: loaded config from 'snap get'")
                activeConfiguration._source = "snap-get"
            } else {
                throw ("invalid configuration")
            }
        } catch (e) {
            console.log("Configure snap-get error: " + e)
            activeConfiguration = null
        }
        return activeConfiguration
    } else {
        //try from config file if specified
        try {
            if (argv && argv.config && (typeof argv.config) == "string") {
                activeConfiguration = JSON.parse(fs.readFileSync(argv.config))

                if (validateConfig(activeConfiguration)) {
                    console.log("Configure: loaded config from file '%s'", argv.config)
                    activeConfiguration._source = "file"
                    return activeConfiguration
                }
            }
        } catch (e) {
            console.log("Configure file error: " + e)
        }

        //finally try the command line args
        activeConfiguration = argsToConfig(argv)

        if (validateConfig(activeConfiguration)) {
            console.log("Configure: loaded config from command line")
            activeConfiguration._source = "cmdline"
            return activeConfiguration
        }

        //nothing worked!
        console.log("Configure command line error: invalid configuration")
        activeConfiguration = null
        return activeConfiguration
    }
}


function processB64(object, toB64) {
    //keys to handle as b64
    const b64Keys = ["cert", "ca", "key", "caCert", "privateKey", "clientCert"]

    function isB64(value) {
        if (value != null) {
            var decoded = Buffer.from(value, 'base64')
            return (value == decoded.toString('base64'))
        }
        return false
    }

    //to b64
    function encode(object) {
        if (!object || typeof object != "object") {
            //nothing to decode
            return
        }

        b64Keys.forEach((key) => {
            if (object[key] != null) {
                object[key] = Buffer.from(object[key]).toString('base64')
            }
        })
    }

    //from b64
    function decode(object) {
        if (!object || typeof object != "object") {
            //nothing to decode
            return
        }

        b64Keys.forEach((key) => {
            if (object[key] != null) {
                if (isB64(object[key])) {
                    object[key] = Buffer.from(object[key], 'base64')
                } else {
                    var msg = util.format("invalid base64 for key='%s', value='%s'", key, object[key])
                    throw (msg)
                }
            }
        })
    }

    var transform = decode
    if (toB64 === true) {
        transform = encode
    }

    if (object && object.endpoints) {
        if (Array.isArray(object.endpoints.mqtt)) {
            object.endpoints.mqtt.forEach((m) => {
                transform(m.connOptions)
            })
        }

        if (Array.isArray(object.endpoints.awsiot)) {
            object.endpoints.awsiot.forEach((a) => {
                transform(a.connOptions)
            })
        }
    }
}

function processRegEx(object, toRegExp) {
    //to regex
    function encode(value) {
        if (value) {
            value = new RegExp(value, "g")
        }
    }

    //from regex
    function decode(value) {
        if (value) {
            value = value.toString()
        }
    }

    if (object.filters) {
        if (toRegExp == true) {
            encode(object.filters.mac)
            encode(object.filters.ibeacon)
        } else {
            decode(object.filters.mac)
            decode(object.filters.ibeacon)
        }
    }
}


function processConfig(config, fromReadable) {
    try {
        //handle b64 keys/certs
        processB64(config, fromReadable)

        //regex constructors
        processRegEx(config, fromReadable)

        return true
    } catch (e) {
        console.log("processConfig error: %s", e)
        return false
    }
}

module.exports.Configure = Configure
module.exports.ActiveConfig = ActiveConfig
module.exports.PrintConfig = PrintConfig
module.exports.PrintActiveConfig = PrintActiveConfig
