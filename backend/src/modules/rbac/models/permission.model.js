const mongoose = require('mongoose');
const { Scopes } = require('../constants/rbac.enum');

const permissionSchema = new mongoose.Schema({
    resource: { type: String, required: true, index: true }, 
    action: { type: String, required: true },  
    scope: { type: String, enum: Object.values(Scopes), required: true },
    description: { type: String }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

permissionSchema.index({ resource: 1, action: 1, scope: 1 }, { unique: true });

module.exports = mongoose.model('Permission', permissionSchema);