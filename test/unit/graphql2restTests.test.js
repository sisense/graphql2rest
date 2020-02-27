const path = require('path');
const {	test } = require('mocha');
const chai = require('chai');
const chaifs = require('chai-fs');

const { expect } = chai;

const express = require('express');
const rmwareHttpMock = require('run-middleware');
const {	buildSchema } = require('graphql');

const del = require('del');
const schemaFile = require('../test-fixtures/schemas/basic-graphql-schema-1');
const schemaFileAdvanced = require('../test-fixtures/schemas/advanced-graphql-schema');
const GraphQL2REST = require('../../src/index');

const {
	loggerMock,
	clearBuffer,
	getLastConsolePrint,
	clearLastConsolePrint,
	getConsoleBuffer,
} = require('../mocks/logger');

const { execute } = require('../mocks/graphql');

// warning: these temp folders will be deleted entirely:
const GQL_OUTPUT_FOLDER = path.resolve(__dirname, '../test-outputs/gqloutput');
const GQL_OUTPUT_FOLDER_ADVANCED_TESTS = path.resolve(__dirname, '../test-outputs/gqloutput_advanced');

chai.use(chaifs);


/** * GenerateGqlQueryFiles Tests ***/

describe('generateGqlQueryFiles basic file creation tests:', () => {
	let schema;
	const g = GraphQL2REST;
	const outputPath = GQL_OUTPUT_FOLDER;

	before(() => {
		schema = buildSchema(schemaFile.schema);
		del.sync(outputPath);
		expect(outputPath).to.not.be.a.path();
		clearLastConsolePrint();
		clearBuffer();
	});

	after(() => {
		del.sync(outputPath);
		clearBuffer();
	});

	test('successfully reads basic graphql schema and returns true', () => {
		const result = g.generateGqlQueryFiles(schema, outputPath, undefined, loggerMock);
		expect(result).to.equal(true);
	});

	test('displays or logs a success message', () => {
		expect(getLastConsolePrint().toLowerCase()).to.include('successfully created');
	});

	test('creates gql folder with queries and mutations subdirs', () => {
		expect(outputPath).to.be.a.path();
		expect(outputPath).to.be.a.directory();
		expect(outputPath).to.be.a.directory().with.subDirs(['queries', 'mutations']);
	});

	test('index.js is created inside queries folder', () => {
		expect(`${outputPath}/queries/index.js`).to.be.a.file();
	});

	test('index.js is created inside mutations folder', () => {
		expect(`${outputPath}/mutations/index.js`).to.be.a.file();
	});
});


describe('generateGqlQueryFiles advanced schema parsing validation:', () => {
	let schema;
	const g = GraphQL2REST;
	const outputPath = GQL_OUTPUT_FOLDER_ADVANCED_TESTS;

	before(() => {
		schema = buildSchema(schemaFileAdvanced.schema);
		del.sync(outputPath);
		clearLastConsolePrint();
		clearBuffer();
	});

	after(() => {
		del.sync(outputPath);
		clearBuffer();
	});

	test('sanity validation of generated queries', () => {
		const result = g.generateGqlQueryFiles(schema, outputPath, undefined, loggerMock);
		expect(result).to.equal(true);
		const queries = require(outputPath);
		expect(queries.mutations.signin.indexOf('signin')).to.not.equal(-1);
	});

	test('limit depth', () => {
		/* TODO: investigate depth issue; currently rarely used. */
		/* const result = g.generateGqlQueryFiles(schema, outputPath, 1, loggerMock);
		expect(result).to.equal(true);
		const queries = require(outputPath);
		expect(queries.mutations.signup.indexOf('createdAt')).to.equal(-1); */
	});
});


describe('generateGqlQueryFiles negative and error inducing tests:', () => {
	let schema;
	const g = GraphQL2REST;
	const outputPath = GQL_OUTPUT_FOLDER_ADVANCED_TESTS;

	before(() => {
		schema = buildSchema(schemaFileAdvanced.schema);
	});

	after(() => {
		clearBuffer();
	});

	test('invoking with empty schema returns false', () => {
		const result = g.generateGqlQueryFiles({}, outputPath, undefined, loggerMock);
		expect(result).to.equal(false);
	});

	test('invoking without a destination folder returns false', () => {
		const result = g.generateGqlQueryFiles(schema, undefined, undefined, loggerMock);
		expect(result).to.equal(false);
	});
});


