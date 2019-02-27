'use strict'

var advParser = require('./advertisementParser.js')
var noble = require('noble')
var edgeConnect = require('./edgeConnect.js')
var config = require('./config.js')
var reportTable = require('./reportTable.js')
var publisher = require('./publisher.js')
var sleep = require('sleep')

var mode = null
const NOBLE_ERROR_EXIT_DELAY_S = 60

function Init() {
    var cfg = config.ActiveConfig()

    //only allow one scanner at a time, edge-connect cannot run while noble is in use.
    if (cfg.scanner == "edge-connect") {
        mode = "edge-connect"
        console.log("initializing scanner: edge-connect")
        edgeConnectInit()
    } else {
        if (cfg.scanner != "noble") {
            console.log("warning: scanner defaulting to 'noble'")
        }

        //force the hci index
        if (cfg.scannerHciIdx != null && typeof cfg.scannerHciIdx == "number") {
            process.env.NOBLE_HCI_DEVICE_ID = cfg.scannerHciIdx
        } else if (process.env.SNAP_ARCH == "armhf") {
            process.env.NOBLE_HCI_DEVICE_ID = 1 //hci1 default on arm (assuming cascade)
        } else {
            process.env.NOBLE_HCI_DEVICE_ID = 0 //hci0 for everything else
        }

        console.log("initializing scanner: noble (hci%d)", process.env.NOBLE_HCI_DEVICE_ID)
        mode = "noble"
        nobleInit()
    }
}

function Cleanup() {
    if (mode == "edge-connect") {
        edgeConnect.Unsubscribe()
    } else if (mode == "noble") {
        //remove listeners first so we don't exit too soon
        noble.removeAllListeners()
        noble.stopScanning()
    }
}

function onAdvertisement(advertisement) {
    //queue the report
    if (advertisement) {
        var cfg = config.ActiveConfig()
        if(cfg.publish.stream === true) {
            publisher.PublishStream(advertisement)
        } else {
            reportTable.PutReport(advertisement)
        }

        //dump the advertisement json?
        if (cfg.debug && cfg.debug.includes("advertisements")) {
            console.log("advertisement:\n" + JSON.stringify(advertisement, null, 2))
        }
    }
}

function edgeConnectInit() {
    edgeConnect.Subscribe((data) => {
        if (data) {
            var report = edgeConnect.ParseAdvertisement(data)
            if (report) {
                onAdvertisement(report)
            }
        }
    })
}

function nobleInit() {
    noble.on('stateChange', function (state) {
        if (state === 'poweredOn') {
            //allow duplicates
            noble.startScanning([], true)
        } else {
            noble.stopScanning()
            console.log("nobleState => '%s', exiting in %ds...", state, NOBLE_ERROR_EXIT_DELAY_S)

            //if we don't get the 'poweredOn' event most likely:
            // - we requested an hci device that is not ready
            // - bluez is being updated
            //exit with an error so we get restarted, but wait 1m to be nice to the CPU
            sleep.sleep(NOBLE_ERROR_EXIT_DELAY_S)
            process.exit(1)
        }
    })

    noble.on('discover', function (peripheral) {
        if (peripheral) {
            var report = advParser.Parse(peripheral)
            if (report) {
                onAdvertisement(report)
            }
        }
    })
}

module.exports.Init = Init
module.exports.Cleanup = Cleanup
