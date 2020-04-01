const dot = require('dot-object');
const consts = require('./consts.js');

module.exports = (errorMap, config) => {
	/* Determines if the response from GraphQL is a definitive error.

	   A response is deemed an error response iff ONE of the following conditions is met:
	   1. errors array exists AND data object is undefined, null or empty, OR:
	   2. errors array exists AND data object exists and all keys in the data object are undefined or null */
	const isError = (response) => {
		if (!response.data && response.errors) return true;
		if (response.data && response.errors) {
			let allNull = true;
			if (Object.keys(response.data).length === 0) return true;
			for (const key in response.data) {
				if (response.data[key] !== null && response.data[key] !== undefined) allNull = false;
			}
			if (allNull) return true;
		}
		return false;
	};


	/* Returns corresponding HTTP status code based on the error map, or null if there is no mapping */
	const getErrorCode = (response) => {
		const errorCodePath = config.graphqlErrorCodeObjPath || consts.DEFAULT_ERROR_CODE_PATH;
		if (!response
			|| !errorMap
			|| !errorMap.errorCodes
			|| Object.keys(errorMap.errorCodes).length === 0) return null;
		const gqlErrorCode = dot.pick(errorCodePath, response);
		if (gqlErrorCode === undefined) return null;
		const errorFound = errorMap.errorCodes[gqlErrorCode];
		return errorFound && errorFound.httpCode ? errorFound.httpCode : null;
	};


	/* Adds custom error string to the first error */
	const attachCustomErrorDescription = (response) => {
		const errorCodePath = config.graphqlErrorCodeObjPath || consts.DEFAULT_ERROR_CODE_PATH;
		const gqlErrorCode = dot.pick(errorCodePath, response);
		if (response && response.errors && response.errors[0] && gqlErrorCode !== undefined) {
			if (errorMap && errorMap.errorCodes && errorMap.errorCodes[gqlErrorCode]) {
				const description = errorMap.errorCodes[gqlErrorCode].errorDescription;
				if (description) {
					response.errors[0].errorDescription = description;
				}
			}
		}
		return response;
	};


	return {
		isError,
		getErrorCode,
		attachCustomErrorDescription
	};
};
