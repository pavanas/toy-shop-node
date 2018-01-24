const express = require('express');
const router = express.Router();
const async = require('async');
const bcrypt = require('bcryptjs');
const WebSocket = require('ws').Server;

const user = require('../models/users');
const product = require('../models/products');
const store = require('../models/stores');
const message = require('../models/messages');

const error_resp = require('../helpers/err_resp.js')();
const has_session = require('../helpers/session_check')();

const ws = new WebSocket({port: 8085});

// 5a652c2507340752c0106eb2

// get all info depending on the type of user
router.get('/:user', has_session.check, (req, res) => {
	if(req.session && req.session.userId) {
		const usr_id = req.params.user;
		// find user profile type
		user.find({"_id": usr_id}).select("profile").exec().then((usr) => {
			switch(usr.profile) {
				case 1: // admin
					async.parallel({
						users: function(callback) {
							user.find({}).sort({"validated": 0, "created_at": "desc"}).exec(callback);
						},
						products: function(callback) {
							product.find({}).sort({"validated": 0, "created_at": "desc"}).exec(callback);
						},
						stores: function(callback) {
							store.find({}).sort({"validated": 0, "created_at": "desc"}).exec(callback);
						},
						messages: function(callback) {
							message.aggregate().group({"_id": "sent_by", "messages": {$push: "$$ROOT"}}).sort({"sent_by": "desc"}).exec(callback);
						},
					}, function(err, results) {
						if(err) {
							res.status(200).render('admin', error_resp.create('error', `Data could not be retreived`));
						} else {

							res.status(200).render('admin', {"products": results.products, "stores": results.stores});
						}
					});
					break;
				case 2: // seller
					async.parallel({
						products: function(callback) {
							product.find({"seller": usr._id}).sort({"created_at": "desc"}).exec(callback);
						},
						store: function(callback) {
							store.find({"seller": usr._id}).exec(callback);
						},
						messages: function(callback) {
							//store.find({}).sort({"sent_by", "sent_at": "desc"}).exec(callback);
							message.aggregate().match({"received_by": usr._id}).group({"_id": "sent_by", "messages": {$push: "$$ROOT"}}).sort({"sent_by": "desc"}).exec(callback);
						},
					}, function(err, results) {
						if(err) {
							res.status(200).render('admin-seller', error_resp.create('error', `Data could not be retreived`));
						} else {

							res.status(200).render('admin-seller', {"products": results.products, "stores": results.store, "messages": results.messages});
						}
					});
					break;
				case 3: // user
					async.parallel({
						products: function(callback) {
							product.find({"bought_by": usr._id}).sort({"created_at": "desc"}).exec(callback);
						},
						messages: function(callback) {
							//store.find({}).sort({"sent_by", "sent_at": "desc"}).exec(callback);
							message.aggregate().match({"received_by": usr._id}).group({"_id": "sent_by", "messages": {$push: "$$ROOT"}}).sort({"sent_by": "desc"}).exec(callback);
						},
						paid: function(callback) {
							product.aggregate().match({"bought_by": usr._id}).group({"_id": null, "total": {$sum: "value" }}).exec(callback);
						}
					}, function(err, results) {
						if(err) {
							res.status(200).render('admin-user', error_resp.create('error', `Data could not be retreived`));
						} else {
							res.status(200).render('admin-user', {"products": results.products, "messages": results.messages, "totalPaid": results.paid});
						}
					});
					break;
				case 4: // guest
					res.status(200).render('error', error_resp.create('error', `You don't have permissions to access admin section`));
					break;
				default: 
					res.status(200).render('error', error_resp.create('error', `You don't have permissions to access admin section`));
					break;
			}
		}).
		catch((err) => {
			res.status(200).render('admin', error_resp.create('error', `There is not user with given id`));
		});
		async.parallel({
			users: function(callback) {
				user.find({}).sort({"validated": 0, "created_at": "desc"}).exec(callback);
			},
			products: function(callback) {
				product.find({}).sort({"validated": 0, "created_at": "desc"}).exec(callback);
			},
			stores: function(callback) {
				store.find({}).sort({"validated": 0, "created_at": "desc"}).exec(callback);
			},
			messages: function(callback) {
				//store.find({}).sort({"sent_by", "sent_at": "desc"}).exec(callback);
				message.aggregate().group({"_id": "sent_by", "messages": {$push: "$$ROOT"}}).sort({"sent_by": "desc"}).exec(callback);
			},
		}, function(err, results) {
			if(err) {
				res.status(200).render('admin', error_resp.create('error', `Data could not be retreived`));
			} else {

				res.status(200).render('admin', {"products": results.products, "stores": results.stores});
			}
		});
		
	} else {
		res.status(404).render('error', error_resp.create('error', `You should login to have access in the admin section`));
	}
});

