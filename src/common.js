const pretty = (str) => {
	try {
		return '\n' + JSON.stringify(str, null, 4);
	} catch (e) {
		return str;
	}
};

const isArrayWithEmptyObjs = (array) => {
	if (!array || !Array.isArray(array) || !array.length) return false;
	for (let i = 0; i < array.length; i += 1) {
		if (JSON.stringify(array[i]) !== '{}') return false;
	}
	return true;
};

module.exports = { pretty, isArrayWithEmptyObjs };
