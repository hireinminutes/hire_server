const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const sendEmail = require('../utils/sendEmail');

const testEmail = async () => {
    try {
        console.log('Testing email configuration...');
        console.log('Env keys loaded:', Object.keys(process.env).filter(key => key.startsWith('SMTP') || key.startsWith('EMAIL')));

        console.log('SMTP_HOST type:', typeof process.env.SMTP_HOST);
        console.log('SMTP_PORT type:', typeof process.env.SMTP_PORT);

        if (!process.env.SMTP_HOST) {
            throw new Error('SMTP_HOST is not defined in environment variables');
        }

        await sendEmail({
            email: process.env.EMAIL_FROM, // Send to self for testing
            subject: 'Test Email',
            message: 'This is a test email to verify configuration.',
        });

        console.log('Email sent successfully!');
    } catch (error) {
        console.error('Failed to send email:', error);
    }
};

testEmail();
