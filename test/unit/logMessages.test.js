const path = require('path');
const {	test } = require('mocha');
const chai = require('chai');
const chaifs = require('chai-fs');
const { expect } = chai;
const {	buildSchema } = require('graphql');

const schemaFile = require('../test-fixtures/schemas/basic-graphql-schema-1');
const GraphQL2REST = require('../../src/index');
const {
	loggerMock,
	getLastConsolePrint,
} = require('../mocks/logger');
const { execute } = require('../mocks/graphql');
const GQL_OUTPUT_FOLDER = path.resolve(__dirname, '../test-outputs/gqloutput');
const { noop, clearEnv, getOptions } = require('../testUtils')

chai.use(chaifs);

describe('log messages:', () => {
	const schema = buildSchema(schemaFile.schema);

	after(() => clearEnv(GQL_OUTPUT_FOLDER));

	describe('generateGqlQueryFiles', () => {
		describe('log errors', () => {
			test('invalid gql schema param', () => {
				GraphQL2REST.generateGqlQueryFiles(null, GQL_OUTPUT_FOLDER, 12,loggerMock);

				expect(getLastConsolePrint().toLowerCase()).to.include('error: missing or empty graphqlschema object. aborting ');
			});

			test('invalid destination param', () => {
				GraphQL2REST.generateGqlQueryFiles(schema, '' , 12, loggerMock);

				expect(getLastConsolePrint().toLowerCase()).to.include('error: missing or invalid destination directory path (distdirpath). aborting ');
			});

			test('invalid depth limit param', () => {
				GraphQL2REST.generateGqlQueryFiles(schema, GQL_OUTPUT_FOLDER, null, loggerMock);

				expect(getLastConsolePrint().toLowerCase()).to.include('error: invalid depthlimitarg parameter. aborting ');
			});
		})

		describe('log success', () => {
			test('should generate successfully', () => {
				GraphQL2REST.generateGqlQueryFiles(schema, GQL_OUTPUT_FOLDER, 100, loggerMock);

				expect(getLastConsolePrint().toLowerCase()).to.include('info: [gqlgenerator] successfully created fully exploded graphql queries as gql files based on the schema. ');
			});
		})
	})

	describe('init', () => {
		const formatErrorFn = noop;
		const formatDataFn = noop;

		describe('log errors', () => {
			before(() => {
				clearEnv(GQL_OUTPUT_FOLDER);
				GraphQL2REST.generateGqlQueryFiles(schema, GQL_OUTPUT_FOLDER, 100, loggerMock);
			});

			test('schema obj is null', () => {
				GraphQL2REST.init(null, execute, getOptions(GQL_OUTPUT_FOLDER), formatErrorFn, formatDataFn);

				expect(getLastConsolePrint().toLowerCase()).to.include('error: init: schema object is required but missing. aborting initialization. ');
			});

			test('execute param is null', () => {
				GraphQL2REST.init(schema, null, getOptions(GQL_OUTPUT_FOLDER));

				expect(getLastConsolePrint().toLowerCase()).to.include('error: init: fatal: the graphql execution function provided, executefn, is not a function. aborting. ');
			});
		})
	})
});
