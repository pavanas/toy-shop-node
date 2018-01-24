const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const productSchema = new Schema({
	"name": { type: String, required: true },
	"description": { type: String, required: true },
	"category": String, // figures, construction, dolls, pre school, video games
	"tags": [String], // girl, boy, baby
	"value": { type: Number, required: true },
	"stock": { type: Number, required: true },
	"images": [String],
	"location": {
		type: {
			type: String
		},
		coordinates: []
	},
	"seller": { type: Schema.Types.ObjectId, ref: 'User' },
	"store": { type: Schema.Types.ObjectId, ref: 'Store' },
	"inBuying": { type: Boolean, default:false }, // Check if it's not the same user
	"bought_by": [{ type: Schema.Types.ObjectId, ref: 'User' }],
	"activated": { type:Number, min:0, max:1, default:0 },
	"validated": { type:Number, min:0, max:1, default:0 },
	"validated_by": { type: Schema.Types.ObjectId, ref: 'User' },
	"created_at": { type:Date, default: Date.now },
	"updated_at": { type:Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;