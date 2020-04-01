const express = require('express');
const formatPath = require('url-join');
const pickDeep = require('lodash-pickdeep');
const cloneDeep = require('lodash.clonedeep');
const omit = require('lodash.omit');
const httpStatuses = require('http-status-codes');
const objectPath = require('object-path');
const dot = require('dot-object');

const mingo = require('mingo');
const jmespath = require('jmespath');
const gql = require('graphql-tag');

const { readDefaultsConfigFile, validateConfig, loadDependencies } = require('./setup');
const { stripResponseData, defaultFormatErrorFn } = require('./formatters');
const { initLogger, log, debug, error } = require('./logging.js');
const { pretty, isArrayWithEmptyObjs } = require('./common.js');
const errorHandling = require('./errorHandling');
const consts = require('./consts.js');

const expressRouter = express.Router();

/* * * * * Globals * * * */

// execution and parsing functions
const funcs = {
	formatErrorFn: defaultFormatErrorFn,
	formatDataFn: stripResponseData
};
let config; // global configuration object
let errorMap; // maps GraphQL error codes to HTTP status codes
let errHandler; // object with API error handling functions
let middlewares; // optional user-provided .js module with middleware functions

/* * * * * * * * * * * * *
 *   Public Functions    *
 * * * * * * * * * * * * */

/**
 * Initialize the GraphQL2REST wrapper. Reads the manifest file and maps GraphQL operations to REST endpoints.
 *
 * @param {Object} schemaObj - GraphQL schema object (of type GraphQLSchema)
 * @param {function} executeFn - GraphQL execution function; receives {query, variables, context} and executes the GraphQL operation it describes
 * @param {Object} options - Options object which describes various optional settings. If undefined, init will fallback to default definitions.
 * @param {function} [formatErrorFn] - Optional function to custom format the returned GraphQL error string, upon error
 * @param {function} [formatDataFn] - Optional function to custom format the returned GraphQL response data (if not provided, strips encapsulating data object and removes errors)
 * @param {function} [router] - Optional express.Router() instance to attach new routes to (if not provided, a new Express instance will be returned)
 *
 * @returns {Router} An instance of express.Router() function with new REST routes. Returns null if initialization failed.
 *
 * options object may define fields such as: apiPrefix, manifestFile, filterFieldsName, logger, gqlGeneratorOutputFolder and more.
 * If not provided or partially defined, defaults.json file will be used to populate missing fields.
 *
 * Any (optional) paths in the options object are relative to this source file. Use path.resolve() for different relative root.
 *
 * @example
 * 	const restRouter = init(schema, apolloFetchExecute, { apiPrefix: '/api/v1' });
 *
 * @example
 *  const restRouter = init(
 * 		schema,
 * 		execute,
 * 		{ apiPrefix: '/api/v3', gqlGeneratorOutputFolder: './gql-output/', manifestFile: './manifest.json' });
 **/

const init = (
	schemaObj,
	executeFn,
	options,
	formatErrorFn = funcs.formatErrorFn,
	formatDataFn = funcs.formatDataFn,
	router = expressRouter
) => {
	initLogger(options && options.logger);

	const configFileObj = readDefaultsConfigFile();
	if (!configFileObj) {
		if (!options) {
			error('init: error reading config file and no options object provided. Aborting initialization.');
			return null;
		}
	}

	config = {
		...configFileObj,
		...options
	}; // options override configFileObj defaults, should always come last

	// populate global custom functions object
	funcs.formatErrorFn = formatErrorFn;
	funcs.formatDataFn = formatDataFn;
	funcs.executeFn = executeFn;

	if (!validateConfig(config, funcs)) return null;

	const { manifest, queryStrings, middlewaresModule } = loadDependencies(config);
	if (!manifest || !queryStrings) return null;

	if (!schemaObj) {
		error('init: schema object is required but missing. Aborting initialization.');
		return null;
	}

	if (!manifest.endpoints) {
		error('init: cannot find "endpoints" object in manifest json file.');
		return null;
	}

	if (middlewaresModule === null) {
		error('init: optional middlewaresFile was specified but cannot be loaded.');
		return null;
	}

	const legend = manifest.endpoints;
	errorMap = manifest.errors;
	config.queryStrings = queryStrings;
	middlewares = middlewaresModule;
	errHandler = errorHandling(errorMap, config);

	Object.keys(legend).forEach(apipath => parseManifestEndpoints(legend[apipath], apipath, router));

	return router;
};


