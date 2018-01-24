const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const storeSchema = new Schema({
	"name": String,
	"description": String,
	"image": String,
	"seller": {type: Schema.Types.ObjectId, ref: 'User'},
	"followers": [{type: Schema.Types.ObjectId, ref: 'User'}],
	"validated": { type:Number, min:0, max:1, default:0 },
	"activated": { type:Number, min:0, max:1, default:0 },
	"validated_by": { type: Schema.Types.ObjectId, ref: 'User' },
	"created_at": { type:Date, default: Date.now },
	"updated_at": { type:Date, default: Date.now }
});

const Store = mongoose.model('Store', storeSchema);

module.exports = Store;