// users view (for admin)
router.get('/users', (req, res) => {
	user.find({}).select('credentials.username credentials.email info.firstName info.lastName info.address.coordinates info.image_url verified activated').
	sort({"validated": 0, "created_at": "desc"}).exec().then((users) => {
		if(users.length > 0) {
			res.status(200).render('users', {"users": users});
		}
		else {
			res.status(200).render('users', error_resp.create('error', 'No users found'));
		}
	});
});

// user verify
router.get('/user/verify/:email', (req, res) => {
	const user_mail = req.params.email;
	user.findOne({"credentials.email": user_mail}).exec().then((usr) => {
		if(usr || '') {
			console.log(usr);
			user.update({"_id": usr._id}, {$set: {"verified": 1, "activated": 1, "updated_at": Date.now()}}, (err, user) => {
				if(err) {
					console.log(err);
					res.status(200).render('verified', error_resp.create('error', 'Account did not verified successfully'));
				} else {
					// save session
					req.session.userId = user._id;
					app.locals.loggedin = true;
					res.locals.info = {"user": user._id, "name": user.credentials.username, "thumb": user.info.image_url};
					res.status(200).render('verified', {'message': 'Account verified successfully!'});
				}
			});
		}
	}).catch((err) => {
		res.status(500).render('verified', {'message': 'Could not find user with given email'});
	})
});

// user edit view
router.get('/user/edit/:user', (req, res) => {
	const usr_id = req.params.user;
	// get data of product
	user.findOne({usr_id}).select("credentials.username credentials.password credentials.email info.firstName info.lastName info.address info.image_url activated").exec().then((usr) => {
		res.render('user-edit', {"user": usr});
	}).catch((err) => {
		res.status(404).render('user-edit', error_resp.create('error', `Could not find user`));
	});
});

// Update user info
router.post("/user/update", (req, res) => {
	const params = req.body;
	let new_passwd;

	if(params.username && params.password && params.email) {

		// check inputs
		if(params.username.match('<script>') != null) {
			res.status(400).render('user-edit', error_resp.create('error', `Can't use this username`));
		}
		if(params.password.length < 8) {
			res.status(400).render('user-edit', error_resp.create('error', `Password length too short. Minimun length required 8 characters`));
		}
		if(params.email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i) == null) {
			res.status(200).render('user-edit', error_resp.create('error', `Please introduce a valid email address`));
		}
		if(!bcrypt.compareSync(params.password, params.old_password)){ //Check if password changed
			new_passwd = bcrypt.hashSync(params.password, bcrypt.genSaltSync(10));
		}

		user.update({_id: params.user_id}, {$set: 
			{
				"credentials.username": params.username.trim(),
				"credentials.password": (new_passwd || '') ? new_passwd : params.password,
				"credentials.email": params.email,
				"info.firstName": params.firstName,
				"info.lastName": params.lastName,
				"info.address.coordinates": [params.lng, params.lat],
				"image_url": [''],
				"activated": params.activated,
				"updated_at": Date.now()

			}}, (err, usr) => {
			if(err) {
				res.status(404).render('user-edit', error_resp.create('error', `User could not be updated`));
			} else {
				res.status(200).ridirect('user/edit/'+params.user_id, {"message": "User updated successfully"});
			}
		});

	} else {
		res.status(404).render('user-edit', error_resp.create('error', `Mandatory data is missing!`));
	}
});