/** * GraphQL2REST Router Tests ***/

describe('GraphQL2REST router tests:', () => {
	let restRouter;
	const outputPath = GQL_OUTPUT_FOLDER;

	describe('init() router basic positive tests', () => {
		let schema;
		const g = GraphQL2REST;
		const options = {
			logger: loggerMock,
			gqlGeneratorOutputFolder: outputPath,
			manifestFile: '../test/test-fixtures/manifests/basicManifest1.json',
			apiPrefix: '/testApp/v1'
		};

		before(() => {
			schema = buildSchema(schemaFile.schema);
			del.sync(outputPath);
			g.generateGqlQueryFiles(schema, outputPath, undefined, loggerMock);
			clearLastConsolePrint();
			clearBuffer();
		});

		after(() => {
			clearBuffer();
		});

		test('init returns a non null value', () => {
			restRouter = g.init(schema, execute, options);
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


	describe('router forwards requests to underlying GraphQL layer and correctly processes responses:', () => {
		before(() => {
			clearLastConsolePrint();
			clearBuffer();
			loggerMock.supressDebugLevel = true;
			expect(restRouter).to.not.equal(null);
			expect(restRouter).to.not.equal(undefined);
			expect(Object.getPrototypeOf(restRouter)).to.equal(express.Router);
			rmwareHttpMock(restRouter);
		});

		after(() => {
			clearBuffer();
			loggerMock.supressDebugLevel = false;
			del.sync(outputPath);
		});

		describe('testing GET /testApp/v1/api/tweets/10 - successful GET call without body: ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/tweets/10', {
					method: 'get'
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('responds on HTTP GET request with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal('0123-45687');
				expect(responseBody.active).to.equal(true);
			});

			test('REST parameters were passed correctly to GraphQL mock layer', () => {
				expect(responseBody.vars).to.deep.equal({
					id: '10'
				});
			});

			test('GraphQL operation "Tweet()" was invoked', () => {
				expect(responseBody.queryStrReceived.definitions[0].name.value).to.equal('Tweet');
			});
		});


		describe('testing POST /testApp/v1/api/tweets - successful POST call with body and params renaming: ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/tweets', {
					method: 'post',
					body: {
						text: 'My Tweet'
					}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('error mapping: responds on HTTP POST request with 201 CREATED status code', () => {
				expect(statusCode).to.equal(201);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal('0123-45687');
				expect(responseBody.active).to.equal(true);
			});

			test('REST parameters were passed correctly to GraphQL mock layer', () => {
				expect(responseBody.vars).to.deep.equal({
					text: 'My Tweet' // variables are not renamed; instead, GraphQL query param names are reassigned
				});
			});

			test('GraphQL parameters are mapped and reassigned correctly', () => {
				expect(responseBody.queryStrReceived.loc.source.body).to.include('createTweet(tweetBody: $text)'); // parameter reassignment
			});

			test('GraphQL operation "createTweet()" was invoked', () => {
				expect(responseBody.queryStrReceived.definitions[0].name.value).to.equal('createTweet');
			});
		});

		describe('testing POST /testApp/v1/api/tweets - successful POST call with body and params renaming: ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/tweets', {
					method: 'post',
					body: {
						text: 'My Tweet'
					}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('error mapping: responds on HTTP POST request with 201 CREATED status code', () => {
				expect(statusCode).to.equal(201);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal('0123-45687');
				expect(responseBody.active).to.equal(true);
			});

			test('REST parameters were passed correctly to GraphQL mock layer', () => {
				expect(responseBody.vars).to.deep.equal({
					text: 'My Tweet' // variables are not renamed; instead, GraphQL query param names are reassigned
				});
			});

			test('GraphQL parameters are mapped and reassigned correctly', () => {
				expect(responseBody.queryStrReceived.loc.source.body).to.include('createTweet(tweetBody: $text)'); // parameter reassignment
			});

			test('GraphQL operation "createTweet()" was invoked', () => {
				expect(responseBody.queryStrReceived.definitions[0].name.value).to.equal('createTweet');
			});
		});


		describe('testing GET /testApp/v1/api/users - successful GET call returning array of objects: ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/users', {
					method: 'get',
					body: {
						returnArrayResponse: true
					}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('responds on HTTP GET request with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody).to.deep.equal(
					[{
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
				);
			});
		});

		describe('testing GET /testApp/v1/api/users with field filtering - successful GET call returning array of objects with only specified fields: ', () => {
			let responseBody = null; // TODO is this test redundant when using JMESPATH?
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/users', {
					method: 'get',
					body: {
						returnArrayResponse: true
					},
					query: {
						fields: 'subObj.subObjId,  title'
					}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('responds on HTTP GET request with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				console.dir(responseBody);
				expect(responseBody).to.deep.equal(
					[{
						title: 'The Best Result Ever #1',
						subObj: {
							subObjId: 500
						}
					},
					{
						title: 'The Best Result Ever #2',
						subObj: {
							subObjId: 501
						}
					}
					]
				);
			});
		});

		describe('testing GET /testApp/v1/api/users with JMESPath filter expression: ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/users', {
					method: 'get',
					body: {
						returnArrayResponse: true
					},
					query: {
						fields: ':[].{Title: title, ObjId: oid, SubId: subObj.subObjId}'
					}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('responds on HTTP GET request with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody).to.deep.equal(
					[
						{
							Title: 'The Best Result Ever #1',
							ObjId: '1',
							SubId: 500
						},
						{
							Title: 'The Best Result Ever #2',
							ObjId: '2',
							SubId: 501
						}
					]
				);
			});
		});

		describe('testing GET /testApp/v1/api/users with JMESPath filter expression on an array, that results in null in JMESPath language returns empty array:  ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/users', {
					method: 'get',
					body: {
						returnArrayResponse: true
					},
					query: {
						fields: ':someNonExistentArray.{Title: title, ObjId: oid, SubId: subObj.subObjId}'
					}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('responds on HTTP GET request with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody).to.deep.equal([]);
			});
		});


		describe('testing GET /testApp/v1/api/users with JMESPath filter expression on an object, that results in null in JMESPath language returns empty object:  ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/users', {
					method: 'get',
					query: {
						fields: ':someNonExistentObj.{Title: title, ObjId: oid, SubId: subObj.subObjId}'
					}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('responds on HTTP GET request with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody).to.deep.equal({});
			});
		});


		describe('testing GET /testApp/v1/api/users with invalid JMESPath filter expression fails gracefully with empty array:  ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/users', {
					method: 'get',
					body: {
						returnArrayResponse: true
					},
					query: {
						fields: ':[].[].[]'
					}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('responds on HTTP GET request with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody).to.deep.equal([]);
			});
		});

		describe('testing GET /api/notifications - successful GET call to test manifest condition fork (no query param "myquery", Notifications() should be invoked): ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/notifications', {
					method: 'get',
					body: {}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('error mapping: responds on HTTP POST request with 200 OK', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal('0123-45687');
				expect(responseBody.active).to.equal(true);
			});

			test('REST parameters were passed correctly to GraphQL mock layer', () => {
				expect(responseBody.vars).to.deep.equal({});
			});

			test('GraphQL operation "Notifications()" was invoked', () => {
				expect(responseBody.queryStrReceived.definitions[0].name.value).to.equal('Notifications');
			});
		});


		describe('testing GET /api/notifications - successful GET call to test manifest condition fork (WITH query param "myquery", NotificationsLegacy() should be invoked): ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/notifications', {
					method: 'get',
					body: {},
					query: {
						myquery: 'names'
					}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('error mapping: responds on HTTP POST request with 200 OK', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal('0123-45687');
				expect(responseBody.active).to.equal(true);
			});

			test('REST parameters were passed correctly to GraphQL mock layer', () => {
				expect(responseBody.vars).to.deep.equal({
					myquery: 'names'
				});
			});

			test('GraphQL operation "Notifications()" was invoked', () => {
				expect(responseBody.queryStrReceived.definitions[0].name.value).to.equal('NotificationsLegacy');
			});
		});


		// TODO refactor this test; refactor POST /api/notifications in manifest file (currently has redundant data)
		describe('testing POST /api/notifications - conditional fork with request body wrapped ONCE only): ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/notifications', {
					method: 'post',
					body: {
						userId: 100,
						command: '$preprocess',
						notification: 'notificationDummy'
					},
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('error mapping: responds on HTTP POST request with 201 CREATED', () => {
				expect(statusCode).to.equal(201);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal('0123-45687');
				expect(responseBody.active).to.equal(true);
			});

			test('request body was mutated correctly - wrapped ONCE with "{wrapper: data: {..} }', () => {
				const { body } = responseBody.restRequest;
				expect(body).to.deep.equal({
					wrapper: {
						data: {
							userId: 100,
							command: '$preprocess'
						}
					}
				});
			});

			test('Last GraphQL operation in the chain, "createNotificationLegacy()",  was invoked', () => {
				expect(responseBody.queryStrReceived.definitions[0].name.value).to.equal('createNotificationLegacy');
			});
		});


		describe('testing PUT /api/tweets - parameters marked for deletion in the manifest using "__DELETE__" should not be passed to GraphQL: ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/tweets', {
					method: 'put',
					body: {
						sort_field: 'user',
						sort_order: 'asc',
						deleteMe1: 'This_Param_Should_Be_Ignored',
						deleteMe2: 'This_Param_Should_Also_Be_Ignored',
						text: '123_Text',

						nested: {
							delete: {
								me: 'This_Param_Should_Be_Ignored...',
								anotherParam: 'Should not be omitted.'
							},
							someOtherParam: 'Should not be omitted.'
						},

						array: {
							of: {
								objs: [{
									kept: true,
								},
								{
									kept: true,
								},
								{
									alwaysKept: true
								}
								],
								nonArray: 100
							},
							anotherParam: 'Yet another param - should not be omitted'
						}
					},
					query: {
						limit: 100,
						skip: 0
					}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('error mapping: responds on HTTP POST request with 204 code', () => {
				expect(statusCode).to.equal(204);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal('0123-45687');
				expect(responseBody.active).to.equal(true);
			});

			test('REST parameters were passed correctly to GraphQL mock layer', () => {
				expect(responseBody.vars).to.deep.equal({
					// "deleteMe1" & "deleteMe2" should be omitted from this object, as well as nested fields "nested.delete.me" and
					// "deleted" fields in all objects in "array.of.objs[]" array.
					text: '123_Text',
					sort_field: 'user',
					sort_order: 'asc',
					limit: 100,
					skip: 0,
					nested: {
						delete: {
							anotherParam: 'Should not be omitted.'
						},
						someOtherParam: 'Should not be omitted.'
					},

					array: {
						of: {
							objs: [{
								kept: true,
							},
							{
								kept: true,
							},
							{
								alwaysKept: true
							}
							],
							nonArray: 100
						},
						anotherParam: 'Yet another param - should not be omitted'
					}

				});
			});

			test('GraphQL operation "Tweets()" was invoked', () => {
				expect(responseBody.queryStrReceived.definitions[0].name.value).to.equal('Tweets');
			});
		});


		describe('testing PUT /api/tweets - parameters marked for deletion do not affect result if they don\'t exist in payload', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/tweets', {
					method: 'put',
					body: {
						sort_field: 'user',
						sort_order: 'asc',
						text: '123_Text',
						nested: {
							delete: {
								anotherParam: 'Should not be omitted.'
							},
							someOtherParam: 'Should not be omitted.'
						},

						array: {
							of: {
								objs: [{
									kept: true,
								},
								{
									kept: true,
								},
								{
									alwaysKept: true
								}
								],
								nonArray: 100
							},
							anotherParam: 'Yet another param - should not be omitted'
						}
					},
					query: {
						limit: 100,
						skip: 0
					}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('error mapping: responds on HTTP POST request with 204 code', () => {
				expect(statusCode).to.equal(204);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal('0123-45687');
				expect(responseBody.active).to.equal(true);
			});

			test('REST parameters were passed correctly to GraphQL mock layer', () => {
				expect(responseBody.vars).to.deep.equal({
					text: '123_Text',
					sort_field: 'user',
					sort_order: 'asc',
					limit: 100,
					skip: 0,
					nested: {
						delete: {
							anotherParam: 'Should not be omitted.'
						},
						someOtherParam: 'Should not be omitted.'
					},

					array: {
						of: {
							objs: [{
								kept: true,
							},
							{
								kept: true,
							},
							{
								alwaysKept: true
							}
							],
							nonArray: 100
						},
						anotherParam: 'Yet another param - should not be omitted'
					}
				});
			});

			test('GraphQL operation "Tweets()" was invoked', () => {
				expect(responseBody.queryStrReceived.definitions[0].name.value).to.equal('Tweets');
			});
		});


		describe('testing GET /api/notifications with "fields" filter; filter on SINGLE field (no query param "myquery", Notifications() should be invoked, response should have one field: ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/notifications', {
					method: 'get',
					query: {
						fields: ' title  ' // whitespaces are on purpose, to test string being trimmed
					},
					body: {}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('error mapping: responds on HTTP POST request with 200 OK', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal(undefined);
				expect(responseBody).to.deep.equal({
					title: 'The Best Result Ever'
				});
			});
		});


		describe('testing GET /api/notifications with "fields" filter; filter on MULTIPLE fields (no query param "myquery", Notifications() should be invoked, response should have two fields: ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/notifications', {
					method: 'get',
					query: {
						fields: 'title , elements  ' // whitespaces are on purpose, to test string being trimmed
					},
					body: {}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('error mapping: responds on HTTP POST request with 200 OK', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal(undefined);
				expect(responseBody).to.deep.equal({
					title: 'The Best Result Ever',
					elements: ['element1', 'element2']
				});
			});
		});


		describe('testing error handling: a DELETE request that should emit an error propagating from GraphQL to REST layer: ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/tweets/2010', {
					method: 'delete',
					body: {
						emitError: 4003,
						isErrorWithData: false
					},
					query: {
						myquery: 'names'
					}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('error mapping: responds on HTTP POST request with 403 FORBIDDEN', () => {
				expect(statusCode).to.equal(403);
			});

			test('response has no data', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal(undefined);
				expect(responseBody.active).to.equal(undefined);
				expect(responseBody).to.not.have.property('data');
			});

			test('response is error only', () => {
				expect(responseBody).to.have.property('errors');
				expect(responseBody.errors).to.be.an('array').that.includes({
					message: 'Unauthorized',
					name: 'UnauthorizedError',
					locations: [{
						line: 2,
						column: 3
					}],
					path: [
						'testGetOperationToFail'
					],
					extensions: {
						code: 4003
					},
					errorDescription: 'User is unauthorized. Please use a correct Bearer token.'
				});
			});

			test('GraphQL operation "deleteTweet()" was NOT invoked', () => {
				expect(responseBody.queryStrReceived).to.equal(undefined);
			});
		});

		describe('testing error handling: a DELETE request on which GraphQL responds with BOTH error AND data should NOT emit an error, should return SUCCESS with data only: ', () => {
			let responseBody = null;
			let statusCode = 0;
			clearBuffer();
			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/tweets/2010', {
					method: 'delete',
					body: {
						emitError: 999,
						isErrorWithData: true
					},
					query: {
						myquery: 'names'
					}
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('error mapping: responds on HTTP POST request with 204 NO CONTENT', () => {
				expect(statusCode).to.equal(204);
			});

			test('response has correct data', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody).not.to.have.property('data');

				// explanation: current GraphQL2REST conversion logic is: { data: { hero: { name: "luke" } } } => { name: "luke"}    (REST response favors flat object!)
				expect(responseBody).not.to.have.property('hero');
				expect(responseBody).to.have.property('name');
				expect(responseBody.name).to.equal('R2-D2');
			});

			test('response has no errors array attached', () => {
				expect(responseBody).not.to.have.property('errors');
			});
		});


		describe('testing hide functionality: PATCH /testApp/v1/api/tweets/50 - hidden fields in manifest should be omitted from GraphQL response:', () => {
			let responseBody = null;

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/tweets/50', {
					method: 'patch',
					body: {
						text: 'Body is not important here'
					}
				}, (code, body) => {
					responseBody = body;
					done();
				});
			});

			test('hidden fields in manifest are omitted from response', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal(undefined);
				expect(responseBody.active).to.equal(undefined);
			});

			test('fields which are not hidden are sent in the REST response', () => {
				expect(responseBody.title).to.equal('The Best Result Ever');
			});
		});

		describe('testing wrapRequestBodyWith functionality: POST /testApp/v1/api/relationships/100/101 - request body should be wrapped in custom property when GraphQL receives it:', () => {
			let responseBody = null;

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/relationships/100/10', {
					method: 'post',
					body: {
						url: 'http://twitter/rels/100/101/',
						relationshipDate: '1970-1-1'
					}
				}, (code, body) => {
					responseBody = body;
					done();
				});
			});

			test('request body is wrapped with "relationship" property before GraphQL receives it, as indicated in the manifest:', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				const { body } = responseBody.restRequest;

				expect(body).to.deep.equal({
					relationship: {
						url: 'http://twitter/rels/100/101/',
						relationshipDate: '1970-1-1'
					}
				});
			});

			test('path parameters are and passed as to GraphQL as expected:', () => {
				expect(responseBody.queryStrReceived.definitions[0].variableDefinitions[0].variable.name.value).to.equal('first');
				expect(responseBody.queryStrReceived.definitions[0].variableDefinitions[1].variable.name.value).to.equal('second');
			});
		});


		describe('testing wrapRequestBodyWith functionality with multi-level wrapper object: PATCH /testApp/v1/api/relationships/100/101 - request body should be inside nested objected when GraphQL receives it:', () => {
			let responseBody = null;

			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/relationships/100/10', {
					method: 'patch',
					body: {
						url: 'http://twitter/rels/100/101/',
						relationshipDate: '1970-1-1'
					}
				}, (code, body) => {
					responseBody = body;
					done();
				});
			});

			test('request body is inside "{ updateData: { vars: { relationship: { ... } } } }" object before GraphQL receives it, as indicated in the manifest:', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				const { body } = responseBody.restRequest;
				expect(body).to.deep.equal({
					updateData: {
						vars: {
							relationship: {
								url: 'http://twitter/rels/100/101/',
								relationshipDate: '1970-1-1'
							}
						}
					}
				});
			});

			test('path parameters are and passed as to GraphQL as expected:', () => {
				expect(responseBody.queryStrReceived.definitions[0].variableDefinitions[0].variable.name.value).to.equal('first');
				expect(responseBody.queryStrReceived.definitions[0].variableDefinitions[1].variable.name.value).to.equal('second');
			});
		});
	});
});