/* * * * * * * * * * * * *
 *   Private Functions   *
 * * * * * * * * * * * * */

/* Replaces original parameter names with custom parameter names */
const replaceParams = (queryString, params) => {
	let modifiedStr = queryString;
	Object.keys(params).forEach((key) => {
		/* eslint-disable prefer-template */
		const replacement = '\\$' + key;
		modifiedStr = modifiedStr.replace(new RegExp(replacement, 'g'), '$' + params[key]);
	});
	return modifiedStr;
	/* eslint-enable prefer-template */
};


/* Deletes REST parameters marked for deletion, so that they will not be sent by the GraphQL layer (ignored) */
const omitDeletedParams = (paramsToDelete, requestParameters) => {
	Object.keys(paramsToDelete).forEach((key) => {
		if (paramsToDelete[key] === '__DELETED__') {
			objectPath.del(requestParameters, key);
			log(`Parameter ${key} was marked for deletion and removed from the call to GraphQL operation.`);
		}
	});
};

/* Verifies that operations referred to in the manifest actually exist in the GraphQL schema */
const validateGqlOperations = ({ operations, verb, route }) => {
	const { queryStrings } = config;

	for (const item of operations) {
		const { operation } = item;

		const queryString = (queryStrings.queries && queryStrings.queries[operation])
			|| (queryStrings.mutations && queryStrings.mutations[operation]);

		if (!queryString) {
			error(`GraphQL operation ${operation} is not found - cannot add endpoint ${verb} for ${route}. Skipping this route.`);
			return false;
		}

		if (item.requestMiddlewareFunction) {
			if (!middlewares || !middlewares[item.requestMiddlewareFunction]) {
				error(`Middleware function ${item.requestMiddlewareFunction} is specified for endpoint ${verb} ${route} but cannot be found in middlewares file. Skipping this route.`);
				return false;
			}
			if (typeof middlewares[item.requestMiddlewareFunction] !== 'function') {
				error(`Middleware ${item.requestMiddlewareFunction} provided for ${verb} ${route} is not a function. Skipping this route.`);
				return false;
			}
		}
	}
	return true;
};

/* Remove user specified fields from final response (as indicated in the manifest) */
const hideFields = (response, hiddenFieldsArray) => {
	if (!hiddenFieldsArray || !Array.isArray(hiddenFieldsArray) || hiddenFieldsArray.length === 0) return response;
	log(`Hiding requested fields from response. Removed the following fields from response: ${hiddenFieldsArray}`);
	if (typeof response === 'object' && (!Array.isArray(response))) return omit(response, hiddenFieldsArray);
	// else response is an array. if it has objects, remove the fields from all those objects:
	return response.map((element) => {
		if (typeof element === 'object') {
			return omit(element, hiddenFieldsArray);
		}
		return element;
	});
};

/* Filters formatted response based on request query parameter */
const filterResponse = (response, request, filterFieldName) => {
	if (!request.query || !request.query[filterFieldName]) return response;
	const filterQuery = request.query[filterFieldName];

	if (filterQuery.trim().startsWith(':')) {
		response = applyJmesPathFilter(response, filterQuery.trim().substring(1));
	} else {
		const responseFilter = filterQuery.split(',').map(field => field.trim());
		if (responseFilter && responseFilter.length > 0 && response && Object.keys(response).length > 0) {
			if (typeof response === 'object' && (!Array.isArray(response))) {
				response = pickDeep(response, responseFilter);
			} else {
				// response is an array. if it has objects, filter on the fields from all those objects:
				response = response.map((element) => {
					if (typeof element === 'object') {
						return pickDeep(element, responseFilter);
					}
					return element;
				});
				if (isArrayWithEmptyObjs(response)) response = [];
			}
			debug('Response filtered on: ', responseFilter);
		}
	}
	return response;
};

