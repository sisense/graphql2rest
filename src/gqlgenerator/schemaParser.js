
let gqlSchema;
let depthLimit;

const init = (schema, limit) => {
	gqlSchema = schema;
	depthLimit = limit;
};

/**
 * Compile arguments dictionary for a field
 * @param field current field object
 * @param duplicateArgCounts map for deduping argument name collisions
 * @param allArgsDict dictionary of all arguments
 */
const getFieldArgsDict = (
	field,
	duplicateArgCounts,
	allArgsDict = {},
) => field.args.reduce((o, arg) => {
	if (arg.name in duplicateArgCounts) {
		const index = duplicateArgCounts[arg.name] + 1;
		duplicateArgCounts[arg.name] = index;
		o[`${arg.name}${index}`] = arg;
	} else if (allArgsDict[arg.name]) {
		duplicateArgCounts[arg.name] = 1;
		o[`${arg.name}1`] = arg;
	} else {
		o[arg.name] = arg;
	}
	return o;
}, {});

/**
 * Generate variables string
 * @param dict dictionary of arguments
 */
const getArgsToVarsStr = dict => Object.entries(dict)
	.map(([varName, arg]) => `${arg.name}: $${varName}`)
	.join(', ');

/**
 * Generate types string
 * @param dict dictionary of arguments
 */
const getVarsToTypesStr = dict => Object.entries(dict)
	.map(([varName, arg]) => `$${varName}: ${arg.type}`)
	.join(', ');

/**
 * Generate the query for the specified field
 * @param curName name of the current field
 * @param curParentType parent type of the current field
 * @param curParentName parent name of the current field
 * @param argumentsDict dictionary of arguments from all fields
 * @param duplicateArgCounts map for deduping argument name collisions
 * @param crossReferenceKeyList list of the cross reference
 * @param curDepth currentl depth of field
 */
const generateQuery = (
	curName,
	curParentType,
	curParentName,
	argumentsDict = {},
	duplicateArgCounts = {},
	crossReferenceKeyList = [], // [`${curParentName}To${curName}Key`]
	curDepth = 1,
) => {
	const field = gqlSchema.getType(curParentType).getFields()[curName];
	const curTypeName = field.type.inspect().replace(/[[\]!]/g, '');
	const curType = gqlSchema.getType(curTypeName);
	let queryStr = '';
	let childQuery = '';

	if (curType.getFields) {
		const crossReferenceKey = `${curParentName}To${curName}Key`;
		if (crossReferenceKeyList.indexOf(crossReferenceKey) !== -1 || curDepth > depthLimit) return '';
		crossReferenceKeyList.push(crossReferenceKey);
		const childKeys = Object.keys(curType.getFields());
		childQuery = childKeys
			.map(cur => generateQuery(cur, curType, curName, argumentsDict, duplicateArgCounts,
				crossReferenceKeyList, curDepth + 1).queryStr)
			.filter(cur => cur)
			.join('\n');
	}

	if (!(curType.getFields && !childQuery)) {
		queryStr = `${'    '.repeat(curDepth)}${field.name}`;
		if (field.args.length > 0) {
			const dict = getFieldArgsDict(field, duplicateArgCounts, argumentsDict);
			Object.assign(argumentsDict, dict);
			queryStr += `(${getArgsToVarsStr(dict)})`;
		}
		if (childQuery) {
			queryStr += `{\n${childQuery}\n${'    '.repeat(curDepth)}}`;
		}
	}

	/* Union types */
	if (curType.astNode && curType.astNode.kind === 'UnionTypeDefinition') {
		const types = curType.getTypes();
		if (types && types.length) {
			const indent = `${'    '.repeat(curDepth)}`;
			const fragIndent = `${'    '.repeat(curDepth + 1)}`;
			queryStr += '{\n';

			for (let i = 0, len = types.length; i < len; i++) {
				const valueTypeName = types[i];
				const valueType = gqlSchema.getType(valueTypeName);
				const unionChildQuery = Object.keys(valueType.getFields())
					.map(cur => generateQuery(cur, valueType, curName, argumentsDict, duplicateArgCounts,
						crossReferenceKeyList, curDepth + 2).queryStr)
					.filter(cur => cur)
					.join('\n');
				queryStr += `${fragIndent}... on ${valueTypeName} {\n${unionChildQuery}\n${fragIndent}}\n`;
			}
			queryStr += `${indent}}`;
		}
	}
	return {
		queryStr,
		argumentsDict
	};
};

module.exports = { getVarsToTypesStr, generateQuery, init };