describe('GraphQL2REST router optional custom parsing functions tests:', () => {
	let restRouter;
	const outputPath = GQL_OUTPUT_FOLDER;
	let schema;
	const g = GraphQL2REST;
	const options = {
		logger: loggerMock,
		gqlGeneratorOutputFolder: outputPath,
		manifestFile: '../test/test-fixtures/manifests/basicManifest1.json',
		apiPrefix: '/testApp/v1'
	};

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

	before(() => {
		schema = buildSchema(schemaFile.schema);
		del.sync(outputPath);
		g.generateGqlQueryFiles(schema, outputPath, undefined, loggerMock);
		clearLastConsolePrint();
		clearBuffer();
		loggerMock.supressDebugLevel = true;
	});

	after(() => {
		clearBuffer();
		loggerMock.supressDebugLevel = false;
		del.sync(outputPath);
	});

	test('init with custom parse function returns a non null value', () => {
		restRouter = g.init(schema, execute, options, customFormatErrorFn, customFormatDataFn);
		expect(restRouter).to.not.equal(null);
		expect(restRouter).to.not.equal(undefined);
	});


	describe('testing GET /testApp/v1/api/tweets/10 - successful call should return customized response: ', () => {
		let responseBody = null;
		let statusCode = 0;
		clearBuffer();

		before((done) => {
			restRouter.runMiddleware('/testApp/v1/api/tweets/10', {
				method: 'get'
			}, (code, body) => {
				responseBody = body;
				statusCode = code;
				done();
			});
		});

		test('responds on HTTP GET request with 200 OK status code', () => {
			expect(statusCode).to.equal(200);
		});

		test('response body is customized as expected (only title in uppercase)', () => {
			expect(responseBody).to.not.equal(null);
			expect(responseBody).to.not.equal(undefined);
			expect(responseBody.oid).to.not.equal('0123-45687');
			expect(responseBody.title).to.equal('THE BEST RESULT EVER');
		});

		test('REST parameters were passed correctly to GraphQL mock layer', () => {
			expect(responseBody.vars).to.deep.equal({
				id: '10'
			});
		});

		test('GraphQL operation "Tweet()" was invoked', () => {
			expect(responseBody.queryStrReceived.definitions[0].name.value).to.equal('Tweet');
		});
	});

	describe('testing DELETE /testApp/v1/api/tweets/2010, it should emit an error formatted according to custom function', () => {
		let statusCode = 0;
		let responseBody = null;

		clearBuffer();

		before((done) => {
			restRouter.runMiddleware('/testApp/v1/api/tweets/2010', {
				method: 'delete',
				body: {
					emitError: 4003,
					isErrorWithData: false
				},
				query: {
					myquery: 'names'
				}
			}, (code, body) => {
				responseBody = body;
				statusCode = code;
				done();
			});
		});

		test('error mapping: responds on HTTP POST request with 403 FORBIDDEN', () => {
			expect(statusCode).to.equal(403);
		});

		test('response body is customized as expected (only error in uppercase)', () => {
			expect(responseBody).to.not.equal(null);
			expect(responseBody).to.not.equal(undefined);
			expect(responseBody.oid).to.not.equal('0123-45687');
			expect(responseBody.error).to.equal('UNAUTHORIZED');
		});
	});
});


