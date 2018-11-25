/*
* Parse the provided ETS 5 export and create the mapping from
* nameToGA and GAToInfo
*/

const fs = require('fs');
const dptRegExp = new RegExp('DPS?T\\-(\\d+)(\\-(\\d+))?');

function parseDPT(dpt) {
    if (subs[k].attributes.DPTs !== undefined) {
        var match = dptRegExp.exec(dpt);
        if (match === undefined || match == null) {
            logger.warn("Unrecognized datapoint %s", dpt);
            return undefined;
        } else {
            return 'DPT' + match[1] + (match[3] !== undefined ? '.' + match[3].padStart(3,0) : '');
        }
    }
}

exports.parse = function (etsFile, logger) {
    var map = {}
    var main = null;
    var middle = null;
    
    var raw = fs.readFileSync(etsFile);

    var lines = raw.split(/\r\n|\n/);

    // remove the header if the user included it in the ETS export
    // the header is assumed not to contain a "/", while any KNX address does include one
    if (!lines[0].includes('/'))
        lines.splice(0,1)

    for (i=0; i<lines.length; i++) {
        if (lines[i].trim() != '') {
            var data = lines[i].split(',');            
            if (data[0].trim() != '')
                main = data[0].slice(1,-1);
            else if (data[1].trim() != '')
                middle = data[1].slice(1,-1);
            else {
                var name = main+"-"+middle+"-"+data[2].slice(1,-1);
                var ga = data[3].slice(1,-1);
                var dpt = parseDPT(data[7].slice(1,-1));
                map.nameToGA.set(name, {'ga': ga, 'dpt': dpt});
                map.GAToname.set(ga, {'name': name, 'dpt': dpt});
                console.log("Added " + name+ga+dpt);
            }
        }
    }
}
