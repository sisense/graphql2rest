const {
	ERROR_WITH_DATA,
	ERROR_STRING_MULTIPLE,
	ERROR_STRING_SINGLE
} = require('./errorStrings');

const execute = ({
	query,
	variables,
	context
}) => {
	console.log('-- Fake-GraphQL mock execute() function called -- ');
	if (variables && variables.emitError) {
		return emitError(variables.emitError, variables.isErrorWithData);
	}

	if (variables && variables.returnArrayResponse) {
		return {
			data: {
				results: [{
					oid: '1',
					title: 'The Best Result Ever #1',
					elements: ['element1', 'element2'],
					subObj: {
						subObjId: 500
					}
				},
				{
					oid: '2',
					title: 'The Best Result Ever #2',
					elements: ['element1', 'element2'],
					subObj: {
						subObjId: 501
					}
				}
				]
			}
		};
	}

	return {
		data: {
			oid: '0123-45687',
			title: 'The Best Result Ever',
			active: true,
			queryStrReceived: query,
			restRequest: context && context.restRequest,
			vars: variables,
			elements: ['element1', 'element2']
		}
	};
};

const emitError = (graphqlErrorCode, isErrorWithData) => {
	if (isErrorWithData) return JSON.parse(ERROR_WITH_DATA);
	if (graphqlErrorCode === 4003) return JSON.parse(ERROR_STRING_SINGLE);
	return JSON.parse(ERROR_STRING_MULTIPLE);
};


module.exports = {
	execute
};
