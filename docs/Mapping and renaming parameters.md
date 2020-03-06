## Mapping and renaming parameters
By default, parameters are passed as is from the REST request to the GraphQL operation (parameter names are matched).

However, sometimes we want to use different parameter names in the REST API than in the GraphQL operation.

The `params` property (object) in the `endpoints` section of the manifest allows renaming parameter names. The format is *"GraphQL-param-name"***:** *"REST-param-name"*.

For example, given this GraphQL mutation:
```graphql
makeConfiguration(configId: Int!, confCount: Int, configData: [String]!)
```
We can use "params" in the manifest this way:
```js
"/configurations/:id": {
   "post": {
      "operation": "makeConfiguration",
      "params": {
	      "configId": "id",     // maps :id route param to "configId" in GraphQL
	      "confCount": "count", // renames "confCount" to "count" in REST,
	      "configData": "strings" // renames "configData" to "strings" in REST
      }
    }
 }
```

 So that the following REST request can be invoked:
 ```
POST /configurations/61728?count=2
{
	"strings": ["data1", "data2"]
}
```

The resulting GraphQL call is:

 `makeConfiguration(configId: 61728, confCount: 2, configData: ["data1", "data2"])`.

To further customize how parameters are passed to the GraphQL operation, you can use a [request middleware function.](Middleware%20functions.md)

### Omitting REST parameters
Sometimes we want to omit ceratin parameters (fields) passed in the REST request, so that they are not passed to the corresponding GraphQL operation. This can be handy if we need the corresponding GraphQL operation to ignore some parameters (because the GraphQL operation signature does not have those arguments sent in by REST, and would otherwise fail).

We can use the value  `"__DELETED__"`  in the `"params"` object to signify fields to omit (delete) before they are passed to GraphQL. To omit nested fields, use dot notation ("parent.child1.child2").

For example:

```json
"/configurations/:id": {
   "patch": {
      "operation": "updateConfiguration",
      "params": {
	      "configId": "id",
	      "createdAt": "__DELETED__" ,
	      "owner.main.createdAt": "__DELETED__"
      }
    }
 }
```
In this case above, if the REST request contains the parameters "`createdAt`" or "`owner.main.createdAt`" anywhere (in the body, or as query or path parameters), they will be deleted before passing the request payload to GraphQL.

<br>

Next: read about [success and error HTTP status codes](Success%20and%20error%20status%20codes.md) or jump to [the pre-processing step](Pre-processing%20step.md).


---


<br>

[Back to [the tutorial](https://github.com/sisense/graphql2rest#tutorial)]
 