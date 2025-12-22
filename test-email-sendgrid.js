require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const sendEmail = require('./utils/sendEmail');

const testEmail = async () => {
  try {
    await sendEmail({
      email: 'info@hireinminutes.in', // Using your new configured email for testing
      subject: 'SendGrid Test Email - Hire In Minutes',
      message: 'This is a test email from your SendGrid configuration. Your email system is working correctly!',
      html: '<h1>🎉 SendGrid Test Successful!</h1><p>Your email configuration is working correctly. OTP emails will now be sent via SendGrid.</p><p><strong>Next steps:</strong></p><ul><li>Restart your backend server</li><li>Test user registration to receive OTP</li></ul>'
    });
    console.log('✅ Test email sent successfully!');
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
  }
};

testEmail();