const ActivityLog = require('../models/ActivityLog');

/**
 * Log a user activity
 * @param {Object} data
 * @param {string} data.userId - The ID of the user performing the action
 * @param {string} data.userModel - The model name of the user ('Recruiter' or 'Candidate')
 * @param {string} data.action - The action type (e.g. 'SUBSCRIPTION_PURCHASE')
 * @param {Object} [data.details] - Additional details about the action
 * @param {Object} [req] - Express request object (optional, to capture IP/UserAgent)
 */
const logActivity = async ({ userId, userModel, action, details = {} }, req = null) => {
    try {
        const logData = {
            user: userId,
            userModel,
            action,
            details
        };

        if (req) {
            logData.ipAddress = req.ip || req.connection.remoteAddress;
            logData.userAgent = req.get('User-Agent');
        }

        // Create log asynchronously - usually we don't want to await this in the main flow
        // unless critical
        await ActivityLog.create(logData);
        console.log(`[ActivityLog] ${action} logged for user ${userId}`);
    } catch (error) {
        console.error('[ActivityLog] Error logging activity:', error);
        // Don't throw error to prevent disrupting the main flow
    }
};

module.exports = { logActivity };
