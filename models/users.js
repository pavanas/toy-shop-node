const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
	"credentials": {
		username: { type: String, required: true },
		password: { type: String, minlength: 8, required: true },
		email: { type:String, unique:true, required: true, match: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i }		
	},
	"info": {
		firstName: String,
		lastName: String,
		address: {
			type: {
				type: String
			},
			coordinates: []
		},
		image_url: { type: String, default: '' }
	},
	"profile": { type: Number, min:1, max:4 }, //admin,seller,user,anonymous
	"gains": { type: Number, default:0 },
	"verified": { type:Number, min:0, max:1, default:0 },
	"activated": { type:Number, min:0, max:1, default:0 },
	"created_at": { type:Date, default: Date.now },
	"updated_at": { type:Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

module.exports = User;