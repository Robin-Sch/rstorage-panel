const { Schema, model } = require('mongoose');
const productSchema = Schema({
	_id: { type: Schema.Types.ObjectId, required: true },
	ip: { type: String, required: true },
	port: { type: Number, required: true },
	publickey: { type: String, required: true }
});

const UserModel = model('Nodes', productSchema);
module.exports = UserModel;