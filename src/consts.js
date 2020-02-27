const appConstants = {
	CLIENT_ERROR_CODE: 400,
	SERVER_ERROR_CODE: 500,
	SUCCESS_STATUS_CODE: 200,
	CONFIG_FILE: '../config/defaults.json',
	HTTP_VERBS: ['get', 'post', 'patch', 'delete', 'put'],
	DEFAULT_ERROR_CODE_PATH: 'errors[0].extensions.code',

	CONFIG_REQUIRED_OPTIONS: ['apiPrefix', 'gqlGeneratorOutputFolder', 'manifestFile', 'filterFieldName'],

	INTERNAL_SERVER_ERROR_FORMATTED: {
		errors: [{
			error: {
				message: 'Internal Server Error',
				name: 'X-InternalServerError',
			}
		}]
	}
};

module.exports = Object.freeze(appConstants);
