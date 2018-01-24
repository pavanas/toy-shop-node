module.exports = function () {

	return {
		create: (type ,message) => {
			const resp_obj = {
				'status': type, // error, warning
				'message': message
			};
			return resp_obj;
		}
	};
}