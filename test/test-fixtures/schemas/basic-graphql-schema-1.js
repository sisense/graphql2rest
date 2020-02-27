const schema =
    `type Tweet {
        id: ID!
        # The tweet text. No more than 140 characters!
        body: String
        # When the tweet was published
        date: Date
        # Who published the tweet
        Author: User
        # Views, retweets, likes, etc
        Stats: Stat
    }

    type User {
        id: ID!
        username: String
        first_name: String
        last_name: String
        full_name: String
        name: String @deprecated
        avatar_url: Url
    }

    type Stat {
        views: Int
        likes: Int
        retweets: Int
        responses: Int
    }

    type Notification {
        id: ID
        date: Date
        type: String
    }

    type Meta {
        count: Int
    }

    input TweetRelationship {
        url: Url
        relationshipDate: Date
	}

	input NotificationInput {
		notificationType: Int,
		notificationStr: String
	}

    scalar Url
    scalar Date

    type Query {
        Tweet(id: ID!): Tweet
        Tweets(limit: Int, skip: Int, sort_field: String, sort_order: String): [Tweet]
        TweetsMeta: Meta
		User(id: ID!): User
		Users(limit: Int, skip: Int): [User]!
        Notifications(limit: Int): [Notification]
        NotificationsLegacy(limit: Int, query: String!): [Notification]
        NotificationsMeta: Meta
    }

    type Mutation {
        createTweet (
            tweetBody: String
        ): Tweet
        deleteTweet(id: ID!): Tweet
        markTweetRead(id: ID!): Boolean
        updateTweet(tweetId: ID!) : Boolean
		createTweetRelationship(tweetId1: ID!, tweetId2: ID!, relationship: TweetRelationship!): Boolean
		updateTweetRelationship(tweetId1: ID!, tweetId2: ID!, relationship: TweetRelationship!): Boolean
		createNotification(userId: ID!, notification: NotificationInput!): Boolean
		createNotificationLegacy(userId: ID!, notification: String!): Boolean
		preprocessNotificationsForUser(userId: ID!, command: String!): Boolean
    }`;

module.exports = { schema };
