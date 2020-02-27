const util = require('util');

let lastConsolePrint = '';
let consoleBuffer = '';


const getLastConsolePrint = () => lastConsolePrint;
const getConsoleBuffer = () => consoleBuffer;
const clearLastConsolePrint = () => { lastConsolePrint = ''; };
const clearBuffer = () => { consoleBuffer = ''; };


const stdoutMock = (level, msg, additionalMsg) => {
	const formattedAdditionalMsg = (typeof additionalMsg === 'object' ? util.inspect(additionalMsg) : additionalMsg);

	lastConsolePrint = (`${level}: ${msg} ${additionalMsg ? formattedAdditionalMsg : ''}`);

	consoleBuffer += `${lastConsolePrint}\n`;
	console.log(lastConsolePrint);
};

const loggerMock = {
	supressDebugLevel: false,
	supressErrorLevel: false,

	log(level, msg, additionalMsg) {
		if (level === 'debug' && this.supressDebugLevel) return;
		if (level === 'error' && this.supressErrorLevel) return;

		stdoutMock(level, msg, additionalMsg);
	}
};


module.exports = { loggerMock, getLastConsolePrint, clearBuffer, clearLastConsolePrint, getConsoleBuffer };
