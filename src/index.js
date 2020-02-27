const GraphQL2REST = require('./graphql2rest');
const { generateGqlQueryFiles } = require('./gqlgenerator');

const { init } = GraphQL2REST;

module.exports = { init, generateGqlQueryFiles };
