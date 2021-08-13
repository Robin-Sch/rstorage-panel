const cleanPath = (path) => {
	if (!path) path = '/';
	if (!path.startsWith('/')) path = `/${path}`;
	if (!path.endsWith('/')) path = `${path}/`;

	return path;
};

module.exports = {
	cleanPath,
};