/* Applies JMESPath filter (www.jmespath.org) on JSON response */
const applyJmesPathFilter = (response, jmespathExpression) => {
	const emptyResponse = Array.isArray(response) ? [] : {}; // JMESPath may return null, but that is not valid JSON
	try {
		response = jmespath.search(response, jmespathExpression) || emptyResponse;
		debug('Response filtered on JMESPath expression: ', jmespathExpression);
	} catch (e) {
		response = emptyResponse;
		error(`JMESPath filter failed parsing expression: "${jmespathExpression}. Returning empty object or array."`);
		error(e);
	}
	return response;
};

/* Copies provided body, query, params into the request. Used to reset request between action iterations */
const resetRequestChanges = ({ req, body, query, params }) => {
	req.body = cloneDeep(body);
	req.query = cloneDeep(query);
	req.params = cloneDeep(params);
	return req;
};

/* Wraps request body object with a custom property. Supports nested properties expressed as dot separated strings */
const wrapRequestBodyWithProperty = (request, property) => {
	if (property === undefined || property === null || String(property).trim().length === 0) return request;
	if (!request || !request.body) return request;
	debug(`Wrapping request body with property "${property}" before sending to GraphQL execute function.`);
	property = String(property).trim();
	const newRequestBody = {};
	dot.str(property, request.body, newRequestBody); // data.text.moreText => "data: { text: { moreText: { body } } } }"
	request.body = newRequestBody;
	return request;
};

/* Generates REST endpoint and adds it to Express router */
const addRestEndpoint = ({ action, router }) => {
	try {
		const route = formatPath(config.apiPrefix, action.path);
		const verbInCaps = action.verb.toUpperCase();
		log(`==> Adding endpoint ${verbInCaps} ${route}`);
		if (!validateGqlOperations({ operations: action.operations, verb: verbInCaps, route })) return;

		router[action.verb](route, async (req, res) => {
			debug(`REST router was invoked: route ${verbInCaps} ${route}`);
			debug(`Actual path: ${req.path}`);
			const statusCode = (action.successStatusCode && Number.isInteger(action.successStatusCode))
				? action.successStatusCode : consts.SUCCESS_STATUS_CODE;
			let lastOperation = false;
			const originalBody = cloneDeep(req.body);
			const originalQuery = cloneDeep(req.query);
			const originalParams = cloneDeep(req.params);
			if (!req.body) log(`warning: req.body is undefined (for invoked REST call on ${route})`);

			let allParams;

			action.operations.forEach(async (operation) => {
				try {
					req = resetRequestChanges({ req, body: originalBody, query: originalQuery, params: originalParams });
					if (operation.successStatusCode) debug('Warning: "successStatusCode" is an attribute of action, not operation, in the manifest. Detected "operation.successStatusCode" or "operations[].successStatusCode" field in the manifest - it will be ignored.');
					const { queryStrings } = config;
					// Assuming uniqueness between queries and mutations (GraphQL spec doesn't allow two type definitions with the same name)
					let queryString = queryStrings.queries[operation.operation] || queryStrings.mutations[operation.operation];

					if (operation.requestMiddlewareFunction) {
						req = middlewares[operation.requestMiddlewareFunction](req, route, verbInCaps, operation.operation);
						if (!req || typeof req !== 'object') throw new Error('Server Error: invalid request: request middleware malformed request.');
					}
					if (operation.params && req.body) omitDeletedParams(operation.params, req.body);

					allParams = { ...req.params, ...req.query, ...req.body }; // order is important: body params override query params which override path params

					if (operation.params) {
						queryString = replaceParams(queryString, operation.params);
					}

					let isExecuteOperation = true;
					if (operation.condition) {
						isExecuteOperation = new mingo.Query(operation.condition).test(allParams);
						if (!isExecuteOperation) debug(`Action did not satisfy condition test: ${pretty(operation.condition)} so not invoking operation ${operation.operation}`); // if last operation send()/return
					}

					if (isExecuteOperation && operation.wrapRequestBodyWith) {
						req = wrapRequestBodyWithProperty(req, operation.wrapRequestBodyWith);
						allParams = { ...req.params, ...req.query, ...req.body }; // refresh with body change
					}

					if (isExecuteOperation) {
						await executeOperation({ req, res, queryString, allParams, statusCode, hiddenFields: operation.hide, operationName: operation.operation });
					}

				} catch (e) {
					// some unhandled error within forEach loop occurred, error response cannot be sent
					error('Encountered error in execution chain:');
					error(e);
				}
			}); // end forEach
		}); // end express callback (async (req, res))
	} catch (e) {
		// express or other error
		error(e);
	}
};

