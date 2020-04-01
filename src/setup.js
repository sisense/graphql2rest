const path = require('path');
const consts = require('./consts.js');
const { error } = require('./logging.js');


/* Loads defaults file for configuration */
const readDefaultsConfigFile = () => {
	let configObj;
	let configFileAbsPath;
	try {
		configFileAbsPath = (path.resolve(__dirname, consts.CONFIG_FILE));
		configObj = require(configFileAbsPath);
	} catch (e) {
		error(`init: encountered error trying to read config file ${configFileAbsPath}`, e);
		return null;
	}
	return configObj;
};


/* Validates configuration files and custom functions. Returns true if all are valid, false otherwise. */
const validateConfig = (configOptions, funcsObj) => {
	if (!configOptions || Object.keys(configOptions).length === 0) {
		error('init: FATAL: configuration options are missing - please check defaults.json file or provide options object with all required fields. Aborting.');
		return false;
	}

	if (!funcsObj || !funcsObj.executeFn || typeof funcsObj.executeFn !== 'function') {
		error('init: FATAL: The GraphQL execution function provided, executeFn, is not a function. Aborting.');
		return false;
	}

	if (!funcsObj || !funcsObj.formatDataFn || typeof funcsObj.formatDataFn !== 'function') {
		error('init: FATAL: formatDataFn function provided is not a function. Aborting.');
		return false;
	}

	if (!funcsObj || !funcsObj.formatErrorFn || typeof funcsObj.formatErrorFn !== 'function') {
		error('init: FATAL: formatErrorFn function provided is not a function. Aborting.');
		return false;
	}

	const requiredOptions = consts.CONFIG_REQUIRED_OPTIONS;
	for (const option in requiredOptions) {
		if (!configOptions[requiredOptions[option]]) {
			error(`init: FATAL: value of required option "${requiredOptions[option]}" is missing from provided options and from defaults.json file - aborting.`);
			return false;
		}
	}
	return true;
};


/* Loads dependency files based on config */
const loadDependencies = (configObj) => {
	let queryStrings;
	let manifest;
	let middlewaresModule;

	let middlewaresFileAbsolutePath;
	let gqlOutputAbsolutePath;
	let manifestAbsolutePath;

	try {
		gqlOutputAbsolutePath = path.resolve(__dirname, configObj.gqlGeneratorOutputFolder);
		queryStrings = require(configObj.gqlGeneratorOutputFolder);
	} catch (e) {
		error(`FATAL: Error while attempting to load index.js from gqlGeneratorOutputFolder ${configObj.gqlGeneratorOutputFolder}. Absolute path: "${gqlOutputAbsolutePath}/".

		Function generateGqlQueryFiles() must be executed at least once before init() is invoked, to generate .gql query files and index from your schema. Did you run it?

		If you did and you specified a custom folder name, make sure you provide the "options" parameter to init(), and that "options.gqlGeneratorOutputFolder" is set to the correct folder.\n`, e);
	}

	try {
		manifestAbsolutePath = path.resolve(__dirname, configObj.manifestFile);
		delete require.cache[manifestAbsolutePath];
		manifest = require(configObj.manifestFile);
	} catch (e) {
		error(`FATAL: Error while attempting to load manifest file ${configObj.manifestFile}. (Absolute path: ${manifestAbsolutePath})`, e);
	}

	try {
		if (configObj.middlewaresFile) {
			middlewaresFileAbsolutePath = path.resolve(__dirname, configObj.middlewaresFile);
			middlewaresModule = require(configObj.middlewaresFile);
		}
	} catch (e) {
		middlewaresModule = null; // null, not undefined
		error(`FATAL: Error while attempting to load optional middlewaresFile file ${configObj.middlewaresFile}. (Absolute path: ${middlewaresFileAbsolutePath})`, e);
	}

	return { queryStrings, manifest, middlewaresModule };
};


module.exports = {
	readDefaultsConfigFile,
	validateConfig,
	loadDependencies
};
