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

const esTransportOpts = {
    format: combine(splat()),
    ...config.KNXESlogging.options
};

const ESlogger = winston.createLogger({
    level: config.KNXESlogging.loglevel,
    transports: [
        new ElasticsearchTransport(esTransportOpts)
    ],
});

const logKNXToES = (level, meta, ...splat) => {
    if (!config.KNXESlogging.enabled) return;
    let _meta = meta ? {"label": config.KNXESlogging.label, ...meta} : {"label": config.KNXESlogging.label};
    ESlogger.log(level, ...splat, _meta);
}

module.exports = { logKNXToES };
