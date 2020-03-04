/* REST middleware. Makes some changes to the request parameters before passing it to GraphQL */
const changeIncomingParams = (req, route, verb, operation) => {
	req.params = {
		first: 'Touched by GraphQL2REST middleware!',
		second: 'Touched by GraphQL2REST middleware!'
	};

	req.body = {
		message: 'Touched by GraphQL2REST middleware!',
		verb,
		route,
		operation
	};

	return req;
};

module.exports = {
	changeIncomingParams
};
