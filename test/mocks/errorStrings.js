const ERROR_WITH_DATA = `
{
    "errors": [
      {
        "message": "Name for character with ID 1002 could not be fetched.",
        "locations": [ { "line": 6, "column": 7 } ],
		"path": [ "hero", "heroFriends", 1, "name" ],
		"extensions": {
			"code": 5555
		}
      }
    ],
    "data": {
      "hero": {
        "name": "R2-D2",
        "heroFriends": [
          {
            "id": "1000",
            "name": "Luke Skywalker"
          },
          null,
          {
            "id": "1003",
            "name": "Leia Organa"
          }
        ]
      }
    }
  }
  `;


const ERROR_STRING_SINGLE = `
{
	"errors": [{
		"message": "Unauthorized",
		"name": "UnauthorizedError",
		"locations": [{
			"line": 2,
			"column": 3
		}],
		"path": [
			"testGetOperationToFail"
		],
		"extensions": {
			"code": 4003
		},
		"errorDescription": "User is unauthorized. Please use a correct Bearer token."
	}]
}`;


const ERROR_STRING_MULTIPLE = `
{
	"errors": [{
			"message": "Cannot return null for non-nullable field User.id.",
			"name": "BaseError",
			"innerErrors": [{}],

			"locations": [{
				"line": 155,
				"column": 7
			}],
			"path": [
				"testGetOperationToFail",
				118,
				"creator",
				"id"
			],
			"extensions": {
				"code": 1000
			}
		},
		{
			"message": "Cannot return null for non-nullable field User.id.",
			"name": "BaseError2",
			"innerErrors": [{}],
			"locations": [{
				"line": 155,
				"column": 7
			}],
			"path": [
				"testGetOperationToFail",
				119,
				"creator",
				"id"
			],
			"extensions": {
				"code": 2000
			}
		},
		{

			"message": "Cannot return null for non-nullable field User.id.",
			"name": "BaseError3",
			"innerErrors": [{}],

			"locations": [{
				"line": 155,
				"column": 7
			}],
			"path": [
				"testGetOperationToFail",
				120,
				"creator",
				"id"
			],
			"extensions": {
				"code": 3000
			}
		}
	]
}
`;

module.exports = { ERROR_WITH_DATA, ERROR_STRING_MULTIPLE, ERROR_STRING_SINGLE };
