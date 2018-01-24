const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); 
const async = require('async');
const mailgun = require('mailgun-js');
const user = require('../models/users');
const product = require('../models/products');
const store = require('../models/stores');
const cart = require('../models/cart');
const error_resp = require('../helpers/err_resp.js')();
const has_session = require('../helpers/session_check')();

// Mailgun keys
const mail_keys = require('../mail_keys.json');

// get all products + stores
router.get('/', has_session.check, (req, res) => {
	
	// get products and stores info
	async.parallel({
		products: function(callback) {
			product.find({"activated": 1}).select('id name description category value image_thumbs').exec(callback);
		},
		stores: function(callback) {
			store.find({'activated': 1}).
			populate('seller', 'username').select('name description image username').
			exec(callback);
		}
	}, function(err, results) {
		if(err) {
			res.status(200).render('index', error_resp.create('error', `Products and stores could not be retreived`));
		} else {
			res.status(200).render('index', {"products": results.products, "stores": results.stores});
		}
	});
});

router.get('/register', (req, res) => {
	res.render('register', {});
});

// register user
router.post('/user/register', (req, res, next) => {
	const params = req.body;

	console.log(params);

	// check inputs
	if(params.username.match('<script>') != null) {
		res.status(200).json(error_resp.create('error', `Can't use this username`));
	}
	if(params.password.length < 8) {
		res.status(200).json(error_resp.create('error', `Password length too short. Minimun length required 8 characters`));
	}
	if(params.email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i) == null) {
		res.status(200).json(error_resp.create('error', `Please introduce a valid email address`));
		next();
	}

	const salt = bcrypt.genSaltSync(10);

	const new_user = new user({
		"credentials.username": params.username,
		"credentials.password": bcrypt.hashSync(params.password, salt),
		"credentials.email": params.email,
		"profile": 3
	});

	new_user.save( (err, user ) => {
		if(err) {
			if(err.code === 11000 || err.code === 11001) {
				res.status(409).json(error_resp.create('error', 'There is a user registered with the provided email'));
				
			} else {
				res.status(500).json(error_resp.create('error', 'Internal server error!'));
			}
		} else {

			// send confirmation mail
			const mail = new mailgun({apiKey: mail_keys.api_key, domain: mail_keys.domain});
			const data = {
		      	from: mail_keys.sender,
		     	to: 'gorrllzz@gmail.com',
		    //Subject and text data  
		      subject: 'Verify you user in ToyShop',
		      html: 'Validate you user following this link: <a href="http://127.0.0.1:4000/admin/user/verify/' + params.email + '">Validate!</a>'
		    }
		    mail.messages().send(data, (err, body) => {
		    	if(err) {
		    		console.log(err);
		    		res.status(500).render('register', error_resp.create('error', 'Internal server error!'));
		    	} else {
		    		res.status(200).redirect('/');
		    	}
		    });
		}
	});

});

router.get('/login', (req, res) => {
	res.render('login');
});

// user login
router.post('/user/login', (req, res) => {
	const params = req.body;

	// Check if user exists in the database
	if(params.email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i) == null) {
		res.status(200).json(error_resp.create('error', `Please introduce a valid email address`));
	} else {
		user.findOne({'credentials.email': params.email}).exec().then(function(user) {
			if(bcrypt.compareSync(params.password, user.credentials.password)) {
				req.session.userId = user._id;
				req.session.name = user.credentials.username;
				req.session.image = user.info.image_url;
				res.status(200).redirect('/');
			} else {
				throw new Error('error');
			}
		})
		.catch(function(err) {
			console.error(err);
			res.status('404').render('login', error_resp.create('error', 'cannot find user with this email'));
		});

	}
});

// user logout
router.get('/user/logout', (req, res) => {
	req.session.destroy((err) => {
		if(err) {
			console.error('Something went wrong');
			res.render('/', error_resp.create('error', 'cannot delete session'));
		} else {
			res.locals.loggedin = false;
			res.redirect('/');
		}
	});

});

// view product
router.get('/product/:product', (req, res) => {
	const prod_id = req.params.product;

	product.findOne({"_id": prod_id}).select("name description category tags stock value images location.coordinates seller store").
	exec().then((prod) => {
		// translate coordinates to address before
		res.status(200).render('product-simple', {"product": prod});
	}).catch((err) => {
		res.status(500).render('product-simple', error_resp.create('Error', 'No product returned'));
	});
});

// view store
router.get('/store/:store', (req, res) => {
	const store_id = req.params.store;

	store.find({"_id": store_id}).select("name description image seller").populate("seller", "credentials.username info.image_url").
	exec().then((str) => {
		// translate coordinates to address before
		res.status(200).render('store-simple', {"store": str});
	}).catch((err) => {
		res.status(500).render('store-simple', error_resp.create('Error', 'No store returned'));
	});
});

// view shopping cart
router.get('/cart/:cart', (req, res) => {
	const cart_id = req.params.cart;

	cart.findOne({"_id": cart_id}).populate('products', 'name description value images').exec().
	then((info) => {
		res.status(200).render('cart', {"cart": info});
	}).catch((err) => {
		res.status(500).render('cart', error_resp.create('Error', "No info about this cart found"));
	});
});

// add to shopping basket
router.post('/cart/', (req, res) => {
	const params = req.body;
	// get current cart
	cart.findOne({"buyer": params.buyer_id, "checkout": 0}).exec().then((crt) => {
		//update product list
		cart.update({"_id": crt._id}, {$set: {"products": params.prod_id}}, (err, cart) => {
			if(err) {
				res.status(500).render(params.view, error_resp.create('error', `Cart could not be updated`));
			} else {
				res.status(200).render(params.view, {"message": "Product added to cart successfully!"});
			}
		});
	}).catch((err) => {
		res.status(500).render(params.view, error_resp.create('error', `Could not find cart`));
	});

});

// finish buying
router.post('/checkout/', (req, res) => {
	const params = req.body;

	// Update stock value of each product in the cart
	for(prod of params.products) {
		product.findOne({"_id": prod_id}).select("stock").exec().then((prd) => {
			product.update({"_id": prod._id}, {$set: {"stock": (prd.stock - prod.quant), "bought_by": params.buyer_id}}, 
				(err, product_r) => {
					if(err) {
						throw err;
					}
			});
		})
	}

	cart.update({"_id": params.cart_id}, {$set: {"checkout": 1}}, (err, cart) => {
		res.status(200).render('cart', {"message": "Checkout completed successfully!"});
	});
});

module.exports = router;

