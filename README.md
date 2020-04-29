# GraphQL2REST
> Automatically generate a RESTful API from your existing GraphQL API

GraphQL2REST is a Node.js library that reads your GraphQL schema and a user-provided manifest file and automatically generates an Express router with fully RESTful HTTP routes — a full-fledged REST API.


**![](https://lh4.googleusercontent.com/rc9GBGRl3GqVCyxfkhyFB23y-VY4D3jh6PPuD4ZJl0R-AMTsCFGINtETgxIOYdHGni7nFg0BCcHFFpL1mqCRMwUDnQRJCD67WUSijaIxColikxARNh4d3O-iv6EdOlISVGxsN9uj)**
## Why?
 - You have an existing GraphQL API, but need to expose it as REST because that's what your API users want

 - You want to develop a new GraphQL API and get REST on top of it, for free

 - You want to benefit from GraphQL internally while exposing REST externally as a public API

**GraphQL2REST allows you to fully configure and customize your REST API, which may sit on top of a very different GraphQL layer (see [*features*](#features)).**

<br>


# Table of Contents
- [Installation](#installation)
 - [Usage](#usage)
 - [Features](#features)
 - [How it works](#how-graphql2rest-works)
 - [Configuration](#configuration)
 - [Tutorial](#tutorial)
 - [Running tests](#running-tests)
 - [Benefits](#benefits)
 - [License](#license)

## Installation
npm:
```sh
npm i graphql2rest
```
yarn:
```sh
yarn add graphql2rest
```

## Usage

### **Basic example:**

Given a simple GraphQL schema:
```graphql
type Query {
	getUser(userId: UUID!): User
}

type Mutation {
	createUser(name: String!, userData: UserDataInput): User
	removeUser(userId: UUID!): Boolean
}
```
Add REST endpoints to the manifest.json file:
```json
{
	"endpoints": {
		"/users/:userId": {
			"get": {
				"operation": "getUser"
			},
			"delete": {
				"operation": "removeUser",
				"successStatusCode": 202
			}
		},
		"/users": {
			"post": {
				"operation": "createUser",
				"successStatusCode": 201
			}
		}
	}
}
```
In your code:
```js
import GraphQL2REST from 'graphql2rest';
import { execute } from 'graphql'; // or any GraphQL execute function (assumes apollo-link by default)
import { schema } from './myGraphQLSchema.js'; 

const gqlGeneratorOutputFolder = path.resolve(__dirname, './gqlFilesFolder'); 
const manifestFile = path.resolve(__dirname, './manifest.json');

GraphQL2REST.generateGqlQueryFiles(schema, gqlGeneratorOutputFolder); // a one time pre-processing step

const restRouter = GraphQL2REST.init(schema, execute, { gqlGeneratorOutputFolder, manifestFile });

// restRouter now has our REST API attached
const app = express();
app.use('/api', restRouter);

```
(Actual route prefix, file paths etc should be set first via *options* object or in `config/defaults.json`)

### Resulting API:
```
POST /api/users              --> 201 CREATED
GET /api/users/{userId}      --> 200 OK
DELETE /api/users/{userId}   --> 202 ACCEPTED

// Example:

GET /api/users/1234?fields=name,role

Will invoke getUser query and return only 'name' and 'role' fields in the REST response.
The name of the filter query param ("fields" here) can be changed via configuration. 

```
_For more examples and usage, please refer to the [Tutorial](#tutorial)._
<hr>

## Features
 - Use any type of GraphQL server - you provide the *execute()* function
 - Default "RESTful" logic for error identification, determining status codes and response formatting
 - Customize response format (and error responses format too, separately)
 - Custom parameter mapping (REST params can be different than GraphQL parameter names)
 - Customize success status codes for each REST endpoint
 - Map custom GraphQL error codes to HTTP response status codes
 - Map a single REST endpoint to multiple GraphQL operations, with conditional logic to determine mapping
 - Hide specific fields from responses
 - Run custom middleware function on incoming requests before they are sent to GraphQL
 - Client can filter on all fields of a response, in all REST endpoints, using built-in filter
 - Built-in JMESPath support (JSON query language) for client filter queries
 - GraphQL server can be local or remote (supports *apollo-link* and *fetch* to forward request to a remote server)
 - Embed your own winston-based logger

## How GraphQL2REST works
GraphQL2REST exposes two public functions:

- **`generateGqlQueryFiles()`** - GraphQL schema pre-processing
- **`init()`** -  generate Express router at runtime

First, GraphQL2REST needs to do some one-time preprocessing. It reads your GraphQL schema and generates .gql files containing all client operations (queries and mutations). These are "fully-exploded" GraphQL client queries which expand all fields in all nesting levels and all possible variables, per each Query or Mutation type.

This is achieved by running the *generateGqlQueryFiles()* function:
```js
GraphQL2REST.generateGqlQueryFiles(schema, '/gqlFilesFolder');
```
Now the /gqlFilesFolder contains an index.js file and subfolders for queries and mutations, containing .gql files corresponding to GraphQL operations. Use `path.resolve(__dirname, <PATH>)` for relative paths. 

*generateGqlQueryFiles()* has to be executed **just once**, or when the GraphQL schema changes  (it can be executed offline by a separate script or at "build time").

---
After _generateGqlQueryFiles()_ has been executed once,  GraphQL2REST ***init()*** can be invoked to create REST endpoints dynamically at runtime.

`init()` loads all .gql files into memory, reads the manifest.json file and uses Express router to generate REST endpoint routes associated with the GraphQL operations and rules defines in the manifest. `init(`) returns an Express router mounted with all REST API endpoints.

----
### The *init()* function
GraphQL2REST.*init()* is the entry point that creates REST routes at runtime.

It only takes two mandatory parameters: your GraphQL **schema** and the GraphQL server ***execute function*** (whatever your specific GraphQL server implementation provides, or an Apollo Link function).

```ts
GraphQL2REST.init(
	schema: GraphQLSchema,
	executeFn: Function,

	options?: Object,
	formatErrorFn?: Function,
	formatDataFn?: Function,
	expressRouter?: Function)
```

<br>

GraphQL arguments are passed to **`executeFn()`** in Apollo Link/*fetch* style, meaning one object as argument: `{ query, variables, context, operationName }`. 

**`options`** defines various settings (see [below](#configuration)). If undefined, default values will be used.

**`formatErrorFn`** is an optional function to custom format GraphQL error responses.

**`formatDataFn`** is an optional function to custom format non-error GraphQL responses (data). If not provided, default behavior is to strip the encapsulating `'data:'` property and the name of the GraphQL operation, and omit the `'errors'` array from successful responses.

**`expressRouter`** is an express.Router() instance to attach new routes on. If not provided, a new Express instance will be returned.

## The Manifest File
REST API endpoints and their behavior are defined in the manifest file (normally `manifest.json` ). It is used to map HTTP REST routes to GraphQL operations and define error code mappings. See a full example [here](docs/manifest-example.json).

### The `endpoints` section
The `endpoints` object lists the REST endpoints to generate:
```js
"endpoints": {
	"/tweets/:id": {  // <--- HTTP route path; path parameters in Express notation
		"get": {      // <--- HTTP method (get, post, patch, put, delete)
			"operation": "getTweetById", // <--- name of GraphQL query or mutation
		}
	}
}
```
Route path, HTTP method and operation name are mandatory.

GraphQL2REST lets you map a single REST endpoint to multiple GraphQL operations by using [an array of operations](docs/Mapping%20with%20conditional%20logic.md) (`operations[]` array instead of the `operation` field).

**Additional optional fields:**

 -  "`params`": Used to map parameters in the REST request to GraphQL arguments in the corresponding query or mutation. Lets you rename parameters so the REST API can use different naming than the underlying GraphQL layer. If omitted, parameters will be passed as is by default. [[Learn more]](docs/Mapping%20and%20renaming%20parameters.md)

 -  "`successStatusCode`": Success status code. If omitted, success status code is 200 OK by default.  [[Learn more]](docs/Success%20and%20error%20status%20codes.md)

 -  "`condition`": Conditions on the request parameters. GraphQL operation will be invoked only if the condition is satisfied. Condition is expressed using [MongoDB query language](https://docs.mongodb.com/manual/reference/operator/query/) query operators. [[Learn more]](docs/Mapping%20with%20conditional%20logic.md)

 -  "`hide`": Array of fields in response to hide. These fields in the GraphQL response will always be filtered out in the REST response. [[Learn more]](docs/Hiding%20fields%20in%20REST%20responses.md)

 -  "`wrapRequestBodyWith`": Wrap the request body with this property (or multiple nested objects expressed in dot notation) before passing the REST request to GraphQL. Lets you map the entire HTTP body to a specific GraphQL Input argument. Helpful when we want the REST body to be flat, but the GraphQL operation expects the input to be wrapped within an object. [[Learn more]](docs/Wrap%20request%20body.md)

 -  "`requestMiddlewareFunction`": Name of a middleware function (in the `middleware.js` module) to call before passing the request to the GraphQL server. This function receives the *express* `req` object and returns a modified version of it. [[Learn more]](docs/Middleware%20functions.md)
 </br>

 #### Another example:

```js
// Mutation updateUserData(userOid: UUID!, newData: userDataInput!): User
// input userDataInput { name: String, birthday: Date }
// type User { id: UUID!, name: String, birthday: Date, internalSecret: String }

"endpoints": {
	"/users/:id": {
		"patch": {
			"operation": "updateUserData",
			"params": {   // <-- map or rename some params
				"userOid": "id" // <-- value of :id will be passed to userOid in mutation
			},
			"successStatusCode": 202  // <-- customize success status code (202 is strange here but valid)
			"wrapRequestBodyWith": "newData", // <-- allow flat REST request body
			"hide": ["internalSecret"] // <-- array of fields to omit from final REST response
		}
	}
}
// PATCH /users/{userId}, body = {"name": "Joe", "birthday": "1990-1-14"}
// Response: 202 ACCEPTED
// { "id": THE_USERID, "name": "Joe", "birthday": "1990-1-14"} // "internalSecret" omitted
```


### The `errors` section
The optional “`errors`” object lets you map [GraphQL error codes](https://www.apollographql.com/docs/apollo-server/data/errors/#codes) to HTTP status codes, and add an optional additional error message.  The first error element in GraphQL's `errors` array is used for this mapping.

#### Example:
```js
"errors": {
	"errorCodes": {
		"UNAUTHENTICATED": {
			"httpCode": 401,
			"errorDescription": "Forbidden: Unauthorized access",
		}
	}
}
```
In this example, responses from GraphQL that have an `errors[0].extension.code` field with the value `"UNAUTHENTICATED"` produce a *401 Unauthorized* HTTP status code, and the error description string above is included in the JSON response sent by the REST router.


For GraphQL error codes that have no mappings (or if the "errors" object is missing from manifest.json), a *400 Bad Request* HTTP status code is returned by default for client errors, and a *500 Internal Server Error* is returned for errors in the server or uncaught exceptions.


## Configuration
Settings can be configured in the **`options`** object provided to init(). For any fields not specified in the *options* object, or if *options* is not provided to init(), values from the *config/defaults.json* file are used.

```js
const gql2restOptions  = {
	apiPrefix: '/api/v2', //sets the API base path url
	manifestFile: './api-v2-manifest.json', //pathname of manifest file
	gqlGeneratorOutputFolder: './gqls', //.gql files folder (generated by generateGqlQueryFiles())
	middlewaresFile:  './middlewares.js', //optional middlewares module for modifying requests
	filterFieldName: 'fields', //global query parameter name for filtering (default is 'fields'),
	graphqlErrorCodeObjPath: 'errors[0].extensions.code', //property for GraphQL error code upon error
	logger: myCustomLogger //optional Winston-based logger function
};

const expressRouter = GraphQL2REST.init(schema, execute, gql2restOptions);
```
Use ``path.resolve(__dirname, <PATH>)`` for relative paths.

All fields in `options` are optional, but init() will not be able to run without a valid manifest file and gqlGeneratorOutputFolder previously populated by `generateGqlQueryFiles()`.



# Tutorial

 - **[Getting started: quick start & working example](docs/Getting%20started.md)**
 - **[The manifest file](docs/The%20manifest%20file.md)**
	 - [How parameters are passed](docs/How%20parameters%20are%20passed.md)
	 - [Mapping and renaming parameters](docs/Mapping%20and%20renaming%20parameters.md)
	 - [Success and error HTTP status codes](docs/Success%20and%20error%20status%20codes.md)
	 - [Hiding fields in REST responses](docs/Hiding%20fields%20in%20REST%20responses.md)
	 - [Mapping to GraphQL operations using conditional logic](docs/Mapping%20with%20conditional%20logic.md)
	 -  [Using request middleware functions](docs/Middleware%20functions.md)
 - **[Pre-processing step](docs/Pre-processing%20step.md)**
 - **[Generating the REST API with init()](docs/Generating%20REST%20API%20with%20init.md)**
 - [Filtering and shaping the responses on the client side](docs/Client%20filters.md)
 - [Customizing and formatting response format](docs/Formatting%20responses.md)
 - [Using apollo-link to work with a remote GraphQL server](docs/Using%20remote%20GraphQL%20server.md)


## Running tests

```sh
npm test
```
Or, for tests with coverage:
```sh
npm run test:coverage
```
## Benefits

 - GraphQL2REST lets you create a truly RESTful API that might be very different than the original, unchanged GraphQL API, without writing a single line of code.

 - The resulting REST API enjoys the built-in data validation provided by GraphQL due to its strong type system. Executing a REST API call with missing or incorrect parameters automatically results in an informative error provided by GraphQL (which can be custom formatted to look like REST).

 - An old REST API can be migrated to a new GraphQL API gradually, by first building the GraphQL API and using GraphQL2REST to generate a REST API on top of it, seamlessly. That new REST API will have the same interface as the old one, and the new implementation can then be tested, endpoints migrated in stages, until a full migration to the underlying GraphQL API takes place.


## Limitations and Known Issues
•  No support for subscriptions yet – only queries and mutations


## Acknowledgments

 - The pre-processing step of this library is  based on [timqian/gql-generator](https://www.npmjs.com/package/gql-generator).

## Contact
For inquiries contact author Roy Mor (roy.mor@sisense.com).

## Release History

* 0.6.1
    * First release as open source



## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

<!-- Markdown link & img dfn's -->
[npm-image]: https://img.shields.io/npm/v/graphql2rest.svg?style=flat-square
[npm-url]: https://npmjs.org/package/graphql2rest
[npm-downloads]: https://img.shields.io/npm/dm/graphql2rest.svg?style=flat-square
[travis-image]: https://img.shields.io/travis/sisense/graphql2rest/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/sisense/graphql2rest
[wiki]: https://github.com/sisense/graphql2rest/wiki

## License
Distributed under MIT License. See `LICENSE` for more information.

(c) Copyright 2020 Sisense Ltd
