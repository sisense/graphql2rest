const winston = require('winston');
const util = require('util');

let logger;

const initLogger = (externalWinstonLogger) => {
	if (externalWinstonLogger
		&& externalWinstonLogger.log
		&& typeof externalWinstonLogger.log === 'function') { // TODO change duck check to obj Type check
		logger = externalWinstonLogger;
		return;
	}

	const { format } = winston;
	logger = winston.createLogger({
		level: 'debug',
		transports: [
			new winston.transports.Console({
				json: true,
				colorize: true,
				format: format.combine(format.colorize(), format.simple())
			})
		],
		exitOnError: false
	});
};

const info = (msg, obj) => log(msg, obj);

const log = (msg, obj) => {
	logger.log('info', obj ? `${msg || ''} | ${util.inspect(obj)}` : msg);
};

const debug = (msg, obj) => {
	logger.log('debug', obj ? `${msg || ''} ${util.inspect(obj)}` : msg);
};

const error = (msg, err) => {
	if (typeof msg === 'object') logger.log('error', `${util.inspect(msg)}`);
	else logger.log('error', msg);
	if (err) logger.log('error', `${util.inspect(err)}`);
};

module.exports = { initLogger, log, debug, error, info };