// products view (admin)
router.get('/products', (req, res) => { // have to make aggregate by store for presenting the products organized by store and populate with seller/user info
	product.find({}).select('name description category tags value stock images location.coordinates validated activated').
	populate('seller', 'credentials.username info.image_url').sort({"validated": 0, "created_at": "desc"}).exec().then((products) => {
		if(products.length > 0) {
			res.status(200).render('products', {"products": products, "profile": 1});
		}
		else {
			res.status(200).render('products', error_resp.create('error', 'No products found'));
		}
	}).catch((err) => {
		res.status(500).render('products', error_resp.create('error', 'Products could not be retreived'));
	});
});

// products view (seller)
router.get('/products/seller/:seller_id', (req, res) => {
	const seller_id = req.params.seller_id;
	product.find({"seller": seller_id}).select('name description category tags value stock images location.coordinates validated activated').
	sort({"validated": 0, "created_at": "desc"}).exec().then((products) => {
		if(products.length > 0) {
			res.status(200).render('products', {"products": products, "profile": 2});
		}
		else {
			res.status(200).render('products', error_resp.create('error', 'No products found'));
		}
	}).catch((err) => {
		res.status(500).render('products', error_resp.create('error', 'Products could not be retreived'));
	});
});

// validate product
router.post('/product/validate', (req, res) => {

	const params = req.body;

	product.update({_id: params.prod_id}, {$set: {"validated": 1, "validated_by": params.user_id, "updated_at": Date.now()}}, (err, product) => {
		if(err) {
			res.status(404).render('products', error_resp.create('error', `Product cound not be validated`));
		} else {
			res.status(200).render('products', {"message": 'Product enabled successfully!'});
		}
	});
});

// create new product view
router.get('/product/new', (req, res) => {
	res.render('product-new');
});

// new product
router.post('/product/create', (req, res) => { // check if session is still valid
	
	const params = req.body;

	if(params.name && params.description && params.value && params.stock) {
		const new_product = new product({
			"name": params.name.trim(),
			"description": params.description,
			"category": params.category.trim(),
			"tags": (params.tags || '') ? params.tags : [''],
			"value": parseFloat(params.value),
			"stock": parseInt(params.stock),
			"images": [''],
			"location.coordinates": [params.lng, params.lat],
			"seller": params.seller_id,
			"store": params.store_id
		});

		new_product.save((err, product) => {
			if(err) {
				res.status(500).render('product-new', (error_resp.create('error', 'Product could not be saved')));
			} else {
				res.status(200).render('product-new', {"message": "Product created successfully!"});
			}
		});

	} else {
		res.status(404).json(error_resp.create('product-new', 'Form data are not complete'));
	}

});

// edit product view
router.get('/product/edit/:product', (req, res) => {
	const prd_id = req.params.product;
	// get data of product
	product.findOne({prd_id}).select("name description category tags value stock images location activated").exec().then((prd) => {
		res.render('product-edit', {"product": prd});
	}).catch((err) => {
		res.status(404).render('product-edit', error_resp.create('error', `Could not find product`));
	})
});

// update product
router.post('/product/update', (req, res) => {
	const params = req.body;

	if(params.name && params.description && params.value && params.stock) {

		product.update({_id: params.prod_id}, {$set: 
			{
				"name": params.name.trim(),
				"description": params.description,
				"category": params.category.trim(),
				"tags": (params.tags || '') ? params.tags : [''],
				"value": parseFloat(params.value),
				"stock": parseInt(params.stock),
				"images": [''],
				"location.coordinates": [params.lng, params.lat],
				"seller": params.seller_id,
				"store": params.store_id,
				"activated": params.activated,
				"updated_at": Date.now()

			}}, (err, product) => {
			if(err) {
				res.status(500).render('product-edit', error_resp.create('error', `Product could not be updated`));
			} else {
				res.status(200).render('product-edit', {"message": "Product updated successfully!"});
			}
		});

	} else {
		res.status(404).render('product-edit', error_resp.create('error', `Product data are missing!`));
	}
});

// deactivate product
router.post('/product/disable', (req, res) => {
	const params = req.body;

	product.update({_id: params.prod_id}, {$set: {"activated": 0, "updated_at": Date.now()}}, (err, product) => {
		if(err) {
			res.status(500).render('products', error_resp.create('error', 'Product could not be deactivated'));
		} else {
			res.status(200).render('products', {"message": 'Product was disabled successfully'});
		}
	});
});

