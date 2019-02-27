'use strict'


var tablePrevious = {}
var tableCurrent = {}

function DevicesChanged() {
    //check that we have reports from the same list of mac addresses, the values do not matter
    var a = Object.keys(tableCurrent).sort()
    var b = Object.keys(tablePrevious).sort()

    return JSON.stringify(a) !== JSON.stringify(b)
}

function StrongestReport() {
    let keys = Object.keys(tableCurrent)
    let result = null

    //find the strongest
    for (let i = 0; i < keys.length; i++) {
        let cur = tableCurrent[keys[i]]

        //valid?
        if (cur && cur.rssi && cur.rssi) {
            //first sample, or this one was stronger
            if (!result || (result.rssi < cur.rssi)) {
                result = cur
            }
        }
    }

    return result
}

function DepartedList() {
    let result = []

    if (tablePrevious) {
        //find all the old keys that do not exist in the current table
        let oldKeys = Object.keys(tablePrevious)

        oldKeys.forEach((k) => {
            if (!tableCurrent.hasOwnProperty(k)) {
                result.push(tablePrevious[k]);
            }
        })
    }

    return result
}

function CurrentDeviceCount() {
    return Object.keys(tableCurrent).length
}

function Current() {
    return tableCurrent
}

function PutReport(rep) {
    if (rep && rep.macAddress) {
        //this is a new report, add it to dictionary
        //also force ruuvi updates
        if (!tableCurrent[rep.macAddress] || rep.ruuvi != null) {
            tableCurrent[rep.macAddress] = rep
        } else {
            //add any keys we are missing, update rssi/tick
            Object.keys(rep).forEach((k) => {
                if (!tableCurrent[rep.macAddress][k] ||
                    k == 'detectedAt' ||
                    k == 'rssi') {
                    tableCurrent[rep.macAddress][k] = rep[k];
                } else if (k == 'eddystone') {
                    //join the eddystone data
                    Object.keys(rep[k]).forEach((esFrame) => {
                        tableCurrent[rep.macAddress][k][esFrame] = rep[k][esFrame]
                    })
                }
            })
        }
    }
}

function Clear() {
    //copy current to previous
    tablePrevious = tableCurrent

    //clear current
    tableCurrent = {}
}

module.exports.StrongestReport = StrongestReport
module.exports.DepartedList = DepartedList
module.exports.DevicesChanged = DevicesChanged
module.exports.Clear = Clear
module.exports.PutReport = PutReport
module.exports.Current = Current
module.exports.CurrentDeviceCount = CurrentDeviceCount

