"use strict";

const ruuviMfgId = 0x0499

function Parse(msg) {
    //eddystone?
    let ruuvi = parseRuuviEddystone(msg.advertisement);

    //ruuvi mfgData
    if (!ruuvi) {
        ruuvi = parseRuuviMfgData(msg.advertisement)
    }

    return ruuvi;
}

function parseRuuviMfgData(adv) {
    if (adv && adv.manufacturerData) {
        var result = parseV3(adv.manufacturerData)
        if(result) {
            return result
        }

        var result = parseV5(adv.manufacturerData)
        if(result) {
            return result
        }
    }

    return null
}


function parseV3(mfgData) {
    //length check
    if (mfgData == null || mfgData.length != 16) {
        return null
    }

    //id check
    var mfgId = mfgData.readUInt16LE(0)
    if (mfgId != ruuviMfgId) {
        return null
    }

    //format id check
    var result = {}
    result.dataFormat = mfgData.readUInt8(2)
    if(result.dataFormat != 3) {
        return null
    }

    result.humidity = mfgData.readUInt8(3) * 0.5
    result.temperature = mfgData.readInt8(4) + (mfgData.readUInt8(5) * 0.01)
    result.pressure = mfgData.readUInt16BE(6) - 50000
    result.accelerationX = mfgData.readInt16BE(8)
    result.accelerationY = mfgData.readInt16BE(10)
    result.accelerationZ = mfgData.readInt16BE(12)
    result.battery = mfgData.readUInt16BE(14)

    return result
}

function parseV5(mfgData) {
    //length check
    if (mfgData == null || mfgData.length != 26) {
        return null
    }

    //id check
    var mfgId = mfgData.readUInt16LE(0)
    if (mfgId != ruuviMfgId) {
        return null
    }

    //format id check
    var result = {}
    result.dataFormat = mfgData.readUInt8(2)
    if(result.dataFormat != 5) {
        return null
    }

    result.temperature = mfgData.readInt16(3) * 0.005
    result.humidity = mfgData.readUInt16(5) * 0.0025
    result.pressure = mfgData.readUInt16(7) - 50000

    result.accelerationX = mfgData.readInt16BE(9)
    result.accelerationY = mfgData.readInt16BE(11)
    result.accelerationZ = mfgData.readInt16BE(13)

    var powerinfo = mfgData.readUInt16BE(15)
    result.power = {
        battery: (powerinfo >> 5) + 1600,
        txPower: ((powerinfo & 0x1f) * 2) - 40
    }
    result.movementCount = mfgData.readUInt8(17)
    result.measurementSeq = mfgData.readUInt16BE(18)
    result.mac = mfgData.slice(20).toString('hex')

    return result
}


//
// eddystone constants 
// see https://github.com/google/eddystone/tree/master/eddystone-url

const eddystone_svc_uuid = "feaa"
const eddystone_frame_url = 0x10

//url schemes
const eddystone_frame_url_schemes =
    [
        "http://www.", //0x00
        "https://www.", //0x01
        "http://", //0x02
        "https://", //0x03
    ];

//character substitutions (0x0-0x0d, 0xe-0x20, 0x7f-0x20 )
const eddystone_frame_url_encoding =
    [
        ".com/", //0x00
        ".org/", //0x01
        ".edu/",
        ".net/",
        ".info/",
        ".biz/",
        ".gov/",
        ".com",
        ".org",
        ".edu",
        ".net",
        ".info",
        ".biz",
        ".gov", //0x0d
    ];

function parseEddystoneURLFrame(frame) {
    let obj = null;

    if (frame &&
        frame.length >= 4 &&
        frame[0] == eddystone_frame_url &&
        frame[2] < eddystone_frame_url_schemes.length) {

        obj = {}

        let url = eddystone_frame_url_schemes[frame[2]];

        frame.slice(3).forEach((char) => {
            //reserved, perform susbtitution
            if (char < eddystone_frame_url_encoding.length) {
                url += eddystone_frame_url_encoding[char];
            }
            // reserved but unimplemented
            else if (char <= 0x20 || char >= 0x7f) {
                //do nothing
            } else {
                url += String.fromCharCode(char);
            }
        })

        obj.txPower = frame[1];
        obj.url = url
    }

    return obj
}


const ruuvi_eddystone_base = "https://ruu.vi/#"
const ruuvi_format_eddystone = 0x04

function parseRuuviEddystone(adv) {
    let obj = null;

    //eddystone advertisement?
    if (adv &&
        adv.serviceUuids &&
        adv.serviceUuids.includes(eddystone_svc_uuid) &&
        adv.serviceData &&
        adv.serviceData[0].uuid &&
        adv.serviceData[0].uuid == eddystone_svc_uuid &&
        adv.serviceData[0].data) {

        let url = parseEddystoneURLFrame(adv.serviceData[0].data);

        //eddystone url?
        if (url && url.url) {

            //ruuvi url?
            if (url.url.startsWith(ruuvi_eddystone_base)) {

                //trim
                let base64str = url.url.replace(ruuvi_eddystone_base, "")

                //parse b64
                let bytes = Buffer.from(base64str, "base64")

                //parse fields
                if (bytes.length == 6 &&
                    bytes[0] == ruuvi_format_eddystone) {

                    let humidity = bytes[1] * 0.5
                    let temperature = bytes[2] + (bytes[3] / 100)
                    let pressure = bytes.readUInt16BE(4) - 50000

                    //temp sign check
                    if (temperature > 128) {
                        temperature -= 128
                        temperature *= -1
                    }

                    //assign
                    obj = {
                        humidity: humidity,
                        temperature: temperature,
                        pressure: pressure,
                        dataFormat: ruuvi_format_eddystone
                    };
                }
            }
        }
    }

    return obj
}


module.exports.Parse = Parse