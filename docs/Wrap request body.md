
## Wrapping the request body before passing it to GraphQL


Consider this GraphQL mutation and GraphQL2REST manifest entry:
```json
type Mutation {
	createUser(userData: UserDataInput!): User
}

input UserDataInput {
	name: String
	dateOfBirth: Date
}
```


```
"endpoints": {
		"/users": {
			"post": {
				"operation": "createUser",
				"wrapRequestBodyWith": "userData",
				"successStatusCode": 201
			}
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
<br>

This way we can map a flat REST body to a specific object argument in the GraphQL operation. 
