'use strict'

const knx = require('knx');
const { createLogger, format, transports } = require('winston');
const DPTLib = require('knx/src/dptlib');
const config = require('./config.js').parse();
var log = require('log-driver').logger;

log.trace('shit');

// Initate the logger
const logger = createLogger({
    level: config.loglevel,
    format: format.combine(
      format.colorize(),
      format.splat(),
      format.simple(),
    ),
    transports: [new transports.Console()]
});

// Parse the ETS export
const map = require('./etsimport.js').parse(config.knx.etsExport, logger);

let handleKNXEvent = function(evt, src, dst, value) {
    logger.silly("onKnxEvent %s, %s, %j", evt, dst, value);
    if (evt !== 'GroupValue_Write' && evt !== 'GroupValue_Response') {
        return;
    }
    let payload = {
        'srcphy': src,
        'dstgad': dst        
    };
    enrichPayload(payload, value);    
    if (evt === 'GroupValue_Response') payload.response = true;
    let mqttMessage = JSON.stringify(payload);
    logger.verbose("%s **** KNX EVENT: %s, dst: %s, value: %j",
      new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
      evt, dst, payload);
}

let updatePrev = function(payload, apdu) {    
    let info = map.GAToPrev.get(payload.dstgad);    
    if (info === undefined) {
        map.GAToPrev.set(payload.dstgad, {'prev': undefined, 'lastChange': undefined} );
    }
    if ((info.prev === undefined) || (info.prev !== undefined && !info.prev.equals(apdu))) {
        info.lastChange = (new Date).getTime();
        info.prev = apdu;
    }
    return info.lastChange;
}

let enrichPayload = function(payload, apdu) {
    // time stamps
    payload.lc = updatePrev(payload, apdu);
    payload.ts = (new Date).getTime();
    // value 
    let info = map.GAToname.get(payload.dstgad);
    if (info === undefined) {
        payload.value = '0x'+apdu.toString('hex');
        payload.raw = true; // indication that payload is raw binary value
    } else {        
        payload.dpt = info.dpt;
        payload.main = info.main;
        payload.middle = info.middle;
        payload.sub = info.sub;
        try {
            var dpt = DPTLib.resolve(info.dpt);
            if (dpt.subtype) {
                payload.unit = dpt.subtype.unit;
            }
            payload.value = DPTLib.fromBuffer(apdu, dpt);
        } catch (err) {
            payload.value = '0x'+apdu.toString('hex');
            payload.raw = true;
        }
        // replace true/false with 1/0
        if (payload.value === true)
            payload.value = 1;
        else if (payload.value === false)
            payload.value = 0;
    }    
}


handleKNXEvent('GroupValue_Write', "1.1.1", "0/0/108", Buffer.from('01', 'hex'));

setTimeout(function() {
    handleKNXEvent('GroupValue_Write', "1.1.1", "0/0/108", Buffer.from('00', 'hex'));
}, 3000);



/*
let knxConnection = knx.Connection(Object.assign({
    handlers: {
        connected: function() {
            logger.info('KNX connected');
        },
        event: function (evt, src, dst, value) {
            logger.silly("onKnxEvent %s, %s, %j", evt, dst, value);
            handleKNXEvent(evt, src, dst, value);
        }
  }}, config.knx.options))
*/