'use strict'

const knx = require('knx');
const { createLogger, format, transports } = require('winston');
const DPTLib = require('knx/src/dptlib');
const config = require('./config.js').parse();

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
const ets = require('./etsimport.js').parse(config.knx.etsExport, logger);

/*
let knxConnection = knx.Connection(Object.assign({
    handlers: {
        connected: function() {
            logger.info('KNX connected');
        },
        event: function (evt, src, dst, value) {
            logger.silly("onKnxEvent %s, %s, %j", evt, dst, value);
            var dpt = DPTLib.resolve("9.001");
            var payload = {};
            if (dpt.subtype) {
                payload.unit = dpt.subtype.unit;
            }
            payload.value = DPTLib.fromBuffer(value, dpt);
            logger.info(payload.value);
        }
  }}, config.knx.options))
  */