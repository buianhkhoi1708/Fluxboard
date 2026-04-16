const mongoose = require('mongoose');
const { Roles } = require('../constants/rbac.enum');

const roleSchema = new mongoose.Schema({
    name: { type: String, enum: Object.values(Roles), required: true, unique: true, index: true },
    description: { type: String },
    permission_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }]
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Role', roleSchema);