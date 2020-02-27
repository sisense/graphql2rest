
/* On a separate project / home folder, first run:
npm i graphql2rest
npm i graphql
npm i express
npm i body-parser

Then:

node index
*/

/*eslint-disable*/
const GraphQL2REST = require('graphql2rest');
const graphql = require('graphql');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Example GraphQL schema
const schemaStr = `
type Tweet {
    id: ID
    body: String
}

type Query {
    getTweet(id: ID!): Tweet
}

type Mutation {
    createTweet (body: String): Tweet
}`;

// Dummy resolvers
const resolvers = {
    getTweet: ({ id }) => {
        return {
            id,
            body: 'Default Tweet'
        }
    },

    createTweet: ({ body }) => {
        return {
            id: 100,
            body
        }
    },
};

const schema = graphql.buildSchema(schemaStr); // Creates a GraphQLSchema object from our schemaStr string

// The GraphQL2REST execute function receives { query, variables, context, operationName } parameters,
// so it can be used as is with Apollo Link and other compatible GraphQL interfaces/servers.
//
// For graphql-js used here which uses different arguments, we need to wrap graphql's execute() function with
// our GraphQL2REST execute function and map to its corresponding fields.
const executeFn = ({ query, variables, context}) => {
    return graphql.execute({
        schema,
        document: query,
        variableValues: variables,
        contextValue: context,
        rootValue: resolvers
    });
}

// Always use path.resolve() to force absolute paths
const GQL_FOLDER = path.resolve(__dirname, './myGqlFiles'); // root folder where .gql files will be created
const MANIFEST_FILE = path.resolve(__dirname, './myManifest.json'); // pathname for our GraphQL2REST manifest file


GraphQL2REST.generateGqlQueryFiles(schema, GQL_FOLDER); // this can be performed just once (unless the schema changes)

const restAPI = GraphQL2REST.init(schema, executeFn, {
    apiPrefix: '/v1',
    gqlGeneratorOutputFolder: GQL_FOLDER,
    manifestFile: MANIFEST_FILE
    // other options are configurable too
});
// restAPI is now an Express router mounted on /v1


app.use('/api', restAPI); // restAPI is now mounted on /api/v1 in app
app.listen(4000); // localhost on port 4000 is now listening for incoming HTTP REST requests

/*
$ curl -X GET http://localhost:4000/api/v1/tweets/124 -H 'content-type: application/json'

{ "id": "124", "body": "Default Tweet" }



$ curl -X POST http://localhost:4000/api/v1/tweets -H 'content-type: application/json' -d '{"body": "Testing Tweets!"}'

{ "id": "100", "body": "Testing Tweets!" }



Trying to cause a validation error ("body" should be String, not int):

$ curl -X POST http://localhost:4000/api/v1/tweets  -H 'content-type: application/json' -d '{ "body": 0 }'

{
    "errors": [
        {
            "message": "Variable \"$body\" got invalid value 0; Expected type String. String cannot represent a non string value: 0",
            "locations": []
        }
    ]
}

(The error response can be customized and formatted by providing init() with your own errorFormatFn)

*/
