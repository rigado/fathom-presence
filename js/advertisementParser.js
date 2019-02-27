'use strict'

var ruuvitag = require('./ruuvitag.js')
var sandbox = require('./sandbox.js')
var eddystoneParser = require('./eddystoneParser.js')
var config = require('./config.js')

function parseGlobalStar(settings, adv) {
    if (settings.enabledTypes.includes("globalstar") &&
        adv &&
        adv.uuid &&
        adv.rssi &&
        adv.advertisement &&
        adv.advertisement.manufacturerData &&
        adv.advertisement.localName) {

        let md = adv.advertisement.manufacturerData;

        if (md && md.length == 13) {
            let mfgId = md.readUIntLE(0, 2);

            //globalstar id
            if (mfgId == 0x0576) {

                //create the obj
                let r = {
                    name: adv.advertisement.localName,
                    macAddress: adv.uuid,
                    manufacturerData: md,
                    rssi: adv.rssi,
                    detectedAt: Date.now()
                }

                return r;
            }
        }
    }

    return null;
}

function parseBeacon(manufacturerData) {
    var ret = undefined;

    // https://os.mbed.com/blog/entry/BLE-Beacons-URIBeacon-AltBeacons-iBeacon/
    if (manufacturerData && manufacturerData.length >= 25) {
        // mfgId is litte-endian, everything else is big-endian
        var mfgId = manufacturerData.readUInt16LE(0)
        //var beaconType = manufacturerData.readUInt8(2);
        var remainingLength = manufacturerData.readUInt8(3)

        //length check (beaconLength is the length of the remaining data)
        if (remainingLength == (manufacturerData.length - 4)) {
            var uuid = manufacturerData.slice(4, 20).toString('hex')
            var major = manufacturerData.readUInt16BE(20)
            var minor = manufacturerData.readUInt16BE(22)
            var txPower = manufacturerData.readInt8(24)

            ret = {
                mfgId: mfgId,
                uuid: uuid,
                major: major,
                minor: minor,
                txPower: txPower
            }
        }
    }

    return ret
}

function parseKontaktIO(settings, adv) {
    if (settings.enabledTypes.includes("kontakt") &&
        adv &&
        adv.uuid &&
        adv.advertisement.manufacturerData) {

        let ib = parseBeacon(adv.advertisement.manufacturerData);

        //ibeacon with uuid "f7826da64fa24e988024bc5b71e0893e"
        if (ib &&
            ib.mfgId == 0x4c &&
            ib.uuid == "f7826da64fa24e988024bc5b71e0893e") {

            let o = {
                macAddress: adv.uuid,
                rssi: adv.rssi,
                beacon: ib,
                detectedAt: Date.now()
            };

            return o;
        }
    }
    return null;
}

function parseIBeacon(settings, adv) {
    if (settings.enabledTypes.includes("ibeacon") &&
        adv &&
        adv.uuid &&
        adv.advertisement.manufacturerData) {

        let ib = parseBeacon(adv.advertisement.manufacturerData);

        //successfully parsed && (no filter || matches ibeacon filter)
        if (ib
            && ((settings.filters == null ||
                 settings.filters.ibeacon == null) 
                || ib.uuid.match(settings.filters.ibeacon))) {
            let o = {
                macAddress: adv.uuid,
                rssi: adv.rssi,
                beacon: ib,
                detectedAt: Date.now()
            }

            return o
        }
    }
    return null;
}

function parseRuuvi(settings, adv) {
    if (settings.enabledTypes.includes("ruuvi") &&
        adv &&
        adv.uuid) {
        let r = ruuvitag.Parse(adv);

        if (r) {
            let o = {
                macAddress: adv.uuid,
                rssi: adv.rssi,
                ruuvi: r,
                detectedAt: Date.now()
            };

            return o;
        }
    }

    return null;
}

function parseBasicBLE(settings, adv) {
    if (settings.enabledTypes.includes("ble") &&
        adv &&
        adv.uuid &&
        adv.rssi) {

        let r = {
            macAddress: adv.uuid,
            rssi: adv.rssi,
            detectedAt: Date.now()
        }

        //attach additional fields if present
        if (adv.advertisement) {
            if (adv.advertisement.localName) {
                r.name = adv.advertisement.localName;
            }

            if (adv.advertisement.manufacturerData) {
                r.manufacturerData = adv.advertisement.manufacturerData
            }
        }

        return r;
    }

    return null;
}


function parseEddystone(settings, adv) {
    if (settings.enabledTypes.includes("eddystone") &&
        adv &&
        adv.uuid &&
        adv.rssi) {
        var ed = eddystoneParser.ParseEddystone(adv)

        if (ed != null) {
            let o = {
                macAddress: adv.uuid,
                rssi: adv.rssi,
                eddystone: ed,
                detectedAt: Date.now()
            }

            return o
        }
    }
}

function parseCustom(settings, adv) {
    if (settings.customDeviceParser &&
        adv &&
        adv.uuid &&
        adv.rssi) {
        try {
            return sandbox.Run(settings.customDeviceParser, adv)
        } catch (err) {
            console.log("error running customDeviceParser: %s", err)
            console.log("detaching customDeviceParser...")
            settings.customDeviceParser = null
            return null
        }
    }
}

//entry point to parse BLE device
function Parse(peripheral) {
    var settings = config.ActiveConfig()

    //valid object?
    if (peripheral == null || peripheral.uuid == null || peripheral.rssi == null) {
        return null
    }

    if(!settings) {
        console.log("error, no settings!")
        return null
    }

    //apply mac filter
    if (settings.filters != null && 
        settings.filters.mac != null && 
        !peripheral.uuid.match(settings.filters.mac)) {
        return null
    }

    //apply rssi filter
    if ((settings.filters != null &&
         settings.filters.rssi != null && 
         settings.filters.rssi < 0)
        && (peripheral.rssi < settings.filters.rssi)) {
        return null
    }

    // try and parse the data, the order matters! You must parse from most specific to least specific types
    // e.g  the ruuvi tag sometimes advertises an eddystone url that can be b64 decoded into sensor data, 
    //      if we run parseRuuvi() after parseEddystone(), the sensor data if in eddystone format will 
    //      be decoded as eddystone url instead of decoded more appropriately into a ruvvi type
    let o = null;

    //custom parser takes priority
    o = parseCustom(settings, peripheral)
    if (o) {
        return o
    }

    //specific ibeacon
    o = parseKontaktIO(settings, peripheral)
    if (o) {
        return o
    }

    //general ibeacon
    o = parseIBeacon(settings, peripheral)
    if (o) {
        return o
    }

    //adv with mfgdata w/mfgid
    o = parseGlobalStar(settings, peripheral)
    if (o) {
        return o
    }

    //adv with mfgdata w/mfgid
    o = parseRuuvi(settings, peripheral)
    if (o) {
        return o
    }

    //eddystone
    o = parseEddystone(settings, peripheral)
    if (o) {
        return o
    }

    //last chance to parse here
    o = parseBasicBLE(settings, peripheral)
    if (o) {
        return o
    }

    //nothing worked
    return null
}

module.exports.Parse = Parse
