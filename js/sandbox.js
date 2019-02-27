'use strict'

var vm = require('vm')

const DEFAULT_TIMEOUT = 5000

function Run(code, obj, timeout=DEFAULT_TIMEOUT) {
    if(code == null || typeof code != 'string' || code.length == 0 || obj == null) {
        return null
    }

    //run in the sandbox
    // function expects an `input` object and will return results on `output` object
    const sandbox = {input: obj, output: {}}
    vm.createContext(sandbox)
    vm.runInContext(code, sandbox, {timeout: timeout})
    
    //fail
    return sandbox.output
}

module.exports.Run = Run
