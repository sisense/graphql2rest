
## Hiding fields in REST responses

A common use case is where a GraphQL API is used internally, then GraphQL2REST is used to expose a public REST API based on it. In this case we may want to hide certain fields in the GraphQL response from users of the external REST API.

To hide fields, use the `hide` property in the `endpoints` section of the manifest file. `hide` is an array of fields to filter out of the response. For nested fields, use dot notation ("parent.child1.child2").

Example:

```json
"/users/:id/configurations": {
	"get": {
		"operation": "getUserConfig",
		"hide": ["internalId", "secrets.creditCardNum"]
	}
}
```


<br>

Next: read about [mapping to GraphQL operations using conditional logic](Mapping%20with%20conditional%20logic.md) or jump to [the pre-processing step](Pre-processing%20step.md).