/* Operation invoker, called by Express callback function created by addRestEndpoint() */
const executeOperation = async ({ req, res, queryString, allParams, statusCode, hiddenFields, operationName }) => {
	let response;
	let isErrorResponse = false;
	debug(`Executing "${queryString.substring(0, 100).replace(/(\r\n|\n|\r)/gm, '')}..." with parameters:`);
	debug(pretty(allParams));

	try {
		response = await funcs.executeFn({
			query: gql(queryString),
			variables: allParams,
			context: {
				headers: req.headers,
				restRequest: req
			},
			operationName
		});

		debug('[Original (unformatted and unfiltered) response from GraphQL]:');
		debug(pretty(response));

		if (response === undefined) throw new Error('Server Error: response is undefined');
		if (typeof response !== 'object') throw new Error('Server Error: response is not an object');

		if (errHandler.isError(response)) {
			debug('GraphQL response contains error.');
			statusCode = errHandler.getErrorCode(response) || consts.CLIENT_ERROR_CODE;
			isErrorResponse = true;
			response = errHandler.attachCustomErrorDescription(response);
		}
	} catch (e) {
		// Workaround for apollo-link which may throw legitimate client errors as exceptions
		if (e.result && e.result.errors && Array.isArray(e.result.errors)) {
			response = { errors: e.result.errors };
			debug('GraphQL response contains error.');
			statusCode = errHandler.getErrorCode(response) || consts.CLIENT_ERROR_CODE;
			isErrorResponse = true;
			response = errHandler.attachCustomErrorDescription(response);
		} else {
			// GraphQL server error
			error(e);
			statusCode = errHandler.getErrorCode(response) || consts.SERVER_ERROR_CODE;
			if (Object.values(httpStatuses).includes(statusCode)) res.status(statusCode);
			else res.status(consts.SERVER_ERROR_CODE);
			res.send(consts.INTERNAL_SERVER_ERROR_FORMATTED);
			return;
		}
	}

	// If we reached here there is no server error (only valid GraphQL response)
	if (!Object.values(httpStatuses).includes(statusCode)) statusCode = consts.SUCCESS_STATUS_CODE;
	res.status(statusCode);
	if (!isErrorResponse) {
		response = funcs.formatDataFn(response);
		response = hideFields(response, hiddenFields);
		response = filterResponse(response, req, config.filterFieldName);
	} else {
		delete response.data;
		response = funcs.formatErrorFn(response, statusCode);
	}
	debug(`Returning HTTP status code ${statusCode}`);
	res.send(response);
};


/* Parses and normalizes endpoints and associated actions from manifest file */
const parseManifestEndpoints = (endpointObj, apipath, router) => {
	if (!endpointObj || !apipath) return;
	apipath = apipath.trim();
	consts.HTTP_VERBS.forEach((httpMethod) => {
		if (endpointObj[httpMethod]) {
			let action = endpointObj[httpMethod];
			if (!action.operations && !action.operation) return;
			if (action.operations && action.operation) {
				error(`manifest file: endpoint action has both "operation" (string) and "operations" (array) fields - only one is allowed.\nSkipping endpoint ${httpMethod.toUpperCase()} ${apipath}`);
				return;
			}
			if (action.operation) { // single operation mode detected - convert it to array ("multi-operation" mode)
				action.operations = [];
				action.operations.push({
					operation: action.operation,
					params: action.params,
					condition: action.condition,
					onFail: action.onFail,
					hide: action.hide,
					wrapRequestBodyWith: action.wrapRequestBodyWith,
					requestMiddlewareFunction: action.requestMiddlewareFunction
				});
				action = omit(action, ['operation', 'params', 'condition', 'onFail', 'hide', 'wrapRequestBodyWith', 'requestMiddlewareFunction']);
			} else if (!Array.isArray(action.operations) || action.operations.length === 0 || !action.operations[0].operation) {
				return;
			}
			action.verb = httpMethod;
			action.path = apipath;
			addRestEndpoint({ action, router });
		}
	});
};


module.exports = { init };
