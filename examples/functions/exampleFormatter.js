//notes: 
// - must use semicolons for all the lines
// - must escape double quotes or use single quotes
// - expect input to be an object containing an array of tags
// - must return result in output as any object
// - copy the function body including the {} and remove all line breaks and set as the `formatter` function in the config

//using functionFormatter.js
// - file must contain only 1 function
// - file must not contain declarations outside of the function

//this is a silly example where we sort by rssi into even & odd rssis
function exampleFormatter(input) {
    output = {};
    if (input && input.tags && Array.isArray(input.tags)) {
        var evenRssi = [];
        var oddRssi = [];
        input.tags.forEach((dev) => {
            if (dev.rssi != null && (typeof dev.rssi == 'number')) {
                if (dev.rssi % 2 == 0) {
                    evenRssi.push(dev);
                } else {
                    oddRssi.push(dev);
                }
            }
        });
        output = { evenRssi: evenRssi, evenRssiCount: evenRssi.length, oddRssi: oddRssi, oddRssiCount: oddRssi.length };
    }
}
