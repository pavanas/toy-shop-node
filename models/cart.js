const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const cartSchema = new Schema({
	"buyer": {type: Schema.Types.ObjectId, ref: 'User'},
	"products": [{type: Schema.Types.ObjectId, ref: 'Product'}],
	"checkout": { type:Number, max:1, min:0, default:0  },
	"created_at": { type:Date, default: Date.now },
	"updated_at": { type:Date, default: Date.now }
});

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;