describe('GraphQL2REST router negative and error inducing tests:', () => {
	let restRouter;
	const outputPath = GQL_OUTPUT_FOLDER;

	describe('init() router basic negative tests', () => {
		let schema;
		const g = GraphQL2REST;
		const options = {
			logger: loggerMock,
			gqlGeneratorOutputFolder: outputPath,
			manifestFile: '../test/test-fixtures/manifests/basicManifest1.json',
			apiPrefix: '/testApp/v1'
		};

		before(() => {
			schema = buildSchema(schemaFile.schema);
			del.sync(outputPath);
			g.generateGqlQueryFiles(schema, outputPath, undefined, loggerMock);
			clearLastConsolePrint();
			clearBuffer();
		});

		after(() => {
			clearBuffer();
			del.sync(outputPath);
			loggerMock.supressErrorLevel = false;
		});


		test('init with no execute function returns null and logs appropriate error', () => {
			restRouter = g.init(schema, {}, options);
			expect(restRouter).to.equal(null);
			expect(getLastConsolePrint().toLowerCase()).to.include('The GraphQL execution function provided, executeFn, is not a function. Aborting.'.toLowerCase());
		});

		test('init with undefined schema function returns null and logs appropriate error', () => {
			restRouter = g.init(undefined, execute, options);
			expect(restRouter).to.equal(null);
			expect(getLastConsolePrint().toLowerCase()).to.include('schema object is required but missing. Aborting'.toLowerCase());
		});

		test('init with missing manifest file returns null', () => {
			loggerMock.supressErrorLevel = true;
			restRouter = g.init(schema, execute, {
				...options,
				manifestFile: '../test/test-fixtures/manifests/_nonExistentManifest_.json'
			});
			expect(restRouter).to.equal(null);
			loggerMock.supressErrorLevel = false;
		});

		test('init with missing gql generator output folder returns null', () => {
			loggerMock.supressErrorLevel = true;
			restRouter = g.init(schema, execute, {
				...options,
				gqlGeneratorOutputFolder: '../test/test-fixtures/_nonExistentFolder_'
			});
			expect(restRouter).to.equal(null);
			loggerMock.supressErrorLevel = false;
		});

		test('optional params: init with formatDataError parameter which is not a function returns null and logs appropriate error message', () => {
			restRouter = g.init(schema, execute, options, {});
			expect(restRouter).to.equal(null);
			expect(getLastConsolePrint().toLowerCase()).to.include('formatErrorFn function provided is not a function'.toLowerCase());
		});

		test('optional params: init with formatDataFn parameter which is not a function returns null and logs appropriate error message', () => {
			restRouter = g.init(schema, execute, options, undefined, {});
			expect(restRouter).to.equal(null);
			expect(getLastConsolePrint().toLowerCase()).to.include('formatDataFn function provided is not a function'.toLowerCase());
		});
	});
});
