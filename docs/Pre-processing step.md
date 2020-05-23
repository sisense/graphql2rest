## Pre-processing step

First, GraphQL2REST needs to do some one-time preprocessing. It reads your GraphQL schema and generates .gql files containing all client operations (queries and mutations). These are "fully-exploded" GraphQL client queries that expand all fields in all nesting levels and all possible variables, per each Query or Mutation type.

This is achieved by running the *generateGqlQueryFiles()* function:
```js
GraphQL2REST.generateGqlQueryFiles(schema, './gqlFilesFolder');
```
Now the ./gqlFilesFolder contains an index.js file and subfolders for queries and mutations, containing .gql files corresponding to GraphQL operations.

*generateGqlQueryFiles()* has to be executed **just once**, or when the GraphQL schema changes  (it can be executed offline by a separate script or at "build time").

### Example:

```js
import  GraphQL2REST from 'graphql2rest';
import { schema } from './myGraphQLSchema.js';

// assumes that 'schema' is an object of type GraphQLSchema.
// For a schema in String form (in Schema Language Format), run 'buildSchema()' on it first
// to get a GraphQLSchema object.

const  GQL_FILES_FOLDER = './gqlFilesFolder'; // this is where .gql files will be stored

// a one-time pre-processing step:
GraphQL2REST.generateGqlQueryFiles(schema, GQL_FILES_FOLDER);
```

After generateGqlQueryFiles() is executed, the folder `./gqlFilesFolder` is created as well as the following folders and `index.js` file:
```
├── gqlFilesFolder/
│   ├── mutations/
│   ├── queries/
│   ├── subscriptions/
│   └── index.js
```
Each of the folders `mutations`, `queries`, `subscriptions` contains .gql files representing fully exploded GraphQL client queries generated from the GraphQL schema.

After `generateGqlQueries`  is executed once, `GraphQL2REST.init()` can be invoked at runtime to read the contents of ./gqlFilesFolder into memory and generate the Express router with REST API routes, according to the definitions in the manifest file.

### `generateGqlQueryFiles()` options
The pre-processing function `generateGqlQueryFiles()` accepts four parameters (2 are optional):

 * **`gqlSchemaObj`** GraphQL schema object (of type GraphQLSchema)
 * **`destinationDirPath`** path of folder where subfolders and GQL files will be created
 * **`depthLimitArg`** (optional) recursion depth limit (default is 100)
 * **`optionalWinstonLogger`** (optional) instance of winston logger to log to
 
**Specify a smaller `depthLimitArg` value to limit the recursion depth when dealing with a GraphQL schema with circular references, or when the GraphQL API has a small query depth limit (otherwise, fully exploded client queries might fail because they will exceed the allowed depth.)** 
 
 The function returns `true` if successful, `false` otherwise.

<br>

Next: [generating the REST API with init()](Generating%20REST%20API%20with%20init.md)


---


<br>

[Back to [the tutorial](https://github.com/sisense/graphql2rest#tutorial)]
 
