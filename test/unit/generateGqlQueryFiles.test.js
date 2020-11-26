const path = require('path');
const {	test } = require('mocha');
const chai = require('chai');
const chaifs = require('chai-fs');
const { expect } = chai;
const {	buildSchema } = require('graphql');

const schemaFile = require('../test-fixtures/schemas/basic-graphql-schema-1');
const schemaFileAdvanced = require('../test-fixtures/schemas/advanced-graphql-schema');
const GraphQL2REST = require('../../src/index');
const { loggerMock } = require('../mocks/logger');

const { clearEnv } = require('../testUtils');
const GQL_OUTPUT_FOLDER = path.resolve(__dirname, '../test-outputs/gqloutput');
const GQL_OUTPUT_FOLDER_ADVANCED_TESTS = path.resolve(__dirname, '../test-outputs/gqloutput_advanced');

chai.use(chaifs);

describe('generateGqlQueryFiles:', () => {

	const schema = buildSchema(schemaFile.schema);

	describe('path not exist', () => {
		expect(GQL_OUTPUT_FOLDER).to.not.be.a.path();
	})

	describe('invalid params', () => {

		test('gql schema is null', () => {
			const result = GraphQL2REST.generateGqlQueryFiles(null);

			expect(result).to.equal(false);
		});

		test('gql schema is undefined', () => {
			const result = GraphQL2REST.generateGqlQueryFiles(undefined);

			expect(result).to.equal(false);
		});

		test('gql schema is empty object', () => {
			const result = GraphQL2REST.generateGqlQueryFiles({});

			expect(result).to.equal(false);
		});

		test('gql schema is empty array', () => {
			const result = GraphQL2REST.generateGqlQueryFiles([]);

			expect(result).to.equal(false);
		});

		test('destination param is empty', () => {
			const result = GraphQL2REST.generateGqlQueryFiles(schema, '');

			expect(result).to.equal(false);
		});

		test('destination param is undefined', () => {
			const result = GraphQL2REST.generateGqlQueryFiles(schema, undefined, undefined, loggerMock);

			expect(result).to.equal(false);
		});

		test('destination param is null', () => {
			const result = GraphQL2REST.generateGqlQueryFiles(schema, null, undefined, loggerMock);

			expect(result).to.equal(false);
		});

		test('depth limit is null', () => {
			const result = GraphQL2REST.generateGqlQueryFiles(schema, GQL_OUTPUT_FOLDER, null);

			expect(result).to.equal(false);
		});

		test('depth limit is negative', () => {
			const result = GraphQL2REST.generateGqlQueryFiles(schema, GQL_OUTPUT_FOLDER, -100);

			expect(result).to.equal(false);
		});

		test('depth limit is empty string', () => {
			const result = GraphQL2REST.generateGqlQueryFiles(schema, GQL_OUTPUT_FOLDER, '');

			expect(result).to.equal(false);
		});
	})

	describe('generate gql query files', () => {
		before(() => prepareEnv(schema));

		after(() => clearEnv([GQL_OUTPUT_FOLDER, GQL_OUTPUT_FOLDER_ADVANCED_TESTS]));

		test('should generate successfully', () => {
			const result = GraphQL2REST.generateGqlQueryFiles(schema, GQL_OUTPUT_FOLDER, undefined, loggerMock);

			expect(result).to.equal(true);
		});

		test('should create path', () => {
			expect(GQL_OUTPUT_FOLDER).to.be.a.path();
		});

		test('should create directory', () => {
			expect(GQL_OUTPUT_FOLDER).to.be.a.directory();
		});

		test('should create sub directories', () => {
			expect(GQL_OUTPUT_FOLDER).to.be.a.directory().with.subDirs(['queries', 'mutations']);
		});

		test('should create index.js inside queries folder', () => {
			expect(`${GQL_OUTPUT_FOLDER}/queries/index.js`).to.be.a.file();
		});

		test('should create index.js inside mutations folder', () => {
			expect(`${GQL_OUTPUT_FOLDER}/mutations/index.js`).to.be.a.file();
		});

		test('sanity validation of generated queries', () => {
			GraphQL2REST.generateGqlQueryFiles(buildSchema(schemaFileAdvanced.schema), GQL_OUTPUT_FOLDER_ADVANCED_TESTS, undefined, loggerMock);

			const queries = require(GQL_OUTPUT_FOLDER_ADVANCED_TESTS);

			expect(queries.mutations.signin.indexOf('signin')).to.not.equal(-1);
		});
	})

});

const prepareEnv = (schema) => {
	clearEnv([GQL_OUTPUT_FOLDER, GQL_OUTPUT_FOLDER_ADVANCED_TESTS]);
	GraphQL2REST.generateGqlQueryFiles(schema,
		GQL_OUTPUT_FOLDER, undefined, loggerMock);
}


