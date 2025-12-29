const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'userModel'
    },
    userModel: {
        type: String,
        required: true,
        enum: ['Recruiter', 'Candidate', 'User']
    },
    action: {
        type: String,
        required: true,
        enum: [
            'SUBSCRIPTION_PURCHASE',
            'SUBSCRIPTION_CANCEL',
            'INTERVIEW_REQUEST',
            'APPLICATION_SUBMITTED',
            'USER_LOGIN',
            'JOB_POSTED',
            'PROFILE_UPDATE',
            'OTHER'
        ]
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for faster filtering and sorting
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ action: 1 });
ActivityLogSchema.index({ user: 1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
