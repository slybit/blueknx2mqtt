const yaml = require('js-yaml');
const fs   = require('fs');

exports.parse = function () {
    const file = process.env.KNX_MQTT_CONFIG || 'config.yaml';
    if (fs.existsSync(file)) {
        try {
          return yaml.safeLoad(fs.readFileSync(file, 'utf8'));
        } catch (e) {
          console.log(e);
          process.exit();
        }
    } else {
        return {
            loglevel: 'silly',
            knx: {
                etsExport: 'etsexport.csv'
            },
            mqtt: {
                url: 'mqtt://localhost',
                topicPrefix: 'knx'
            }
        }
    }
}