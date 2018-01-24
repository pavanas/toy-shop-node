module.exports = function () {

	return {
		check: (req, res, next) => {
			if(req.session.userId) {
				res.locals.loggedin = true;
				res.locals.name = req.session.name;
				res.locals.user = req.session.userId;
				res.locals.image = req.session.image;
			} else {
				console.log(req.app.locals);
				res.locals.loggedin = false;
			}
			return next();
		}
	};
}