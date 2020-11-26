const path = require('path');
const {test} = require('mocha');
const chai = require('chai');
const chaifs = require('chai-fs');
const rmwareHttpMock = require('run-middleware');
const {buildSchema} = require('graphql');

const schemaFile = require('../test-fixtures/schemas/basic-graphql-schema-1');
const GraphQL2REST = require('../../src/index');
const {expect} = chai;

const {
	loggerMock,
	clearBuffer,
} = require('../mocks/logger');

const {execute} = require('../mocks/graphql');

const GQL_OUTPUT_FOLDER = path.resolve(__dirname, '../test-outputs/gqloutput');
const { clearEnv, getOptions } = require('../testUtils')

chai.use(chaifs);

const prepareEnv = (schema, restRouter) => {
	clearEnv([GQL_OUTPUT_FOLDER]);
	rmwareHttpMock(restRouter);
}

describe('GraphQL2REST router - forwards requests to underlying GraphQL layer and correctly processes responses', () => {
	const schema = buildSchema(schemaFile.schema);
	GraphQL2REST.generateGqlQueryFiles(schema,
		GQL_OUTPUT_FOLDER, undefined, loggerMock);
	let restRouter = GraphQL2REST.init(schema, execute, getOptions(GQL_OUTPUT_FOLDER));
	let responseBody = null;
	let statusCode = 0;

	before(() => prepareEnv(schema, restRouter));

	after(() => {
		responseBody = null;
		statusCode = 0;
		clearEnv([GQL_OUTPUT_FOLDER]);
	});

	describe('GET', () => {
		describe('/testApp/v1/api/tweets/10 - successful GET call without body: ', () => {

			before((done) => {
				loggerMock.supressDebugLevel = true;
				clearBuffer();
				restRouter.runMiddleware('/testApp/v1/api/tweets/10', {
					method: 'get'
				}, (code, body) => {
					responseBody = body;
					statusCode = code;
					done();
				});
			});

			test('responds with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal('0123-45687');
				expect(responseBody.active).to.equal(true);
			});

			test('REST parameters were passed correctly to GraphQL mock layer', () => {
				expect(responseBody.vars).to.deep.equal({id: '10'});
			});

			test('GraphQL operation "Tweet()" was invoked', () => {
				expect(responseBody.queryStrReceived.definitions[0].name.value).to.equal('Tweet');
			});
		});

		describe('/testApp/v1/api/users - successful GET call returning array of objects: ', () => {
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

			test('responds with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct', () => {
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

		describe('/testApp/v1/api/users with field filtering - successful GET call returning array of objects with only specified fields: ', () => {
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

			test('responds with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct', () => {
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

		describe('/testApp/v1/api/users with JMESPath filter expression: ', () => {
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

			test('responds with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct', () => {
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

		describe('/testApp/v1/api/users with JMESPath filter expression on an array, that results in null in JMESPath language returns empty array:  ', () => {
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

			test('responds with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody).to.deep.equal([]);
			});
		});

		describe('/testApp/v1/api/users with JMESPath filter expression on an object, that results in null in JMESPath language returns empty object:  ', () => {
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

			test('responds with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody).to.deep.equal({});
			});
		});

		describe('/testApp/v1/api/users with invalid JMESPath filter expression fails gracefully with empty array:  ', () => {
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

			test('responds with 200 OK status code', () => {
				expect(statusCode).to.equal(200);
			});

			test('response body is correct', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody).to.deep.equal([]);
			});
		});

		describe('/api/notifications - successful GET call to test manifest condition fork (no query param "myquery", Notifications() should be invoked): ', () => {
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

			test('response body is correct', () => {
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

		describe('/api/notifications - successful GET call to test manifest condition fork (WITH query param "myquery", NotificationsLegacy() should be invoked): ', () => {
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

			test('response body is correct', () => {
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

		describe('/api/notifications with "fields" filter; filter on SINGLE field (no query param "myquery", Notifications() should be invoked, response should have one field: ', () => {
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

		describe('/api/notifications with "fields" filter; filter on MULTIPLE fields (no query param "myquery", Notifications() should be invoked, response should have two fields: ', () => {
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

	})

	describe('POST', () => {
		describe('/testApp/v1/api/tweets - successful POST call with body and params renaming: ', () => {
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

		describe('/testApp/v1/api/tweets - successful POST call with body and params renaming: ', () => {
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

		describe('/api/notifications - conditional fork with request body wrapped ONCE only): ', () => {
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
				const {body} = responseBody.restRequest;
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

		describe('/testApp/v1/api/relationships/100/101 - request body should be wrapped in custom property when GraphQL receives it:', () => {
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
				const {body} = responseBody.restRequest;

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
	})

	describe('PUT', () => {
		describe('/api/tweets - parameters marked for deletion in the manifest using "__DELETE__" should not be passed to GraphQL: ', () => {
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

		describe('/api/tweets - parameters marked for deletion do not affect result if they don\'t exist in payload', () => {
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

		describe('/testApp/v1/api/relationships/100/101 - middleware function should be called and modify request object passed to GraphQL:', () => {
			before((done) => {
				restRouter.runMiddleware('/testApp/v1/api/relationships/100/10', {
					method: 'put',
					body: {
						url: 'http://twitter/rels/100/101/',
						relationshipDate: '1970-1-1'
					}
				}, (code, body) => {
					responseBody = body;
					done();
				});
			});

			test('request body and route params are changed by the middleware function:', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				const {body, params} = responseBody.restRequest;

				expect(body).to.deep.equal({
					message: 'Touched by GraphQL2REST middleware!',
					verb: 'PUT',
					route: '/testApp/v1/api/relationships/:first/:second',
					operation: 'updateTweetRelationship'
				});

				expect(params).to.deep.equal({
					first: 'Touched by GraphQL2REST middleware!',
					second: 'Touched by GraphQL2REST middleware!'
				});
			});

			test('path parameters are and passed as to GraphQL as expected:', () => {
				expect(responseBody.queryStrReceived.definitions[0].variableDefinitions[0].variable.name.value).to.equal('first');
				expect(responseBody.queryStrReceived.definitions[0].variableDefinitions[1].variable.name.value).to.equal('second');
			});

			test('response body is correct as expected', () => {
				expect(responseBody).to.not.equal(null);
				expect(responseBody).to.not.equal(undefined);
				expect(responseBody.oid).to.equal('0123-45687');
				expect(responseBody.active).to.equal(true);
			});
		});

	})

	describe('DELETE', () => {
		describe('request that should emit an error propagating from GraphQL to REST layer: ', () => {
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

		describe('request on which GraphQL responds with BOTH error AND data should NOT emit an error, should return SUCCESS with data only: ', () => {
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
	})

	describe('PATCH', () => {
		describe('/testApp/v1/api/tweets/50 - hidden fields in manifest should be omitted from GraphQL response:', () => {
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

		describe('/testApp/v1/api/relationships/100/101 - request body should be inside nested objected when GraphQL receives it:', () => {
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
				const {body} = responseBody.restRequest;
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

	})
});
