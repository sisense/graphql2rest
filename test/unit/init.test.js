const path = require('path');
const {test} = require('mocha');
const chai = require('chai');
const chaifs = require('chai-fs');
const {expect} = chai;
const express = require('express');
const {buildSchema} = require('graphql');

const schemaFile = require('../test-fixtures/schemas/basic-graphql-schema-1');
const GraphQL2REST = require('../../src/index');
const {
	loggerMock,
	getLastConsolePrint,
	getConsoleBuffer
} = require('../mocks/logger');
const {execute} = require('../mocks/graphql');
const { clearEnv, prepareEnv } = require('../testUtils')

const GQL_OUTPUT_FOLDER = path.resolve(__dirname, '../test-outputs/gqloutput');

chai.use(chaifs);

describe('init router:', () => {
	const options = {
		logger: loggerMock,
		gqlGeneratorOutputFolder: GQL_OUTPUT_FOLDER,
		manifestFile: '../test/test-fixtures/manifests/basicManifest1.json',
		apiPrefix: '/testApp/v1',
		middlewaresFile: '../test/test-fixtures/middleware/request-middleware.js'
	};
	const schema = buildSchema(schemaFile.schema);

	before(() => prepareEnv(schema, GQL_OUTPUT_FOLDER));

	after(() => clearEnv([GQL_OUTPUT_FOLDER]));

	describe('success create router', () => {
		let restRouter;

		test('init returns a non null value', () => {
			restRouter = GraphQL2REST.init(schema, execute, options);

			expect(restRouter).to.not.equal(null);
			expect(restRouter).to.not.equal(undefined);
		});

		test('init returns an instance of Express router', () => {
			expect(Object.getPrototypeOf(restRouter)).to.equal(express.Router);
		});

		test('route for GET operation is created (logged appropriately)', () => {
			expect(getConsoleBuffer().toLowerCase()).to.include('Adding endpoint GET /testApp/v1/api/tweets/:id'.toLowerCase());
		});

		test('route for DELETE operation is created (logged appropriately)', () => {
			expect(getConsoleBuffer().toLowerCase()).to.include('Adding endpoint DELETE /testApp/v1/api/tweets/:id'.toLowerCase());
		});

		test('route for POST operation is created (logged appropriately)', () => {
			expect(getConsoleBuffer().toLowerCase()).to.include('Adding endpoint POST /testApp/v1/api/tweets'.toLowerCase());
		});

		test('route for additional GET operation is created (logged appropriately)', () => {
			expect(getConsoleBuffer().toLowerCase()).to.include('Adding endpoint GET /testApp/v1/api/notifications'.toLowerCase());
		});

		test('route for PATCH operation is created (logged appropriately)', () => {
			expect(getConsoleBuffer().toLowerCase()).to.include('Adding endpoint PATCH /testApp/v1/api/tweets/:id'.toLowerCase());
		});

		test('route for operation with invalid HTTP method in manifest is not created', () => {
			expect(getConsoleBuffer().toLowerCase()).not.to.include('/api/bad-endpoint'.toLowerCase());
		});

		test('route for operation not in schema is not created (logged appropriately)', () => {
			expect(getConsoleBuffer().toLowerCase()).to.include('nonExistentOperation is not found - cannot add endpoint PATCH for /testApp/v1/api/no-endpoint-should-be-created-here. Skipping this route.'.toLowerCase());
		});
	});

	describe('optional params', () => {
		const customFormatDataFn = (response) => {
			if (!response || typeof response !== 'object') return 'error: response is not an object';
			return {
				title: response.data.title.toUpperCase(),
				queryStrReceived: response.data.queryStrReceived,
				vars: response.data.vars
			};
		};

		const customFormatErrorFn = (response) => {
			if (!response || typeof response !== 'object') return 'error: response is not an object';
			return {
				error: response.errors[0].message.toUpperCase()
			};
		};

		test('init with custom parse function returns a non null value', () => {
			const restRouter = GraphQL2REST.init(schema, execute, options, customFormatErrorFn, customFormatDataFn);

			expect(Object.getPrototypeOf(restRouter)).to.equal(express.Router);
		});

	});

	describe('invalid params', () => {
		test('init with no execute function returns null and logs appropriate error', () => {
			const restRouter = GraphQL2REST.init(schema, {}, options);

			expect(restRouter).to.equal(null);

			expect(getLastConsolePrint().toLowerCase()).to.include('The GraphQL execution function provided, executeFn, is not a function. Aborting.'.toLowerCase());
		});

		test('init with undefined schema function returns null and logs appropriate error', () => {
			const restRouter = GraphQL2REST.init(undefined, execute, options);

			expect(restRouter).to.equal(null);

			expect(getLastConsolePrint().toLowerCase()).to.include('schema object is required but missing. Aborting'.toLowerCase());
		});

		test('init with missing manifest file returns null', () => {
			const restRouter = GraphQL2REST.init(schema, execute, {
				...options,
				manifestFile: '../test/test-fixtures/manifests/_nonExistentManifest_.json'
			});

			expect(restRouter).to.equal(null);
		});

		test('init with missing gql generator output folder returns null', () => {
			loggerMock.supressErrorLevel = true;
			const restRouter = GraphQL2REST.init(schema, execute, {
				...options,
				gqlGeneratorOutputFolder: '../test/test-fixtures/_nonExistentFolder_'
			});

			expect(restRouter).to.equal(null);

			loggerMock.supressErrorLevel = false;
		});

		test('optional params: init with formatDataError parameter which is not a function returns null and logs appropriate error message', () => {
			const restRouter = GraphQL2REST.init(schema, execute, options, {});

			expect(restRouter).to.equal(null);

			expect(getLastConsolePrint().toLowerCase()).to.include('formatErrorFn function provided is not a function'.toLowerCase());
		});

		test('optional params: init with formatDataFn parameter which is not a function returns null and logs appropriate error message', () => {
			const restRouter = GraphQL2REST.init(schema, execute, options, undefined, {});

			expect(restRouter).to.equal(null);

			expect(getLastConsolePrint().toLowerCase()).to.include('formatDataFn function provided is not a function'.toLowerCase());
		});
	});
});


