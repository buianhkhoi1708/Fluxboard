const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        token_hash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        device_type: {
            type: String,
            default: 'Unknown Device',
        },

        user_agent: {
            type: String,
            default: null,
        },

        ip_address: {
            type: String,
            default: '0.0.0.0',
        },

        is_active: {
            type: Boolean,
            default: true,
            index: true,
        },

        last_activity: {
            type: Date,
            default: Date.now,
            index: true,
        },

        expires_at: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
        },
    },
);

userSessionSchema.index({
    user_id: 1,
    is_active: 1,
    last_activity: -1,
});

module.exports = mongoose.model('UserSession', userSessionSchema);