'use strict'

var Request = require('request')

const ecHost = "127.0.0.1"
const ecUrl = {
    scanCtrl: "http://" + ecHost + ":62307/rec/v1/settings",
    broadcastEvents: "http://" + ecHost + ":62307/rec/v1/broadcastEvents"
}

var ecSubscriber = null

function subscribe(evtCallback) {
    if (ecSubscriber != null) {
        console.log("ecSubscribe: already subscribed")
        return
    }

    ecSubscriber = Request.get(ecUrl.broadcastEvents)

    ecSubscriber.on('error', (error) => {
        console.log("ecSubscribe error: %s", error)
        unsubscribe()

        //should we reconnect or let the app exit and retry?
        throw (error)
    })

    ecSubscriber.on('response', (resp) => {
        if (resp.statusCode != 200) {
            console.log("ecSubscribe error: bad response code %d", resp.statusCode)
            unsubscribe()
        } else {
            console.log("ecSubscribe resp: %s", resp.statusCode)
        }
    })

    ecSubscriber.on('data', (data) => {
        try {
            //expect 'data: { "key": "value", ... }\r\n'
            var s = data.toString().trim()
            if (s.match(/^data: {.*}$/g)) {
                evtCallback(JSON.parse(s.replace("data: ", "")))
            } else {
                throw ("unexpected message")
            }
        } catch (e) {
            console.log("ecSubscribe rx error: %s", e)
        }
    })
}

function unsubscribe() {
    if (ecSubscriber == null) {
        //nothing to do
        return
    }

    console.log("ecUnsubscribe: cleaning up...")
    ecSubscriber.end("terminating")
    ecSubscriber.abort()
    ecSubscriber.destroy()
    ecSubscriber = null
}

function enableScanning(enable) {
    if(typeof enable != "boolean") {
        throw("enableScanning expects a boolean argument!")
    }

    //get the scanning status
    Request({
        "method": "GET",
        "json": true,
        "url": ecUrl.scanCtrl,
    }, function (error, request, body) {
        try {
            if (error) {
                throw (error)
            } else if (request.statusCode != 200) {
                throw ("ecSettingsGet error: %d", request.statusCode)
            } else if (body.scanning == null) {
                throw ("ecSettingsGet invalid json: %s", JSON.stringify(body))
            } else {
                console.log("ecSettingsSet scanning: want %s, have %s", enable, body.scanning)
                if (body.scanning !== enable) {
                    //set scanning status
                    Request({
                        "method": "POST",
                        "json": true,
                        "url": ecUrl.scanCtrl,
                        "body": { scanning: enable }
                    }, function (error, request, body) {
                        try {
                            if (error) {
                                throw (error)
                            } else {
                                console.log("ecSettingsSet scanning: value %s, statusCode %d", enable, request.statusCode)
                            }
                        } catch (e) {
                            console.log("ecSettingsSet error: %s", e);
                        }
                    })
                }
            }
        } catch (e) {
            console.log("ecSettingsGet error: %s", e)
        }
    })
}


function ParseAdvertisement(ecObj) {
    function makeTimestamp(ecObj) {
        var timestamp
        try {
            //try and pick time from the ec report, otherwise use now
            if (ecObj.lastseen) {
                timestamp = Date.parse(ecObj.lastseen)
            } else {
                timestamp = Date.now()
            }
        } catch (e) {
            timestamp = Date.now()
        }

        return timestamp
    }

    var settings = config.ActiveConfig()

    //sanity check
    if (ecObj == null || ecObj.addr == null || ecObj.rssi == null) {
        return null
    }

    //apply rssi filter
    if ((settings.filters != null &&
        settings.filters.rssi != null &&
        settings.filters.rssi < 0)
        && (ecObj.rssi < settings.filters.rssi)) {
        return null
    }

    //apply mac filter
    if (settings.filters != null &&
        settings.filters.mac != null &&
        !ecObj.addr.match(settings.filters.mac)) {
        return null
    }

    //lower case
    if (ecObj.mfgdata != null) {
        ecObj.mfgdata = ecObj.mfgdata.toLowerCase()
    }

    //ibeacon
    if (ecObj.ibeacon &&
        ecObj.ibeacon.uuid != null &&
        ecObj.ibeacon.major != null &&
        ecObj.ibeacon.minor != null &&
        settings.enabledTypes.includes("ibeacon")) {

        ecObj.ibeacon.uuid = ecObj.ibeacon.uuid.toLowerCase()

        //no uuid filter or matches uuid filter
        if ((settings.filters == null ||
            settings.filters.ibeacon == null)
            || ecObj.ibeacon.uuid.match(settings.filters.ibeacon)) {
            return {
                macAddress: ecObj.addr,
                rssi: ecObj.rssi,
                beacon: ecObj.ibeacon,
                manufacturerData: ecObj.mfgdata,
                detectedAt: makeTimestamp(ecObj)
            }
        }
    } //ibeacon

    //eddystone
    if (ecObj.eddystone &&
        (ecObj.eddystone.uid || ecObj.eddystone.url || ecObj.eddystone.tlm || ecObj.eddystone.eid) &&
        settings.enabledTypes.includes("eddystone")) {

        return {
            macAddress: ecObj.addr,
            rssi: ecObj.rssi,
            eddystone: ecObj.eddystone,
            detectedAt: makeTimestamp(ecObj)
        }
    }

    //basic ble type
    if (settings.enabledTypes.includes("ble")) {
        return {
            macAddress: ecObj.addr,
            rssi: ecObj.rssi,
            manufacturerData: ecObj.mfgdata,
            detectedAt: makeTimestamp(ecObj)
        }
    }

    return null
}


function Subscribe(evtCallback) {
    enableScanning(true)
    subscribe(evtCallback)
}

function Unsubscribe() {
    enableScanning(false)
    unsubscribe()
}

module.exports.Subscribe = Subscribe
module.exports.Unsubscribe = Unsubscribe
module.exports.ParseAdvertisement = ParseAdvertisement
