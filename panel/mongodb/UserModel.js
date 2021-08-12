const { Schema, model } = require('mongoose');
const productSchema = Schema({
	_id: { type: Schema.Types.ObjectId, required: true },
	username: { type: String, required: true },
	email: { type: String, required: true },
	password: { type: String, required: true },
	verified: { type: String, required: true },
	secret: { type: String, required: false },
});

const UserModel = model('Users', productSchema);
module.exports = UserModel;