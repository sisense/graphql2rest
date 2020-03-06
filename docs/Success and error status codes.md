## Successful Responses and Status Codes

While GraphQL adopts a "best-effort" approach where an operation can partially succeed (or partially fail), REST is an "all or nothing" world where the request either succeeds (with a 2XX status code and some data returned, if applicable) or fails (with a 4XX or 5XX status code and an error message).

To bridge this gap when converting from GraphQL to REST, we define a response as "successful" **if the original GraphQL response has a non-empty "data" object, that includes at least one defined field (which is not null and not undefined).** (This GraphQL response may or may not have an "errors" array.)

By default, successful responses are formatted to look like standard REST responses (flat JSON object or array, with no extra 'errors' array), but that formatting can be modified and customized by providing your own `formatDataFn` function to `GraphQL2REST.init()`.

<br>

### Changing the HTTP status code of a successful request
By default, a successful GraphQL operation will result in a *200 OK* HTTP status code. If you want to change the status code, you can do so in the `endpoints` section of manifest file using the `successStatusCode` property: 

```
"/users": 
	"post": {
		"operation": "addUser",
		"successStatusCode": 201 
	}
```
<br>

### Mapping GraphQL error codes to HTTP  status codes
Apollo, Hasura and other GraphQL servers allow [defining granular errors codes (strings)](https://www.apollographql.com/docs/apollo-server/data/errors/#codes) in the `code` field of the `errors.extensions`,  which helps categorizing errors. GraphQL2REST can use this extensions error code to map to HTTP status codes and add an optional error message. Since the result of a GraphQL operation can be an array of errors, only the first error in GraphQL's `errors` array is considered for this mapping. 



The optional “`errors`” section in the manifest files is used to specify this mapping, under the `"errorCodes"` object:
```json
"errors": {
	"errorCodes": {
		"INTERNAL_DB_ERROR": {
			"httpCode": 500 
		},
		
		"USER_UNAUTHENTICATED": {
			"httpCode": 401,
			"errorDescription": "Forbidden: Unauthorized access",
		}
	}
}  
```
In the above example, INTERNAL_DB_ERROR is mapped to "500 Internal Server Error" (no added errorDescription string) and USER_UNAUTHENTICATED will result in a "401 Unauthorized" error with the string `"Forbidden: Unauthorized access"` added to the erroneous REST response.

GraphQL2REST looks for the value of the GraphQL error code in the property defined in `"graphqlErrorCodeObjPath"` field in the `options` object passed to *init()*. If it is missing or `options` is not passed, it will look for it in *(errorResponseObj)*.`errors[0].extensions.code` by default. 

By default, a  _400 Bad Request_  HTTP status code will be returned for all client errors, and a  _500 Internal Server Error_  will be returned for errors in the server or uncaught exceptions. This default behavior also applies for GraphQL error codes that have no mappings (or if the "errors" object in manifest.json is empty).


<br>

### Error formatting
By default, GraphQL errors are passed unchanged in the REST API, but they can be formatted and customized by providing your own `formatErrorFn` function in `GraphQL2REST.init()`. 
<br>
<br>
 
**Next:** read about [hiding fields in REST responses](Hiding%20fields%20in%20REST%20responses.md) or jump to [the pre-processing step](Pre-processing%20step.md).


---


<br>

[Back to [the tutorial](https://github.com/sisense/graphql2rest#tutorial)]
 