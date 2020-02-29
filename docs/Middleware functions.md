## Using middleware functions on the requests

The `params` property in the `endpoints` section of the manifest lets you rename and map REST parameters corresponding to GraphQL operations arguments.

However, for some REST requests we might need to do a more complex parameter mapping that is hard to express in the manifest, or manipulate arguments on the request object before they are passed to the GraphQL's *execute*() function. One example is where our REST endpoints is designed to receive a simple query parameter, but the corresponding GraphQL operation expects that parameter to be wrapped within an object. 

You can use a middleware function on the REST request to handle this situation.

First, create a `middlewares.js` file and call init() with the *options* argument specifying the pathname of that file in the `middlewaresFile` property of *options*:

```js
const gql2restOptions  = {
	// ...
	middlewaresFile:  './middlewares.js', 
	// ...
};

//const expressRouter = GraphQL2REST.init(schema, execute, gql2restOptions);
```
Use ``path.resolve(__dirname, <PATH>)`` for relative paths.

Then add your middleware function to `middlewares.js`. 

<br>

Middleware functions accept `(req, route, verb, operation)` and should return the Express request object modified by the function.

 - `req` is the Express request object 
 - `route` is the REST endpoint route 
 - `verb` is the HTTP method 
 - `operation` is the GraphQL operation name

`route`, `verb` and `operation` are read-only and should not be modified.
 
Example:
```js
const someMiddlewareFunc = (req, route, verb, operation) => {
    // ... insert your logic here 
    // possibly modify req object:
    // req.body.newParam = { obj: val } 
    return req;
}
```
(The GraphQL operation will get argument `newParam` which is an object `{ obj: val }`.)

<br>


Next, edit the entry for the endpoint you want add middleware to, in the manifest file:

```json
 "/users": {
 	"post": {
 		"operation": "createUser",
 		"requestMiddlewareFunction": "someMiddlewareFunc"
 	}
 },
```
When **POST /users** is invoked, function "`someMiddlewareFunc`" will be executed before passing the request to GraphQL server with the modified `req` object. 

<br>


Next: [the pre-processing step](Pre-processing%20step.md).

