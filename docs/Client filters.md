## Filtering and shaping the response from the client

By default, REST responses are sent to the client as fully expanded JSON objects (with fields expanded at all nesting levels). 

However, GraphQL2REST gives API clients powerful filtering options to get exactly the fields they want, using the **built in client filter** and **JMESPath support.** 

## Built-in client "filter" 

The REST API client can filter on fields in ANY endpoint by using the built-in filter parameter provided by GraphQL2REST. By default, it is a parameter called `"fields"` which accepts an array of comma-separated fields, and it can be passed as a query parameter. For example:

```
GET /flights?fields=destination.city,time 
```
Applies the filter on `"destination.city"` (nested field) and `"time"` field in the response, and will result in a JSON response containing only those fields. 

Note: The built-in filter parameter `"fields"` can also be passed in the body of the request.

<br>

The built-in filter parameter can be applied on JSON responses which are arrays of objects too.

For example, given the following REST request: 

```
GET /albums/?genre=jazz&limit=2 
```
And the resulting response: 
```
[
    {
        "albumId": "7c3f73dd-0b38-48dc-9347-c78811bd80c4",
        "albumName": "Blue Train",
        "artistName": "John Coltrane",
        "tracksNum": 5,
        "releaseData": {
            "labelId": 1042,
            "labelName": "Blue Note"
        },
        "releaseYear": 1958
    },
    {
        "albumId": "7c3f71dc-0b38-48dc-1234-c11211bd80b2",
        "albumName": "Mingus Ah Um",
        "artistName": "Charles Mingus",
        "tracksNum": 9,
        "releaseData": {
            "labelId": 1096,
            "labelName": "Columbia Records"
        },
        "releaseYear": 1959
    }
]
```
If the client wants to filter only on the album name and label, they can run this query with the `fields` filter on `"albumName"` and `"releaseData.labelName"`, like this: 

```
GET /albums/?genre=jazz&limit=2&fields=albumName,releaseData.labelname
```
And the resulting response from the REST API will be:
```
[
    {
        "albumName": "Blue Train",
        "releaseData": {
            "labelName": "Blue Note"
		 }
    },
    {
        "albumName": "Mingus Ah Um",
        "releaseData": {
            "labelName": "Columbia Records"
        }
    }
]
```

<br>

### Changing the name of the built-in filter parameter

The name of the filter parameter can be set in `options` object when calling *init()*. For example, here we change it to "x-filter":
```js
const gql2restOptions = {
	filterFieldName: 'x-filter' //global query parameter name for filtering (default is 'fields')
	// ... more settings
};

const expressRouter = GraphQL2REST.init(schema, execute, gql2restOptions);

// GET /flights?x-filter=destination.city,time 
```

<br>


## Using JMESPath filters

[JMESPath](http://jmespath.org/) is a **query language for JSON** that allows complex filtering, extraction and transformation on JSON documents. This allows the user to filter and shape the responses of the API based on their needs.

JMESPath can be used for basic filtering, and also for slicing, projections, flattening arrays, multi-selections, piping expressions and running functions on the JSON response, all from within the REST request. 

To use a JMESPath expression in a REST API request, use the built-in filter parameter followed by **":" (a colon)** and a valid JMESPath expression. 

That is:

GET /api/v1/users?fields=:`[JMESPATH_EXPRESSION]`

For example: 

``GET /api/v1/users?fields=:people[:2].first``

OR 

``GET api/v1/datamodels/schema?fields=:[].{oid: oid, title: title, columnOids: datasets[].schema.tables[].columns[].oid}``

Note: *The name of the "fields" parameter can be changed. 

As before, a filter parameter with JMESPath expression can also be passed in the body of the request.*

<br>


#### Example
Given the previous JSON request and response: 


Request:
```
GET /albums/?genre=jazz&limit=2 
```
Response:
```
[
    {
        "albumId": "7c3f73dd-0b38-48dc-9347-c78811bd80c4",
        "albumName": "Blue Train",
        "artistName": "John Coltrane",
        "tracksNum": 5,
        "releaseData": {
            "labelId": 1042,
            "labelName": "Blue Note"
        },
        "releaseYear": 1958
    },
    {
        "albumId": "7c3f71dc-0b38-48dc-1234-c11211bd80b2",
        "albumName": "Mingus Ah Um",
        "artistName": "Charles Mingus",
        "tracksNum": 9,
        "releaseData": {
            "labelId": 1096,
            "labelName": "Columbia Records"
        },
        "releaseYear": 1959
    }
]
```
The client can apply the following JMESPath filter on the response:

```
[].albumName | sort(@) | { JazzAlbums: join(', ', @) }
```

By using:
```
GET /albums/?genre=jazz&limit=2&fields=[].albumName | sort(@) | { JazzAlbums: join(', ', @) }
```

And the resulting API response is:
```
{
  "JazzAlbums": "Blue Train, Mingus Ah Um"
}
```

<br>

JMESPath is a powerful language and is useful when dealing with arrays and when filtering on responses with deeply nested arrays and objects. 

To learn more about the power of JMESPath and usage example, read the [JMESPath Tutorial](http://jmespath.org/tutorial.html)  and [JMESPath examples page](http://jmespath.org/examples.html).
