# Quick Start & Working Example

## Installation
npm:
```sh
npm i graphql2rest 
```
yarn:
```sh
yarn add graphql2rest
```

Next, edit the manifest file. 

## Working Example
*This code example can be found in the /examples folder*.

Create a file `myManifest.json` in your source home folder: 
```json
{
	"endpoints": {

		"/tweets/:id": {
			"get": {
				"operation": "getTweet"
			}
		},

		"/tweets": {
			"post": {
				"operation": "createTweet",
				"successStatusCode": 201
			}
		}
	}
}
```
Create an `index.js` file in your source home folder:


```js
/* index.js */

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


app.use('/api', restAPI); // restAPI is now mounted on /api/v1 in app, out Express server 
app.listen(4000); // localhost on port 4000 is now listening for incoming HTTP REST requests

```
<br>

Now run `node index` to invoke our Express server: 
```sh
$ node index
info: GQLGenerator initializing...
info: GQLGenerator initialized with query depthLimit of 1000
info: [gqlgenerator] Creating folder /Users/roy/example1/myGqlFiles/
info: Wrote to folder /Users/roy/example1/myGqlFiles/queries
info: Wrote to folder /Users/roy/example1/myGqlFiles/mutations
info: [gqlgenerator warning]: No subscription type found in your schema
info: [gqlgenerator] Successfully created fully exploded GraphQL queries as GQL files based on the schema.

info: ==> Adding endpoint GET /v1/tweets/:id
info: ==> Adding endpoint POST /v1/tweets
```

Node.js is now listening on port 4000 of `localhost`.  

<br> <br>
Let's invoke some REST API calls via HTTP: 

```sh
$ curl -X GET http://localhost:4000/api/v1/tweets/124 -H 'content-type: application/json'

{ "id": "124", "body": "Default Tweet" } [200 OK]
```
We get an expected JSON response from our REST API. 

The GraphQL2REST debug log shows the GraphQL activity under the hood: 
```
debug: REST router was invoked: route GET /v1/tweets/:id
debug: Actual path: /v1/tweets/124
debug: Executing "query getTweet($id: ID!){    getTweet(id: $id){        id        body    }}..." with parameters:
debug:
{
    "id": "124"
}
debug: [Original (unformatted and unfiltered) response from GraphQL]:
debug:
{
    "data": {
        "getTweet": {
            "id": "124",
            "body": "Default Tweet"
        }
    }
}
debug: Returning HTTP status code 200
```
<br>

Let's test our POST endpoint:

```sh
$ curl -X POST http://localhost:4000/api/v1/tweets -H 'content-type: application/json' -d '{"body": "Testing Tweets!"}'

{ "id": "100", "body": "Testing Tweets!" } [201 CREATED]
```
<br>

Let's try to cause a validation error ("body" should be String, not Int): 

```sh
$ curl -X POST http://localhost:4000/api/v1/tweets -H 'content-type: application/json' -d '{ "body": 0 }'

{
    "errors": [
        {
            "message": "Variable \"$body\" got invalid value 0; Expected type String. String cannot represent a non string value: 0",
            "locations": []
        }
    ]
} 

[400 BAD REQUEST]
```

(The error response can be customized and formatted by providing init() with your own errorFormatFn).

<br><br>
**Next**:  read about [the manifest file](The%20manifest%20file.md) or jump to [the pre-processing step](Pre-processing%20step.md).

