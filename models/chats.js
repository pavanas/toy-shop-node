const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const chatSchema = new Schema({
	"messages_": [{ type: Schema.Types.ObjectId, ref: 'Message' }],
	"from_user": { type: Schema.Types.ObjectId, ref: 'User' },
	"to_user": { type: Schema.Types.ObjectId, ref: 'User' }
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;