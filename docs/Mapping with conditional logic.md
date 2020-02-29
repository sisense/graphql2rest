## Mapping to GraphQL operations using conditional logic

GraphQL2REST allows you to use conditional logic clauses **on the request parameters** to determine whether a GraphQL operation mapped to a REST API route should be invoked. 

The condition is tested on the aggregate of all request parameters (path, query and body), and is expressed using [MongoDB query language](https://docs.mongodb.com/manual/reference/operator/query/) query operators. 

In the most common use case, we would like to map a single REST endpoint to two (or more) GraphQL operations but only invoke one of them based on the value or existence of a parameter (or field) in the payload. 

To create such a decision tree, use an array of operations instead of one `operation` field in the `endpoints` section of the manifest.  
<br>


Use the `condition` property to specify a condition on the request parameters object. The associated GraphQL operation will be invoked only if the condition is evaluated TRUE. 

The general format of the condition is:
>condition: { 
        [condition to test]    (in MongoDB query language)
} 

Specifically: 
>condition: {
    [parameter_name] : { 
         [condition_test_on_the_parameter_value]
}
}

Where *parameter_name* is any parameter from the body, query or path params, and *condition_test_on_the_parameter_value* is expressed with  [MongoDB query operators.](https://docs.mongodb.com/manual/reference/operator/query/)

<br>

### Example: 

Assume we want to add a `GET /datasets` endpoint, and map it to a corresponding GraphQL operation. 

Consider these two GraphQL queries defined in the schema:
```graphql
type Query {
	listDatasetsLegacy(): [OldDataset]!
	listDatasets: [Dataset]!
}
```
The first one is a legacy query, which we want to call if the user provides a query parameter "type" which has the values "old" or "v1". However, if the "type" parameter equals to "v2" or "new", `listDatasets()` should be called. Only one query should be invoked per REST call.


#### Example 
```json
"/datasets": {
	"get": {
		"operations": [{
				"operation": "listDatasetsLegacy",
				"condition": {
					"type": {
						"$in": ["old", "v1"]
					}
				}
			},
			{
				"operation": "listDatasets",
				"condition": {
					"type": {
						"$in": ["new", "v2"]
					}
				}
			}
		]
	}
}
```
This way, `GET /datasets?type=old` will invoke `listDatasetsLegacy()` and `GET /datasets?type=new` will invoke `listDatasets()`. In this case only one query will be invoked.

### How logical evaluation works 
Operations in the `operations[]` array are inspected sequentially in the order they are specified in the manifest file. Each operation with a condition is evaluated, and invoked if the condition is true. This means that multiple operations can be invoked one after another. If you wish to invoke only one GraphQL operation, make sure that there are mutually exclusive conditions on each of the operations in the array (so only one can be evaluated TRUE per REST API call). 

In the example below, we use a mutually exclusive condition (on the existence of a parameter) to select the right GraphQL operation. Executing *GET /documents* will list all documents by calling the `listAllDocuments()` GraphQL query, while  *GET /documents?title=myTitle* will invoke the `getDocumentByTitle()` query with the `title` argument "myTitle", thereby getting only a single document by its title. 

This way we are able to keep our API fully RESTful where we have a single endpoint for the "documents" resource, and the GET /documents endpoint performs all document-related read-only operations. 

```json
"/documents": {
  	"get": {
  		"operations": [{         
  				"operation": "getDocumentByTitle", 
  				"condition": {  
  					"title": {
  						"$exists": true
  					}
  				}
  			},
  			{
  				"operation": "listAllDocuments",
  				"condition": {
  					"title": {
  						"$exists": false
  					}
  				}
  			}
  		]
  	}
  }
```

<br>

Next: read about [using middleware functions on the request](Middleware%20functions.md) or jump to [the pre-processing step](Pre-processing%20step.md).
