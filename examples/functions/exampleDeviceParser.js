//notes: 
// - must use semicolons for all the lines
// - must escape double quotes or use single quotes
// - expect input to be a noble peripheral object
// - must return result in output as any object
// - copy the function body including the {} and remove all line breaks and set as the `formatter` function in the config

//using functionFormatter.js
// - file must contain only 1 function
// - file must not contain declarations outside of the function

//input will contain
// -- required --
// - input.uuid
// - input.rssi
// - input.advertisement
// -- optional --
// - input.advertisement.manufacturerData
// - input.advertisement.localName

//this is a silly example where we determine a type from a random number and xor the mfgdata
function exampleCustomDeviceParser(input) {
    var types = ['velcro', 'foot', 'swan', 'needle', 'carpet', 'koala', 'potato', 'spork'];
    output = {};
    if (input && input.uuid && input.rssi) {
        var idx = Math.floor(Math.random() * types.length);
        var type = types[idx];
        var name = 'unnamed-' + type;
        var mfgDataXor = undefined;

        if(input.advertisement) {
            if(input.advertisement.localName) {
                name = input.advertisement.localName+'-'+type;
            }
            if(input.advertisement.manufacturerData) {
                mfgDataXor = 0;
                for(var i=0; i<input.advertisement.manufacturerData.length; i++){
                    mfgDataXor ^= input.advertisement.manufacturerData[i];
                }
            }
        }

        output = {
            name: name,
            macAddress: input.uuid,
            rssi: input.rssi,
            rssiEven: (input.rssi%2 == 0),
            type: type,
            mfgDataXor: mfgDataXor,
            detectedAt: Date.now()
        }
    }
}
