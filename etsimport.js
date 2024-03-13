/*
* Parse the provided ETS 5 export and create the mapping from
* nameToGA and GAToInfo
*/

const { logger, logToES } = require('./standardlogger.js');

const fs = require('fs');
const dptRegExp = new RegExp('DPS?T\\-(\\d+)(\\-(\\d+))?');

function parseDPT(dpt) {
    if (dpt !== undefined) {
        var match = dptRegExp.exec(dpt);
        if (match === undefined || match == null) {
            return undefined;
        } else {
            return 'DPT' + match[1] + (match[3] !== undefined ? '.' + match[3].padStart(3,0) : '');
        }
    }
}

exports.parse = function (etsFile) {
    var map = {};
    map.nameToGA = new Map();
    map.GAToname = new Map();
    map.GAToPrev = new Map();
    var main = null;
    var middle = null;

    var raw = fs.readFileSync(etsFile, 'utf8');

    var lines = raw.split(/\r\n|\n/);

    // remove the header if the user included it in the ETS export
    // the header is assumed not to contain a "/", while any KNX address does include one
    if (!lines[0].includes('/'))
        lines.splice(0,1)

    for (i=0; i<lines.length; i++) {
        if (lines[i].trim() != '') {
            var data = lines[i].split(',');
            if (data[0].trim() != '')
                main = data[0].slice(1,-1).replace(/\s/g, '_').replace(/\//g, '_').replace(/\+/g, '_');
            else if (data[1].trim() != '')
                middle = data[1].slice(1,-1).replace(/\s/g, '_').replace(/\//g, '_').replace(/\+/g, '_');
            else {
                var sub = data[2].slice(1,-1).replace(/\s/g, '_').replace(/\//g, '_').replace(/\+/g, '_');
                var name = main+"/"+middle+"/"+sub;
                var ga = data[3].slice(1,-1);
                var dpt = parseDPT(data[7].slice(1,-1));
                if (!dpt) {
                    logger.warn("Unrecognized datapoint [%s] for GA %s", dpt, ga);
                    logToES("warn", {dpt, ga}, "Unrecognized datapoint");
                }
                map.nameToGA.set(name, ga);
                map.GAToname.set(ga, {'main': main, "middle": middle, "sub": sub, 'dpt': dpt} );
                map.GAToPrev.set(ga, {'prev': undefined, 'lastChange': undefined} );
                logger.silly("Added %s %s %s", name, ga, dpt);
            }
        }
    }
    logger.info("Loaded %d datapoints", map.nameToGA.size);
    return map;
}
