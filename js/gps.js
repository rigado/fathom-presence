'use strict'

var SerialPort = require('serialport')
var Readline = require('@serialport/parser-readline')
var GPS = require('gps')
var config = require('./config.js')

var gpsState = null

function Init() {
    var cfg = config.ActiveConfig()

    //not configured
    if (!cfg.gps) {
        return
    }

    try {
        if (!(cfg.gps.serialport && cfg.gps.baud)) {
            throw ("missing GPS parameters!")
        }

        //initialize the state
        gpsState = {
            settings: settings.gps,
            port: null,
            portParser: null,
            gpsObj: null
        }

        var opts = { baudRate: gpsState.settings.baud }
        gpsState.port = new SerialPort(gpsState.settings.serialport, opts,
            function (err) {
                try {
                    if (err) {
                        throw (error)
                    } else {
                        console.log("GPS init success: %s, %s", gpsSerialPath, gpsSerialBaud)

                        //gps object
                        gpsState.gpsObj = new GPS

                        //connect the serialport to gpsObj
                        gpsState.portParser = port.pipe(new Readline({ delimiter: '\r\n' }))
                        gpsState.portParser.on('data', function (data) {
                            gpsState.gpsObj.update(data);
                        })

                        var cfg = config.ActiveConfig()
                        if (cfg.debug && cfg.debug.includes("gps")) {
                            setInterval(() => {
                                console.log("gps_state: " + JSON.stringify(gps.state, null, 2))
                            }, 5000)
                        }
                    }
                } catch (e) {
                    console.log("GPS error: %s", err)
                    Cleanup()
                } // try/catch
            }) // new SerialPort
    } catch (err) {
        console.log("GPS init error: %s", err)
        Cleanup()
    } // try/catch
}

function Cleanup() {
    if (gpsState == null) {
        return
    }

    //close serial port
    if (gpsState.port) {
        gpsState.port.close()
        gpsState.port = null
    }

    //remove parser listeners
    if (gpsState.portParser) {
        gpsState.portParser.removeAllListeners()
        gpsState.portParser = null
    }

    //discard gps
    if (gpsState.gpsObj) {
        gpsState.gpsObj = null
    }

    gpsState = null
}

function GetPosition() {
    let posnString = undefined

    if (gpsState && gpsState.gpsObj) {
        if (gps.state && gps.state.fix) {
            posnString = gps.state.lat + "," + gps.state.lon
        } else {
            posnString = "searching"
        }
    }

    return posnString
}


module.exports.Init = Init
module.exports.Cleanup = Cleanup
module.exports.GetPosition = GetPosition
