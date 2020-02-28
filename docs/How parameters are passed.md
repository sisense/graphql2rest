## How parameters are passed
Parameters in a REST HTTP request can be passed in the route (path parameters), in the body, or as query parameters. 

By default, GraphQL2REST aggregates all REST request parameters and passes them as is to the corresponding GraphQL query, trying to match the argument names defined in the GraphQL operation.

To map a REST **path** parameter to a specific argument in a GraphQL operation, simply include the argument name in the path as a route parameter in Express notation (param name preceded by a colon).   

For example, given this GraphQL mutation:
```graphql 
makeConfiguration(id: Int!, count: Int, configData: [String]!) 
```
And this entry in the manifest file `endpoints` section:

```json
"/configurations/:id": {
   "post": {
      "makeConfiguration"
    }
 }
```
The following two REST API requests will invoke this call to makeConfiguration():
 `makeConfiguration(id: 61728, count: 2, configData: ["data1", "data2"]`).  

```
POST /configurations/61728?count=2
{
	"configData": ["data1", "data2"]
}
```
```
POST /configurations/61728
{
	"count": 2,
	"configData": ["data1", "data2"]
}
```
(the value of "id" in `/configurations/:id` is mapped and copied to "id" in *makeConfigurations()*).

Both calls (with `count` in the body and `count` as a query parameter) are valid. Since GraphQL2REST aggregates all REST request parameters and attempts to match them by name to the arguments in the GraphQL operation, theoretically body parameters can be passed as query parameters and vice versa. In practice, the API documentation you provide your users specifies how parameters should be passed to the endpoint, and the users adhere to it.

If you wish to enforce a strict single usage (for example, parameter `count` should be passed only as a query parameter), you can add  Express middleware that enforces validation, but this is usually not required. 

<br>

Next: read about [mapping and renaming parameters](Mapping%20and%20renaming%20parameters.md) or jump to [the pre-processing step](Pre-processing%20step.md).