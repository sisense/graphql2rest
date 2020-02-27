/* Default error formatting is no formatting (identity function). Configurable by user when invoking init() */
const defaultFormatErrorFn = errorString => errorString;

/* Default data formatting function, when the response is not deemed an erroneous response. In such case errors also are omitted,
   as they are considered "warnings only" (since there is nonempty data). */
const stripResponseData = (response) => {
	if (!response || !response.data || response.data === {}) return {};
	const keys = Object.keys(response.data);
	if (keys.length === 0) return {};
	if (keys.length === 1) {
		const result = response.data[keys[0]];
		if (typeof result !== 'object' && !Array.isArray(result)) return response.data;
		return result;
	}
	const responseObj = {};
	keys.forEach((key) => {
		responseObj[key] = response.data[key];
	});
	return responseObj;
};

module.exports = { defaultFormatErrorFn, stripResponseData };
