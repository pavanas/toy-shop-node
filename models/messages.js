const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const messageSchema = new Schema({
	"message": String,
	"received_by": { type: Schema.Types.ObjectId, ref: 'User' },
	"sent_by": { type: Schema.Types.ObjectId, ref: 'User' },
	"seen": { type:Number, min:0, max:1, default:0 },
	"sent_at": { type: Date, default: new Date }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;