// show stores (admin) // have to make aggregate by store for presenting the products organized by store and populate with store info
router.get('stores', (req, res) => {
	store.find({}).select('name description image validated activated').populate('seller', 'credentials.username info.image_url').
	exec().then((stores) => {
		if(stores.length > 0) {
			res.status(200).render()
		} else {
			res.status(200).render('stores', error_resp.create('error', 'There is no any stores yet'));
		}
	}).catch((err) => {
		res.status(500).render('stores', error_resp.create('error', 'Could not retreive stores'));
	});
});

// validate store (in case of admin)
router.post('/store/validate', (req, res) => {
	
	const params = req.body;

	store.update({_id: params.store_id}, {$set: {"validated": 1, "validated_by": params.user_id, "activated": 1, "updated_at": Date.now()}}, (err, product) => {
		if(err) {
			res.status(404).render('stores', error_resp.create('error', `Store cound not be validated`));
		} else {
			res.status(200).render('stores', {"message": 'Store enabled successfully!'});
		}
	});
});

// create new store view
router.get('/store/new', (req, res) => {
	res.render('store-new');
});

// register store (only seller)
router.post('/store/create', (req, res) => {
	const params = req.body;

	const new_store = new store({
		"name": params.name,
		"description": params.description,
		"image": params.image,
		"seller": params.user_id
	});

	new_store.save( (err, store) => {
		if(err) {

		} else {

		}
	})
});

// edit store view
router.get('/store/edit/:store', (req, res) => {
	const store_id = req.params.store;
	store.findOne({"_id": store_id}).select('name description image activated').exec().then((store) => {
		res.render('store-edit', {"store": store});
	}).catch((err) => {
		res.status(404).render('store-edit', error_resp.create('error', `Could not find store`));
	});
});

// update store 
router.post('/store/update', (req, res) => {
	const params = req.body;

	if(params.name && params.description) {

		store.update({_id: params.store_id}, {$set: 
			{
				"name": params.name.trim(),
				"description": params.description,
				"image": params.image,
				"updated_at": Date.now()

			}}, (err, store) => {
			if(err) {
				res.status(500).render('store-edit', error_resp.create('error', `Store could not be updated`));
			} else {
				res.status(200).render('store-edit', {"message": "Store updated successfully!"});
			}
		});

	} else {
		res.status(404).render('store-edit', error_resp.create('error', `Store data are missing!`));
	}
});

// deactivate store
router.post('/store/deactivate', (req, res) => {
	const params = req.body;

	product.update({"_id": params.store_id}, {$set: {"activated": 0, "updated_at": Date.now()}}, (err, store) => {
		if(err) {
			res.status(500).render('stores', error_resp.create('error', 'Store could not be deactivated'));
		} else {
			res.status(200).render('stores', {"message": 'Store was disabled successfully'});
		}
	});
});

// view messages
router.get('/messages/:user', (req, res) => {
	const user_id = req.params.user;
	message.find({"received_by": user_id}).populate('sent_by', 'credentials.username info.image_url').exec().then((msgs) => {
		if(msgs.length > 0) {
			res.status(200).render('messages', {"messages": msgs});
		}
		else {
			res.status(200).render('error', {"message": 'There is no messages at the moment'});
		}
	}).catch((err) => {
		res.status(500).render('messages', error_resp.create('error', 'No messages retrieved'));
	});
});

// send new message
router.post('/message/new', (req, res) => {
	const params = req.body;

	const new_msg = new message({
		"message": params.message,
		"received_by": params.receiver_id,
		"sent_by": params.sender_id,
		"seen": 0
	});

	new_msg.save((err, msg) => {
		if(err) {
			res.status(500).render('messages', error_resp.create('error', 'Message is not sent'));
		} else {
			res.status(200).render('messages', {"new_msg": msg});
		}
	});
});

ws.on('connection', function() {
	console.log("Up and running!");
});

ws.on('open', function open() {
  ws.send('something');
});
 
ws.on('message', function incoming(data) {
  console.log(data);
});


module.exports = router;



