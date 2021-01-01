/* * *
 *  Based on and cloned from timqian/gql-generator on github.com (https://github.com/modelo/gql-generator).
 *  -Extended by Roy Mor-
 * * */

const fs = require('fs');
const path = require('path');
const del = require('del');

const { getVarsToTypesStr, generateQuery, init } = require('./schemaParser.js');
const { initLogger, log, error } = require('../logging.js');

/* globals */
let indexJsExportAll = '';
let destDirPath;
let gqlSchema;
let depthLimit;


/**
 * Main entry point for scripts. Generates GQL files with fully exploded GraphQL queries basd on gqlSchemaObj.
 * @param gqlSchemaObj GraphQL schema object (of type GraphQLSchema)
 * @param destinationDirPath Path of folder where subfolders and GQL files will be created
 * @param [depthLimitArg] Optional recursion depth limit (default is 100)
 * @param [optionalWinstonLogger] Optional instance of winston logger to log to
 * @return {boolean} true if successful, false otherwise
 */
const generateGqlQueryFiles = (gqlSchemaObj, destinationDirPath, depthLimitArg = 100, optionalWinstonLogger = null) => {
	initLogger(optionalWinstonLogger);
	log('GQLGenerator initializing...');
	let success;
	destDirPath = destinationDirPath;
	gqlSchema = gqlSchemaObj;
	depthLimit = depthLimitArg;
	indexJsExportAll = '';

	if (!gqlSchema || typeof gqlSchema !== 'object' || Object.keys(gqlSchema).length === 0) {
		error('Missing or empty GraphQLSchema object. Aborting');

		return false;
	}
	if (!destDirPath) {
		error('Missing or invalid destination directory path (distDirPath). Aborting');

		return false;
	}

	if(!Number.isInteger(depthLimit) || Math.sign(depthLimit) === -1){
		error('Invalid depthLimitArg parameter. Aborting');

		return false;
	}

	log(`GQLGenerator initialized with query depthLimit of ${depthLimit}`);
	try {
		cleanAndCreateFolder(destDirPath);
	} catch (e) {
		error(`[gqlgenerator] Encountered error trying to create or clean destination folder ${destDirPath}. Aborting`);
		error(e);

		return false;
	}
	try {
		init(gqlSchema, depthLimit);
		generateQueries();
		generateMutations();
		generateSubscriptions();
		success = writeGqlIndexFile();
	} catch (e) {
		error('[gqlgenerator] Encountered error trying to generate GQL files for GraphQL operations. Aborting');
		error(e);

		return false;
	}

	if (success) {
		log('[gqlgenerator] Successfully created fully exploded GraphQL queries as GQL files based on the schema.');

		return true;
	}

	error('[gqlgenerator]: Encountered error while trying to generate GQL files index.');

	return false;
};


const cleanAndCreateFolder = (targetDirPath) => {
	del.sync(targetDirPath);
	path.resolve(targetDirPath).split(path.sep).reduce((before, cur) => {
		const pathTmp = path.join(before, cur + path.sep);
		if (!fs.existsSync(pathTmp)) {
			log(`[gqlgenerator] Creating folder ${pathTmp}`);
			fs.mkdirSync(pathTmp);
		}
		return path.join(before, cur + path.sep);
	}, '');
};


/**
 * Generate the query for the specified field
 * @param obj one of the root objects(Query, Mutation, Subscription)
 * @param description description of the current object
 */
const generateFile = (obj, description) => {
	let indexJs = 'const fs = require(\'fs\');\nconst path = require(\'path\');\n\n';
	let outputFolderName;

	switch (description) {
		case 'Mutation':
			outputFolderName = 'mutations';
			break;
		case 'Query':
			outputFolderName = 'queries';
			break;
		case 'Subscription':
			outputFolderName = 'subscriptions';
			break;
		default:
			log('[gqlgenerator warning]: description is required');
	}

	const writeFolder = path.join(destDirPath, `./${outputFolderName}`);

	fs.mkdirSync(writeFolder);

	Object.keys(obj).forEach((type) => {
		const queryResult = generateQuery(type, description);
		const varsToTypesStr = getVarsToTypesStr(queryResult.argumentsDict);
		let query = queryResult.queryStr;
		query = `${description.toLowerCase()} ${type}${varsToTypesStr ? `(${varsToTypesStr})` : ''}{\n${query}\n}`;
		fs.writeFileSync(path.join(writeFolder, `./${type}.gql`), query);
		indexJs += `module.exports.${type} = fs.readFileSync(path.join(__dirname, '${type}.gql'), 'utf8');\n`;
	});

	fs.writeFileSync(path.join(writeFolder, 'index.js'), indexJs);
	indexJsExportAll += `module.exports.${outputFolderName} = require('./${outputFolderName}');\n`;

	log(`Wrote to folder ${writeFolder}`);
};

const generateMutations = () => {
	if (gqlSchema.getMutationType()) {
		generateFile(gqlSchema.getMutationType().getFields(), 'Mutation');
	} else {
		log('[gqlgenerator warning]: No mutation type found in your schema');
	}
};

const generateQueries = () => {
	if (gqlSchema.getQueryType()) {
		generateFile(gqlSchema.getQueryType().getFields(), 'Query');
	} else {
		log('[gqlgenerator warning]: No query type found in your schema');
	}
};

const generateSubscriptions = () => {
	if (gqlSchema.getSubscriptionType()) {
		generateFile(gqlSchema.getSubscriptionType().getFields(), 'Subscription');
	} else {
		log('[gqlgenerator warning]: No subscription type found in your schema');
	}
};

const writeGqlIndexFile = () => {
	try {
		fs.writeFileSync(path.join(destDirPath, 'index.js'), indexJsExportAll);
	} catch (e) {
		error('[gqlgenerator ERROR]: failed attempting to write index.js for .gql files!');

		return false;
	}
	return true;
};

module.exports = { generateGqlQueryFiles };
