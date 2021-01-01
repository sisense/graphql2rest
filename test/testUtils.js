const del = require('del');

const GraphQL2REST = require('./../src/index');

const {
	loggerMock,
	clearBuffer,
	clearLastConsolePrint,
} = require('./mocks/logger');


const clearEnv = (gqlOutputFolders) => {
	clearLastConsolePrint();
	clearBuffer();
	(gqlOutputFolders || []).forEach(folder => del.sync(folder));
	loggerMock.supressDebugLevel = false;
}

const prepareEnv = (schema, gqlOutputFolder) => {
	clearEnv([gqlOutputFolder]);
	GraphQL2REST.generateGqlQueryFiles(schema,
		gqlOutputFolder, undefined, loggerMock);
}

const getOptions = (gqlOutputFolder) => ({
	logger: loggerMock,
	gqlGeneratorOutputFolder: gqlOutputFolder,
	manifestFile: '../test/test-fixtures/manifests/basicManifest1.json',
	apiPrefix: '/testApp/v1',
	middlewaresFile: '../test/test-fixtures/middleware/request-middleware.js'
});

const noop = () => {};

module.exports = { noop, prepareEnv, clearEnv, getOptions };


