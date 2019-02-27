'use strict'

var sandbox = require('./sandbox.js')

//publisher types
var publisherAwsIot = require('./publisherAwsIot.js')
var publisherMqtt = require('./publisherMqtt.js')
var publisherAzureIot = require('./publisherAzureIot.js')
var publisherHttp = require('./publisherHttp.js')
var publisherSock = require('./publisherSocket.js')
var gps = require('./gps.js')
var config = require('./config.js')
var reports = require('./reportTable.js')
var os = require('os')

var state = {
    hostname: null,
    interval: null,
    publishCount: 0,
    emptyReportTableCount: 0
}

function Init() {
    var cfg = config.ActiveConfig()
    state.hostname = os.hostname()

    if (cfg.publish.stream !== true) {
        intervalStart(cfg.publish.intervalMs)
    }
}

function Cleanup() {
    intervalStop()

    //cleanup publishers
    const endpoints = config.ActiveConfig().endpoints

    publisherMqtt.Cleanup(endpoints.mqtt)
    publisherAwsIot.Cleanup(endpoints.awsiot)
    publisherAzureIot.Cleanup(endpoints.azureiot)
}

function intervalStart(intervalMs) {
    intervalStop()
    state.interval = setInterval(publish, intervalMs);
}

function Test(object) {
    publishersDispatch(object)
}

function OnSuccess() {
    state.publishCount++
}

function intervalStop() {
    if (state.interval) {
        clearInterval(state.interval)
        state.interval = null
    }
}


function makeReportDefault() {
    var current = reports.Current()
    var tags

    if (current) {
        tags = Object.values(current)
    } else {
        tags = []
    }

    return {
        tags: tags,
        count: tags.length
    }
}

function makeReportSingle() {
    var strongest = reports.StrongestReport()
    var tags = []

    if (strongest) {
        tags.push(strongest)
    }

    return {
        tags: tags,
        count: tags.length
    }
}

function makeReportDeparted() {
    var departed = reports.DepartedList()
    if (departed.length > 0) {
        return {
            tagsDeparted: departed,
            count: departed.length
        }
    }
    return null
}

function shouldPublish() {
    var cfg = config.ActiveConfig()

    //always
    if (cfg.publish.always) {
        return true
    }

    //departed
    if (cfg.publish.departed) {
        return true
    }

    //no successful publish yet
    if (state.publishCount == 0) {
        return true
    }

    //present devices changed
    if (reports.DevicesChanged()) {
        return true
    }

    return false
}

function publish() {
    var cfg = config.ActiveConfig()

    if (shouldPublish()) {
        var report = null

        //publish the tags that departed
        if (cfg.publish.departed) {
            report = makeReportDeparted()
            if (report == null) {
                console.log("publish: no departures, nothing to publish")
                return
            }
        } else if (cfg.publish.single) {
            report = makeReportSingle()
        } else {
            report = makeReportDefault()
        }

        //attach common fields
        report.location = gps.GetPosition()
        report.detectedAt = Date.now()
        report.detectedBy = state.hostname

        //custom formatter?
        if (cfg.customFormatter != null) {
            try {
                var formatted = sandbox.Run(cfg.customFormatter, report)
                report = formatted
                console.log("format success")
            } catch (err) {
                console.log("formatter error, detaching: %s", err)
                cfg.customFormatter = null
            }
        } else {
            console.log("publish: publishing %d reports", report.count);
        }

        //send the data
        publishersDispatch(report)

        //debug published data?
        if (cfg.debug && cfg.debug.includes("publish")) {
            console.log("publishing: \n" + JSON.stringify(report, null, 2))
        }
    } else {
        console.log("publish: no changes")
    }

    //check if table was empty
    if (reports.CurrentDeviceCount() == 0) {
        state.emptyReportTableCount++
        if (cfg.publish.emptyExitCount != null) {
            console.log("empty table, %d/%d", state.emptyReportTableCount, cfg.publish.emptyExitCount)

            if (state.emptyReportTableCount >= cfg.publish.emptyExitCount) {
                console.log("exceeded emptyExitCount threshold, exiting...")
                process.exit(1)
            }
        }
    }

    reports.Clear()
}


function PublishStream(object) {
    var cfg = config.ActiveConfig()
    var out = object

    //custom formatter?
    if (cfg.customFormatter != null) {
        try {
            out = sandbox.Run(cfg.customFormatter, object)
            console.log("formatter success: " + JSON.stringify(out))
        } catch (err) {
            console.log("formatter error, detaching: %s", err)
            cfg.customFormatter = null
        }
    }

    if (out == null) {
        return
    }

    //send the data
    publishersDispatch(out)

    //debug published data?
    if (cfg.debug && cfg.debug.includes("publish")) {
        console.log("publishing: " + JSON.stringify(out))
    }
}

function publishersDispatch(object) {
    const cfg = config.ActiveConfig()
    const endpoints = cfg.endpoints

    publisherSock.Publish(endpoints.socket, object)
    publisherHttp.Publish(endpoints.http, object)
    publisherMqtt.Publish(endpoints.mqtt, object)
    publisherAwsIot.Publish(endpoints.awsiot, object)
    publisherAzureIot.Publish(endpoints.azureiot, object)
}

module.exports.Init = Init
module.exports.Cleanup = Cleanup
module.exports.Test = Test
module.exports.OnSuccess = OnSuccess
module.exports.PublishStream = PublishStream
