const { Schema, model } = require('mongoose');
const productSchema = Schema({
	_id: { type: Schema.Types.ObjectId, required: true },
	node: { type: String, required: true },
	name: { type: String, required: true },
	path: { type: String, required: true },
	index: { type: Number, require: true },
});

const UserModel = model('Parts', productSchema);
module.exports = UserModel;