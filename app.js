const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const parser = require('body-parser');
const session = require('express-session');
const mongoSession = require('connect-mongo')(session);

// DB keys
const m_keys = require('./m_keys.json');

// Start express 
const app = express();

// Define mongoDB connection
const mongoDB = 'mongodb://'+m_keys.mongoUser+':'+m_keys.mongoPass+'@'+m_keys.mongoURL+':'+m_keys.mongoPort+'/'+m_keys.mongoDB;

//Connect to mongoDB database
mongoose.Promise = global.Promise;
mongoose.connect(mongoDB);
const db_m = mongoose.connection;

db_m.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Get data from request
app.use(parser.urlencoded({extended: true}));
app.use(parser.json());

// Use session data and store them into the DB
app.use(session({
	"name": "toysess",
	"secret": "toyshop-example",
	"resave": false,
  	"saveUninitialized": false,
  	"cookie": {
  		"maxAge": 3600000, //one hour,
  	},
	"store": new mongoSession({mongooseConnection: db_m})
}));

// use static css and ks files
app.use('/assets', express.static(path.join(__dirname, 'public')))

// Define routes and use them as a middleware
const client = require('./routes/client');
const admin = require('./routes/admin');

app.use('/', client);
app.use('/admin', admin);

// define template engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// manage requests to invalid resources
app.use( (req, res) => {
  res.status(404).render('error', {"message": `The requested URL: ${req.protocol}://${req.get('host')}${req.originalUrl} is not found`});
});

app.listen(4000, function () {
  console.log('Toy-store example app listening on port 4000!')
});

