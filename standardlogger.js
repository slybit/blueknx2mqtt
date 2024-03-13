const { ElasticsearchTransport } = require('winston-elasticsearch');
const winston = require('winston');
const { combine, timestamp, printf, colorize, align, splat } = winston.format;

// default logging config
const DEFAULT_CONFIG = {
    loglevel: 'info',
    ESlogging: {
        'enabled': false,
        'label': 'DEFAULT',
        'loglevel:': 'info',
        'options' : {
            'indexPrefix': 'logs',
            'clientOpts': {
                'node': 'http://localhost:9200'
            }
        }
    }
}
// merge default with the one from the config file
const config = Object.assign({}, DEFAULT_CONFIG, require('./config.js').parse());



//
//Font styles: bold, dim, italic, underline, inverse, hidden, strikethrough.
//Font foreground colors: black, red, green, yellow, blue, magenta, cyan, white, gray, grey.
//Background colors: blackBG, redBG, greenBG, yellowBG, blueBG magentaBG, cyanBG, whiteBG
//
winston.addColors({
    error: 'bold white redBG',
    warn: 'yellow',
    info: 'blue',
    verbose: 'white',
    silly: 'white',
    debug: 'green',
});


const consoleFormat = combine(
    colorize({ all: true }),
    splat(),
    timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
    }),
    align(),
    printf((info) => `[${info.timestamp}] ${info.level}  ${info.message}`)
);

const logger = winston.createLogger({
    level: config.loglevel,
    transports: [
        new winston.transports.Console({
            format: consoleFormat
        })
    ],
});

const esTransportOpts = {
    format: combine(splat()),
    ...config.ESlogging.options
};

const ESlogger = winston.createLogger({
    level: config.ESlogging.loglevel,
    transports: [
        new ElasticsearchTransport(esTransportOpts)
    ],
});

const logToES = (level, meta, ...splat) => {
    if (!config.ESlogging.enabled) return;
    let _meta = meta ? {"label": config.ESlogging.label, ...meta} : {"label": config.ESlogging.label};
    ESlogger.log(level, ...splat, _meta);
}

module.exports = { logger, logToES };
