const { ElasticsearchTransport } = require('winston-elasticsearch');
const winston = require('winston');
const { combine, splat } = winston.format;

// default logging config
const DEFAULT_CONFIG = {
    KNXESlogging: {
        'enabled': false,
        'label': 'BLUEKNX2MQTT',
        'loglevel:': 'info',
        'options' : {
            'indexPrefix': 'knx',
            'clientOpts': {
                'node': 'http://localhost:9200'
            }
        }
    }
}
// merge default with the one from the config file
const config = Object.assign({}, DEFAULT_CONFIG, require('./config.js').parse());

// this will remove "val" if it is not a number and
// replace it with strval instead
// this to avoid issues in ES with the val field having 2 different types (number and string)
const fixVal = winston.format((info) => {
    if (info.val && isNaN(info.val)) {
        let {val, ...rest} = info;
        rest.strval = val.toString();
        return rest;
    } else {
        return info;
    }
})();

const esTransportOpts = {
    ...config.KNXESlogging.options
};

const KNXESlogger = winston.createLogger({
    level: 'info',
    format: combine(fixVal),
    transports: [
        new ElasticsearchTransport(esTransportOpts)
    ],
});

const logKNXToES = ( data ) => {
    KNXESlogger.info("knx", data);
}

module.exports = { logKNXToES };
