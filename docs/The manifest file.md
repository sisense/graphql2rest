## Mapping to a GraphQL Schema

Let's assume this is your GraphQL schema:

```graphql
type Query {
	getUser(userId: UUID!): User
	listAllUsers: [User]
}

type Mutation {
	createUser(userData: UserDataInput!): User
	removeUser(userId: UUID!): Boolean
	updateUser(id: UUID!, userData: UserDataInput): Boolean

}

type User {
	id: UUID!
	name: String
}

input UserDataInput {
	name: String
	dateOfBirth: Date
}

scalar Date
scalar UUID
```
We would like to create a truly RESTful API that has all CRUD operations for the **"users"** resource. Namely:
> GET /api/users

> GET /api/users/{userId}

> POST /api/users

> PATCH /api/users/{userId}

> DELETE /api/users/{userId}


The first step step is to edit the `manifest.json` file to reflect our desired REST API:

```json
{
	"endpoints": {
		"/users": {
			"get": {
				"operation": "listAllUsers"
			},

			"post": {
				"operation": "createUser",
				"wrapRequestBodyWith": "userData",
				"successStatusCode": 201
			}
		},

		"/users/:userId": {
			"get": {
				"operation": "getUser"
			},

			"patch": {
				"operation": "updateUser",
				"params": {
					"id": "userId"
				},
				"wrapRequestBodyWith": "userData"
			},

			"delete": {
				"operation": "removeUser",
				"successStatusCode": 204
			}
		}
	}
}
```
The main section in the manifest file is the `endpoints` object. Inside it, each REST API route gets an entry (*"/users"*), with optional path (route)  parameters specified in [Express notation](https://expressjs.com/en/guide/routing.html)  (*"/users/:userId"*).

Each  REST API route entry is an object, with HTTP methods as its keys: `get`, `post`, `patch`, `put`, `delete`.  So each route + HTTP method defines a REST API route to be mounted on the Express router returned by `GraphQL2REST.init()`.


The HTTP method key is an object, with properties defining the behavior of this specific HTTP route. The only mandatory property (field) is the "operation" key, which pertains to the GraphQL operation (query or mutation) to invoke.

While we want our final API routes to look like "`/api/users/`", in the manifest we omitted the `"/api"` prefix, because we can add it later globally in the init() function's `options` object. This is useful when customizing or versioning the API (adding `/api/v1`, `/api/v2`) while keeping the same route structure.

### Detailed explanation of the manifest file above:
>#### GET /users
Here we defined a GET /users HTTP route, which is mapped to the "listAllUsers" GraphQL query. Whenever GET /users is requested, listAllUsers() will be invoked and its response will be returned as the REST API response. Since there is no "successStatusCode" field for this API path, it will return 200 OK by default if the operation completes successfully.

```
"/users": {
	"get": {
		"operation": "listAllUsers"
	}
```

**"Completes successfully"** is defined by us as a GraphQL response with a "data" object which includes at least one non-null field. The response may or may not have an "errors[]" array. If it it does have non-empty "data" and "errors" array, the "errors" array will be omitted from the REST response. By default, successful responses are formatted to look like standard REST responses (flat JSON object or array, with no extra 'errors' array), but that formatting can be customized in GraphQL2REST.

If the response received from GraphQL server has no "data" object (or the "data" object only include "null"-valued fields), the response is deemed to be an error response (did not complete successfully) and an error HTTP status code will be returned by the REST router along with the error message response. The format of the error response from GraphQL can be customized in GraphQL2REST.


---
>#### POST /users


We are still under the "/users" object here, so this defines a POST /users HTTP route, mapped to the GraphQL mutation "createUser". Whenever createUser() completes successfully upon `POST /users` request, it will return a *201 Created* HTTP status code.

```
"post": {
	"operation": "createUser",
	"wrapRequestBodyWith": "userData"
	"successStatusCode": 201
	}
```
`"wrapRequestBodyWith"` is used here to wrap the HTTP body in the request with a "userData" property (`userData: { ... }`) before passing the request to createUser(). This allows the user to provide a flat body that looks like this:
```json
{
	"name": "Roy Fielding",
	"dateOfBirth": "09-01-1965"
}
```
Which is what we expect of REST request, rather than these fields within a `"userData"` object. When *createUser()* is finally invoked, it is called with the following arguments:
```json
{
	"userData":
	{
		"name": "Roy Fielding",
		"dateOfBirth": "09-01-1965"
	}
}
```
---
>#### GET /users/{userId}

GET /users/{userId} is defined in the segment below. `:userId` is a path parameter, and since its name is the same as a parameter in the *getUser()* GraphQL query, it is mapped directly (its value is copied to `userId` when getUser() is invoked). Here too, a default 200 OK HTTP status code will be returned if the request is successful.
```
"/users/:userId": {
	"get": {
		"operation": "getUser"
	},
```

---
>#### PATCH /users/{userId}
We are still under `/users/:userId`, so the segment below defines PATCH /users/{userId}. Here too we wrap the request body with a "userData" property, so as to allow a flat REST request.

Because the route parameter's name is `"userId"` but *updateUser()* GraphQL mutation  has a parameter named "id", we use the "params" property to map `"id`" on the GraphQL side to `"userId"` on the REST side. The value of the route parameter `:userId` will be copied into the value of "id" (a UUID type) in the *updateUser()* mutation.

Here, *userId* is a route parameter (path param), but the "params" object can be used to rename any number and type of parameters (body, query, path) so that the REST request can be quite different from the corresponding GraphQL operation.
```
"patch": {
	"operation": "updateUser",
	"params": {
		"id": "userId"
	},
	"wrapRequestBodyWith": "userData"
},
```

----
>#### DELETE /users/{userId}

Finally, the DELETE /users/{userId} endpoint is mapped to the *removeUser*() GraphQL mutation. Since *removeUser()* accepts a "userId" parameter, and `":userId"` is the name of the path parameter for this route in the manifest, the value of that REST path parameter will be copied directly (no need to use a "params" property) and passed as is to the mutation. If the removeUser() operation is successful, that endpoint is set to return a 204 No Content HTTP status code.

```
"delete": {
	"operation": "removeUser",
	"successStatusCode": 204
}
```
The resulting manifest.json is [_here_.](manifest-example.json)

<br>

Next: read about [how parameters are passed](How%20parameters%20are%20passed.md) or jump to [the pre-processing step](Pre-processing%20step.md).
