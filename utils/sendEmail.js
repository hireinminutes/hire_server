const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Get SMTP configuration from environment variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const emailFrom = process.env.EMAIL_FROM;

    if (!smtpHost) {
        throw new Error('SMTP_HOST is not defined in environment variables.');
    }
    if (!smtpUser || !smtpPass) {
        throw new Error('SMTP credentials (SMTP_USER/SMTP_PASS) are missing from environment variables.');
    }
    if (!emailFrom) {
        throw new Error('EMAIL_FROM is not defined in environment variables.');
    }

    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort == 465, // true for 465, false for other ports
        auth: {
            user: smtpUser,
            pass: smtpPass,
        },
    });

    const message = {
        from: `${process.env.FROM_NAME || 'Hire In Minutes'} <${emailFrom}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    const info = await transporter.sendMail(message);

    console.log('Message sent: %s', info.messageId);
};

// Email Templates
const emailTemplates = {
    // OTP Verification Email Template
    otpVerification: (otp, userName = 'User') => ({
        subject: 'Hire In Minutes- Email Verification',
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification - Hire In Minutes</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #e2e8f0;
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #0f172a;
                    padding: 20px;
                }
                .container {
                    background: #1e293b;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    border: 1px solid #334155;
                }
                .header {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    padding: 40px 30px;
                    text-align: center;
                    color: white;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    letter-spacing: -1px;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .tagline {
                    font-size: 14px;
                    opacity: 0.9;
                    margin: 0;
                }
                .content {
                    padding: 40px 30px;
                    text-align: center;
                }
                .greeting {
                    font-size: 24px;
                    font-weight: 600;
                    color: #ffffff;
                    margin-bottom: 20px;
                }
                .message {
                    font-size: 16px;
                    color: #cbd5e1;
                    margin-bottom: 30px;
                    line-height: 1.7;
                }
                .otp-container {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    border-radius: 12px;
                    padding: 30px;
                    margin: 30px 0;
                    box-shadow: 0 0 20px rgba(59, 130, 246, 0.1);
                }
                .otp-label {
                    color: #60a5fa;
                    font-size: 14px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 15px;
                    display: block;
                }
                .otp-code {
                    font-size: 36px;
                    font-weight: bold;
                    color: #ffffff;
                    letter-spacing: 8px;
                    font-family: 'Courier New', monospace;
                    margin: 0;
                    text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
                }
                .warning {
                    background: rgba(245, 158, 11, 0.1);
                    border-left: 4px solid #f59e0b;
                    padding: 20px;
                    margin: 30px 0;
                    border-radius: 8px;
                    text-align: left;
                }
                .warning-text {
                    color: #fbbf24;
                    font-size: 14px;
                    margin: 0;
                    font-weight: 500;
                }
                .footer {
                    background: #1e293b;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #334155;
                }
                .footer-text {
                    color: #94a3b8;
                    font-size: 14px;
                    margin: 0 0 10px 0;
                }
                .social-links {
                    margin-top: 20px;
                }
                .social-links a {
                    display: inline-block;
                    margin: 0 10px;
                    color: #60a5fa;
                    text-decoration: none;
                    font-weight: 500;
                }
                @media (max-width: 600px) {
                    body {
                        padding: 10px;
                    }
                    .header {
                        padding: 30px 20px;
                    }
                    .content {
                        padding: 30px 20px;
                    }
                    .otp-container {
                        padding: 20px;
                    }
                    .otp-code {
                        font-size: 28px;
                        letter-spacing: 6px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🚀 Hire In Minutes</div>
                    <p class="tagline">Connecting Talent with Opportunity</p>
                </div>

                <div class="content">
                    <h1 class="greeting">Welcome ${userName}! 👋</h1>
                    <p class="message">
                        Thank you for joining Hire In Minutes! To complete your registration and start your journey towards amazing career opportunities, please verify your email address using the code below.
                    </p>

                    <div class="otp-container">
                        <span class="otp-label">Your Verification Code</span>
                        <div class="otp-code">${otp}</div>
                    </div>

                    <div class="warning">
                        <p class="warning-text">
                            ⚠️ This code will expire in 10 minutes. Please use it immediately to verify your account.
                        </p>
                    </div>

                    <p class="message">
                        If you didn't create an account with Hire In Minutes, please ignore this email.
                    </p>
                </div>

                <div class="footer">
                    <p class="footer-text">
                        Need help? Contact our support team at <a href="mailto:support@koderspark.com" style="color: #667eea;">support@koderspark.com</a>
                    </p>
                    <p class="footer-text">
                        © 2025 Hire In Minutes. All rights reserved.
                    </p>
                    <div class="social-links">
                        <a href="#">Privacy Policy</a> |
                        <a href="#">Terms of Service</a> |
                        <a href="#">Help Center</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `,
        text: `Welcome ${userName}!

Thank you for joining Hire In Minutes! To complete your registration, please verify your email address using this code:

Your verification code: ${otp}

This code will expire in 10 minutes.

If you didn't create an account, please ignore this email.

Need help? Contact support@koderspark.com

© 2025 Hire In Minutes. All rights reserved.`
    }),

    // Welcome Email Template
    welcome: (userName = 'User') => ({
        subject: 'Welcome to Hire In Minutes! 🎉',
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Hire In Minutes</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #f8fafc;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 40px 30px;
                    text-align: center;
                    color: white;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    letter-spacing: -1px;
                }
                .tagline {
                    font-size: 14px;
                    opacity: 0.9;
                    margin: 0;
                }
                .content {
                    padding: 40px 30px;
                }
                .greeting {
                    font-size: 28px;
                    font-weight: 700;
                    color: #1a202c;
                    margin-bottom: 20px;
                    text-align: center;
                }
                .message {
                    font-size: 16px;
                    color: #4a5568;
                    margin-bottom: 30px;
                    line-height: 1.7;
                }
                .highlight-box {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    border-radius: 12px;
                    padding: 25px;
                    margin: 30px 0;
                    text-align: center;
                    color: white;
                }
                .highlight-title {
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 15px;
                }
                .highlight-text {
                    font-size: 16px;
                    opacity: 0.95;
                    line-height: 1.6;
                }
                .features {
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 30px;
                    margin: 30px 0;
                }
                .features-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #1a202c;
                    margin-bottom: 20px;
                    text-align: center;
                }
                .feature-list {
                    list-style: none;
                    padding: 0;
                }
                .feature-item {
                    padding: 12px 0;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: center;
                }
                .feature-item:last-child {
                    border-bottom: none;
                }
                .feature-icon {
                    width: 24px;
                    height: 24px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 15px;
                    color: white;
                    font-weight: bold;
                    font-size: 12px;
                }
                .feature-text {
                    color: #4a5568;
                    font-weight: 500;
                }
                .cta-button {
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    padding: 15px 30px;
                    border-radius: 8px;
                    font-weight: 600;
                    margin: 30px 0;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    transition: transform 0.2s;
                }
                .cta-button:hover {
                    transform: translateY(-2px);
                }
                .footer {
                    background: #f8fafc;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }
                .footer-text {
                    color: #718096;
                    font-size: 14px;
                    margin: 0 0 10px 0;
                }
                .social-links {
                    margin-top: 20px;
                }
                .social-links a {
                    display: inline-block;
                    margin: 0 10px;
                    color: #667eea;
                    text-decoration: none;
                    font-weight: 500;
                }
                @media (max-width: 600px) {
                    body {
                        padding: 10px;
                    }
                    .header {
                        padding: 30px 20px;
                    }
                    .content {
                        padding: 30px 20px;
                    }
                    .greeting {
                        font-size: 24px;
                    }
                    .highlight-box {
                        padding: 20px;
                    }
                    .features {
                        padding: 20px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🚀 Hire In Minutes</div>
                    <p class="tagline">Connecting Talent with Opportunity</p>
                </div>

                <div class="content">
                    <h1 class="greeting">Welcome aboard, ${userName}! 🎉</h1>

                    <p class="message">
                        Congratulations! Your account has been successfully verified and you're now part of the Hire In Minutes community. We're excited to help you connect with amazing career opportunities and discover your next big breakthrough.
                    </p>

                    <div class="highlight-box">
                        <div class="highlight-title">🎯 Your Journey Starts Now</div>
                        <div class="highlight-text">
                            Whether you're a talented professional seeking new opportunities or a company looking for exceptional talent, Hire In Minutes is your gateway to success.
                        </div>
                    </div>

                    <div class="features">
                        <h3 class="features-title">What You Can Do Next</h3>
                        <ul class="feature-list">
                            <li class="feature-item">
                                <div class="feature-icon">📝</div>
                                <span class="feature-text">Complete your profile to get better visibility</span>
                            </li>
                            <li class="feature-item">
                                <div class="feature-icon">🔍</div>
                                <span class="feature-text">Explore jobs that match your skills and interests</span>
                            </li>
                            <li class="feature-item">
                                <div class="feature-icon">🤝</div>
                                <span class="feature-text">Connect with recruiters and industry professionals</span>
                            </li>
                            <li class="feature-item">
                                <div class="feature-icon">📊</div>
                                <span class="feature-text">Apply and track your applications in one place</span>
                            </li>
                            <li class="feature-item">
                                <div class="feature-icon">📈</div>
                                <span class="feature-text">Get personalized recommendations and insights</span>
                            </li>
                        </ul>
                    </div>

                    <div style="text-align: center;">
                        <a href="#" class="cta-button">Start Exploring Opportunities →</a>
                    </div>

                    <p class="message" style="text-align: center; margin-top: 30px;">
                        If you have any questions or need assistance, our support team is here to help you every step of the way.
                    </p>
                </div>

                <div class="footer">
                    <p class="footer-text">
                        Questions? Reach out to us at <a href="mailto:support@koderspark.com" style="color: #667eea;">support@koderspark.com</a>
                    </p>
                    <p class="footer-text">
                        © 2025 Hire In Minutes. All rights reserved.
                    </p>
                    <div class="social-links">
                        <a href="#">Privacy Policy</a> |
                        <a href="#">Terms of Service</a> |
                        <a href="#">Help Center</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `,
        text: `Welcome aboard, ${userName}!

Congratulations! Your account has been successfully verified and you're now part of the Hire In Minutes community.

What you can do next:
• Complete your profile to get better visibility
• Explore jobs that match your skills and interests
• Connect with recruiters and industry professionals
• Apply and track your applications in one place
• Get personalized recommendations and insights

If you have any questions, reach out to us at support@koderspark.com

© 2025 Hire In Minutes. All rights reserved.`
    }),

    // Password Reset OTP Email Template
    passwordReset: (otp, userName = 'User') => ({
        subject: 'Hire In Minutes - Password Reset Code',
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset - Hire In Minutes</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #f8fafc;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    padding: 40px 30px;
                    text-align: center;
                    color: white;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    letter-spacing: -1px;
                }
                .tagline {
                    font-size: 14px;
                    opacity: 0.9;
                    margin: 0;
                }
                .content {
                    padding: 40px 30px;
                    text-align: center;
                }
                .greeting {
                    font-size: 24px;
                    font-weight: 600;
                    color: #1a202c;
                    margin-bottom: 20px;
                }
                .message {
                    font-size: 16px;
                    color: #4a5568;
                    margin-bottom: 30px;
                    line-height: 1.7;
                }
                .otp-container {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    border-radius: 12px;
                    padding: 30px;
                    margin: 30px 0;
                    box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
                }
                .otp-label {
                    color: white;
                    font-size: 14px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 15px;
                    display: block;
                }
                .otp-code {
                    font-size: 36px;
                    font-weight: bold;
                    color: white;
                    letter-spacing: 8px;
                    font-family: 'Courier New', monospace;
                    margin: 0;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                .security-notice {
                    background: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 20px;
                    margin: 30px 0;
                    border-radius: 8px;
                }
                .security-text {
                    color: #92400e;
                    font-size: 14px;
                    margin: 0;
                    font-weight: 500;
                }
                .footer {
                    background: #f8fafc;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }
                .footer-text {
                    color: #718096;
                    font-size: 14px;
                    margin: 0 0 10px 0;
                }
                @media (max-width: 600px) {
                    body {
                        padding: 10px;
                    }
                    .header {
                        padding: 30px 20px;
                    }
                    .content {
                        padding: 30px 20px;
                    }
                    .otp-container {
                        padding: 20px;
                    }
                    .otp-code {
                        font-size: 28px;
                        letter-spacing: 6px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🔐 Hire In Minutes</div>
                    <p class="tagline">Secure Password Reset</p>
                </div>

                <div class="content">
                    <h1 class="greeting">Password Reset Request</h1>
                    <p class="message">
                        Hi ${userName}, we received a request to reset your password for your Hire In Minutes account. Use the verification code below to proceed with resetting your password.
                    </p>

                    <div class="otp-container">
                        <span class="otp-label">Your Reset Code</span>
                        <div class="otp-code">${otp}</div>
                    </div>

                    <div class="security-notice">
                        <p class="security-text">
                            🔒 For your security, this code will expire in 10 minutes. If you didn't request this password reset, please ignore this email and ensure your account is secure.
                        </p>
                    </div>

                    <p class="message">
                        Enter this code in the password reset form to create a new password for your account.
                    </p>
                </div>

                <div class="footer">
                    <p class="footer-text">
                        Need help? Contact our support team at <a href="mailto:support@koderspark.com" style="color: #667eea;">support@koderspark.com</a>
                    </p>
                    <p class="footer-text">
                        © 2025 Hire In Minutes. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        `,
        text: `Password Reset Request

Hi ${userName},

We received a request to reset your password for your Hire In Minutes account.

Your reset code: ${otp}

For your security, this code will expire in 10 minutes. If you didn't request this password reset, please ignore this email.

Enter this code in the password reset form to create a new password.

Need help? Contact support@koderspark.com

© 2025 Hire In Minutes. All rights reserved.`
    }),

    // Email Notification Subscription Confirmation Template
    notificationSubscription: (userName = 'User') => ({
        subject: '🎉 Welcome to Hire In Minutes Notifications!',
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Notifications Enabled - Hire In Minutes</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #f8fafc;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    padding: 40px 30px;
                    text-align: center;
                    color: white;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    letter-spacing: -1px;
                }
                .tagline {
                    font-size: 14px;
                    opacity: 0.9;
                    margin: 0;
                }
                .content {
                    padding: 40px 30px;
                }
                .greeting {
                    font-size: 28px;
                    font-weight: 700;
                    color: #1a202c;
                    margin-bottom: 20px;
                    text-align: center;
                }
                .message {
                    font-size: 16px;
                    color: #4a5568;
                    margin-bottom: 30px;
                    line-height: 1.7;
                }
                .success-banner {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    border-radius: 12px;
                    padding: 25px;
                    margin: 30px 0;
                    text-align: center;
                    color: white;
                    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
                }
                .success-title {
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 15px;
                }
                .success-text {
                    font-size: 16px;
                    opacity: 0.95;
                    line-height: 1.6;
                }
                .notifications-list {
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 30px;
                    margin: 30px 0;
                }
                .notifications-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #1a202c;
                    margin-bottom: 20px;
                    text-align: center;
                }
                .notification-item {
                    padding: 15px 0;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: flex-start;
                }
                .notification-item:last-child {
                    border-bottom: none;
                }
                .notification-icon {
                    width: 32px;
                    height: 32px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 15px;
                    color: white;
                    font-weight: bold;
                    font-size: 14px;
                    flex-shrink: 0;
                }
                .notification-content {
                    flex: 1;
                }
                .notification-title {
                    font-weight: 600;
                    color: #1a202c;
                    margin-bottom: 5px;
                }
                .notification-desc {
                    color: #4a5568;
                    font-size: 14px;
                    line-height: 1.5;
                }
                .coming-soon {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-left: 10px;
                }
                .settings-link {
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    padding: 15px 30px;
                    border-radius: 8px;
                    font-weight: 600;
                    margin: 30px 0;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    transition: transform 0.2s;
                }
                .settings-link:hover {
                    transform: translateY(-2px);
                }
                .footer {
                    background: #f8fafc;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }
                .footer-text {
                    color: #718096;
                    font-size: 14px;
                    margin: 0 0 10px 0;
                }
                .unsubscribe-text {
                    color: #a0aec0;
                    font-size: 12px;
                    margin-top: 20px;
                }
                @media (max-width: 600px) {
                    body {
                        padding: 10px;
                    }
                    .header {
                        padding: 30px 20px;
                    }
                    .content {
                        padding: 30px 20px;
                    }
                    .success-banner {
                        padding: 20px;
                    }
                    .notifications-list {
                        padding: 20px;
                    }
                    .notification-item {
                        flex-direction: column;
                        text-align: center;
                    }
                    .notification-icon {
                        margin-right: 0;
                        margin-bottom: 10px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🔔 Hire In Minutes</div>
                    <p class="tagline">Stay Connected, Stay Ahead</p>
                </div>

                <div class="content">
                    <h1 class="greeting">Notifications Enabled! 🎉</h1>

                    <p class="message">
                        Hi ${userName}, welcome to the Hire In Minutes notification family! You've successfully enabled email notifications and will now stay updated with the latest opportunities and platform activities.
                    </p>

                    <div class="success-banner">
                        <div class="success-title">✅ Email Notifications Active</div>
                        <div class="success-text">
                            You're all set to receive important updates, job alerts, and platform notifications directly in your inbox.
                        </div>
                    </div>

                    <div class="notifications-list">
                        <h3 class="notifications-title">What You'll Receive</h3>

                        <div class="notification-item">
                            <div class="notification-icon">💼</div>
                            <div class="notification-content">
                                <div class="notification-title">Job Application Updates</div>
                                <div class="notification-desc">Get notified when recruiters view your applications or update their status</div>
                            </div>
                        </div>

                        <div class="notification-item">
                            <div class="notification-icon">🎯</div>
                            <div class="notification-content">
                                <div class="notification-title">New Job Matches</div>
                                <div class="notification-desc">Receive alerts for jobs that match your skills and preferences</div>
                            </div>
                        </div>

                        <div class="notification-item">
                            <div class="notification-icon">📅</div>
                            <div class="notification-content">
                                <div class="notification-title">Interview Invitations</div>
                                <div class="notification-desc">Never miss an interview opportunity with timely reminders</div>
                            </div>
                        </div>

                        <div class="notification-item">
                            <div class="notification-icon">⭐</div>
                            <div class="notification-content">
                                <div class="notification-title">Profile Milestones</div>
                                <div class="notification-desc">Celebrate achievements like profile completion and skill endorsements</div>
                            </div>
                        </div>

                        <div class="notification-item">
                            <div class="notification-icon">📰</div>
                            <div class="notification-content">
                                <div class="notification-title">Platform Updates</div>
                                <div class="notification-desc">Stay informed about new features, platform improvements, and important announcements</div>
                            </div>
                        </div>

                        <div class="notification-item">
                            <div class="notification-icon">⏰</div>
                            <div class="notification-content">
                                <div class="notification-title">Weekly Job Digest <span class="coming-soon">Coming Soon</span></div>
                                <div class="notification-desc">Curated job recommendations and industry insights delivered weekly</div>
                            </div>
                        </div>
                    </div>

                    <div style="text-align: center;">
                        <a href="#" class="settings-link">Manage Notification Settings →</a>
                    </div>

                    <p class="message" style="text-align: center; margin-top: 30px;">
                        You can always update your notification preferences in your account settings. We're committed to keeping you informed without overwhelming your inbox.
                    </p>
                </div>

                <div class="footer">
                    <p class="footer-text">
                        Questions? Reach out to us at <a href="mailto:support@koderspark.com" style="color: #667eea;">support@koderspark.com</a>
                    </p>
                    <p class="footer-text">
                        © 2025 Hire In Minutes. All rights reserved.
                    </p>
                    <p class="unsubscribe-text">
                        You can unsubscribe or update your preferences anytime from your account settings.
                    </p>
                </div>
            </div>
        </body>
        </html>
        `,
        text: `Notifications Enabled Successfully!

Hi ${userName},

Welcome to the Hire In Minutes notification family! You've successfully enabled email notifications.

What You'll Receive:
• Job Application Updates - When recruiters view or update your applications
• New Job Matches - Alerts for jobs matching your skills
• Interview Invitations - Never miss interview opportunities
• Profile Milestones - Celebrate achievements and completions
• Platform Updates - New features and important announcements
• Weekly Job Digest - Coming soon!

You can manage your notification preferences anytime in your account settings.

Questions? Contact support@koderspark.com

© 2025 Hire In Minutes. All rights reserved.`
    }),

    // Two-Factor Authentication Setup Email Template
    twoFactorSetup: (otp, userName = 'User') => ({
        subject: '🔐 Enable Two-Factor Authentication - Hire In Minutes',
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Enable 2FA - Hire In Minutes</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #f8fafc;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                    padding: 40px 30px;
                    text-align: center;
                    color: white;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    letter-spacing: -1px;
                }
                .tagline {
                    font-size: 14px;
                    opacity: 0.9;
                    margin: 0;
                }
                .content {
                    padding: 40px 30px;
                    text-align: center;
                }
                .greeting {
                    font-size: 28px;
                    font-weight: 700;
                    color: #1a202c;
                    margin-bottom: 20px;
                }
                .message {
                    font-size: 16px;
                    color: #4a5568;
                    margin-bottom: 30px;
                    line-height: 1.7;
                }
                .security-banner {
                    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                    border-radius: 12px;
                    padding: 25px;
                    margin: 30px 0;
                    text-align: center;
                    color: white;
                    box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);
                }
                .security-title {
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 15px;
                }
                .security-text {
                    font-size: 16px;
                    opacity: 0.95;
                    line-height: 1.6;
                }
                .otp-container {
                    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                    border-radius: 12px;
                    padding: 30px;
                    margin: 30px 0;
                    box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);
                }
                .otp-label {
                    color: white;
                    font-size: 14px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 15px;
                    display: block;
                }
                .otp-code {
                    font-size: 36px;
                    font-weight: bold;
                    color: white;
                    letter-spacing: 8px;
                    font-family: 'Courier New', monospace;
                    margin: 0;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                .warning-notice {
                    background: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 20px;
                    margin: 30px 0;
                    border-radius: 8px;
                }
                .warning-text {
                    color: #92400e;
                    font-size: 14px;
                    margin: 0;
                    font-weight: 500;
                }
                .benefits-list {
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 30px;
                    margin: 30px 0;
                    text-align: left;
                }
                .benefits-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #1a202c;
                    margin-bottom: 20px;
                    text-align: center;
                }
                .benefit-item {
                    padding: 12px 0;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    align-items: flex-start;
                }
                .benefit-item:last-child {
                    border-bottom: none;
                }
                .benefit-icon {
                    width: 24px;
                    height: 24px;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 15px;
                    color: white;
                    font-weight: bold;
                    font-size: 12px;
                    flex-shrink: 0;
                    margin-top: 2px;
                }
                .benefit-content {
                    flex: 1;
                }
                .benefit-title {
                    font-weight: 600;
                    color: #1a202c;
                    margin-bottom: 3px;
                }
                .benefit-desc {
                    color: #4a5568;
                    font-size: 14px;
                    line-height: 1.4;
                }
                .footer {
                    background: #f8fafc;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }
                .footer-text {
                    color: #718096;
                    font-size: 14px;
                    margin: 0 0 10px 0;
                }
                @media (max-width: 600px) {
                    body {
                        padding: 10px;
                    }
                    .header {
                        padding: 30px 20px;
                    }
                    .content {
                        padding: 30px 20px;
                    }
                    .security-banner {
                        padding: 20px;
                    }
                    .otp-container {
                        padding: 20px;
                    }
                    .otp-code {
                        font-size: 28px;
                        letter-spacing: 6px;
                    }
                    .benefits-list {
                        padding: 20px;
                    }
                    .benefit-item {
                        flex-direction: column;
                        text-align: center;
                    }
                    .benefit-icon {
                        margin-right: 0;
                        margin-bottom: 8px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🔐 Hire In Minutes</div>
                    <p class="tagline">Enhanced Security Setup</p>
                </div>

                <div class="content">
                    <h1 class="greeting">Enable Two-Factor Authentication</h1>

                    <p class="message">
                        Hi ${userName}, you've requested to enable two-factor authentication (2FA) for your Hire In Minutes account. This adds an extra layer of security to protect your account.
                    </p>

                    <div class="security-banner">
                        <div class="security-title">🛡️ Enhanced Account Security</div>
                        <div class="security-text">
                            Two-factor authentication requires both your password and a verification code to access your account, making it much harder for unauthorized users to gain access.
                        </div>
                    </div>

                    <div class="otp-container">
                        <span class="otp-label">Your Setup Verification Code</span>
                        <div class="otp-code">${otp}</div>
                    </div>

                    <div class="warning-notice">
                        <p class="warning-text">
                            ⚠️ This code will expire in 10 minutes. If you didn't request to enable 2FA, please ignore this email and ensure your account is secure.
                        </p>
                    </div>

                    <div class="benefits-list">
                        <h3 class="benefits-title">Why Enable 2FA?</h3>

                        <div class="benefit-item">
                            <div class="benefit-icon">🔒</div>
                            <div class="benefit-content">
                                <div class="benefit-title">Extra Security Layer</div>
                                <div class="benefit-desc">Protect your account even if your password is compromised</div>
                            </div>
                        </div>

                        <div class="benefit-item">
                            <div class="benefit-icon">📧</div>
                            <div class="benefit-content">
                                <div class="benefit-title">Email-Based Verification</div>
                                <div class="benefit-desc">Receive secure codes directly to your registered email</div>
                            </div>
                        </div>

                        <div class="benefit-item">
                            <div class="benefit-icon">💾</div>
                            <div class="benefit-content">
                                <div class="benefit-title">Backup Codes</div>
                                <div class="benefit-desc">Generate backup codes for account recovery if needed</div>
                            </div>
                        </div>

                        <div class="benefit-item">
                            <div class="benefit-icon">⚡</div>
                            <div class="benefit-content">
                                <div class="benefit-title">Quick & Easy</div>
                                <div class="benefit-desc">Simple setup process with immediate security benefits</div>
                            </div>
                        </div>
                    </div>

                    <p class="message">
                        Enter this verification code in the 2FA setup form to complete the activation. You'll receive backup codes to save securely after successful setup.
                    </p>
                </div>

                <div class="footer">
                    <p class="footer-text">
                        Need help? Contact our support team at <a href="mailto:support@koderspark.com" style="color: #667eea;">support@koderspark.com</a>
                    </p>
                    <p class="footer-text">
                        © 2025 Hire In Minutes. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        `,
        text: `Enable Two-Factor Authentication

Hi ${userName},

You've requested to enable two-factor authentication (2FA) for your Hire In Minutes account.

Your setup verification code: ${otp}

This code will expire in 10 minutes. If you didn't request to enable 2FA, please ignore this email.

Why Enable 2FA?
• Extra Security Layer - Protect your account even if password is compromised
• Email-Based Verification - Receive secure codes to your registered email
• Backup Codes - Generate codes for account recovery
• Quick & Easy - Simple setup with immediate benefits

Enter this code in the 2FA setup form to complete activation.

Need help? Contact support@koderspark.com

© 2025 Hire In Minutes. All rights reserved.`
    }),

    // Two-Factor Authentication Login Email Template
    twoFactorLogin: (otp, userName = 'User') => ({
        subject: '🔐 Login Verification Required - Hire In Minutes',
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login Verification - Hire In Minutes</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #f8fafc;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                    padding: 40px 30px;
                    text-align: center;
                    color: white;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    letter-spacing: -1px;
                }
                .tagline {
                    font-size: 14px;
                    opacity: 0.9;
                    margin: 0;
                }
                .content {
                    padding: 40px 30px;
                    text-align: center;
                }
                .greeting {
                    font-size: 28px;
                    font-weight: 700;
                    color: #1a202c;
                    margin-bottom: 20px;
                }
                .message {
                    font-size: 16px;
                    color: #4a5568;
                    margin-bottom: 30px;
                    line-height: 1.7;
                }
                .login-banner {
                    background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                    border-radius: 12px;
                    padding: 25px;
                    margin: 30px 0;
                    text-align: center;
                    color: white;
                    box-shadow: 0 8px 25px rgba(124, 58, 237, 0.3);
                }
                .login-title {
                    font-size: 20px;
                    font-weight: bold;
                    margin-bottom: 15px;
                }
                .login-text {
                    font-size: 16px;
                    opacity: 0.95;
                    line-height: 1.6;
                }
                .otp-container {
                    background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                    border-radius: 12px;
                    padding: 30px;
                    margin: 30px 0;
                    box-shadow: 0 8px 25px rgba(124, 58, 237, 0.3);
                }
                .otp-label {
                    color: white;
                    font-size: 14px;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 15px;
                    display: block;
                }
                .otp-code {
                    font-size: 36px;
                    font-weight: bold;
                    color: white;
                    letter-spacing: 8px;
                    font-family: 'Courier New', monospace;
                    margin: 0;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                .security-notice {
                    background: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 20px;
                    margin: 30px 0;
                    border-radius: 8px;
                }
                .security-text {
                    color: #92400e;
                    font-size: 14px;
                    margin: 0;
                    font-weight: 500;
                }
                .device-info {
                    background: #f8fafc;
                    border-radius: 12px;
                    padding: 20px;
                    margin: 30px 0;
                    border: 1px solid #e2e8f0;
                }
                .device-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1a202c;
                    margin-bottom: 10px;
                }
                .device-text {
                    color: #4a5568;
                    font-size: 14px;
                    margin: 0;
                }
                .footer {
                    background: #f8fafc;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }
                .footer-text {
                    color: #718096;
                    font-size: 14px;
                    margin: 0 0 10px 0;
                }
                @media (max-width: 600px) {
                    body {
                        padding: 10px;
                    }
                    .header {
                        padding: 30px 20px;
                    }
                    .content {
                        padding: 30px 20px;
                    }
                    .login-banner {
                        padding: 20px;
                    }
                    .otp-container {
                        padding: 20px;
                    }
                    .otp-code {
                        font-size: 28px;
                        letter-spacing: 6px;
                    }
                    .device-info {
                        padding: 15px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🔐 Hire In Minutes</div>
                    <p class="tagline">Secure Login Verification</p>
                </div>

                <div class="content">
                    <h1 class="greeting">Login Verification Required</h1>

                    <p class="message">
                        Hi ${userName}, we detected a login attempt to your Hire In Minutes account. For your security, we need to verify your identity.
                    </p>

                    <div class="login-banner">
                        <div class="login-title">🔒 Secure Login in Progress</div>
                        <div class="login-text">
                            Enter the verification code below to complete your login and access your account.
                        </div>
                    </div>

                    <div class="otp-container">
                        <span class="otp-label">Your Login Verification Code</span>
                        <div class="otp-code">${otp}</div>
                    </div>

                    <div class="security-notice">
                        <p class="security-text">
                            🛡️ This code will expire in 10 minutes and can only be used once. If you didn't attempt to log in, please change your password immediately and contact support.
                        </p>
                    </div>

                    <div class="device-info">
                        <div class="device-title">Login Attempt Details</div>
                        <p class="device-text">
                            <strong>Time:</strong> ${new Date().toLocaleString()}<br>
                            <strong>IP Address:</strong> Request from your current session<br>
                            <strong>Device:</strong> Web browser login
                        </p>
                    </div>

                    <p class="message">
                        This extra security step helps protect your account from unauthorized access. You can disable two-factor authentication anytime from your account settings if needed.
                    </p>
                </div>

                <div class="footer">
                    <p class="footer-text">
                        Didn't request this login? <a href="mailto:security@koderspark.com" style="color: #667eea;">Contact our security team</a>
                    </p>
                    <p class="footer-text">
                        © 2025 Hire In Minutes. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        `,
        text: `Login Verification Required

Hi ${userName},

We detected a login attempt to your Hire In Minutes account. For your security, please verify your identity.

Your login verification code: ${otp}

This code will expire in 10 minutes and can only be used once.

Login Details:
• Time: ${new Date().toLocaleString()}
• IP Address: Request from your current session
• Device: Web browser login

If you didn't attempt to log in, please change your password immediately and contact our security team.

Didn't request this login? Contact security@koderspark.com

© 2025 Hire In Minutes. All rights reserved.`
    }),

    // Account Deletion Confirmation Email Template
    accountDeletion: (userName = 'User') => ({
        subject: 'Account Deletion Confirmation - Hire In Minutes',
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Account Deletion Confirmation - Hire In Minutes</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #f8fafc;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                    padding: 40px 30px;
                    text-align: center;
                    color: white;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    letter-spacing: -1px;
                }
                .tagline {
                    font-size: 14px;
                    opacity: 0.9;
                    margin: 0;
                }
                .content {
                    padding: 40px 30px;
                    text-align: center;
                }
                .greeting {
                    font-size: 24px;
                    font-weight: 600;
                    color: #1a202c;
                    margin-bottom: 20px;
                }
                .message {
                    font-size: 16px;
                    color: #4a5568;
                    margin-bottom: 30px;
                    line-height: 1.7;
                }
                .warning-box {
                    background: #fef2f2;
                    border-left: 4px solid #dc2626;
                    padding: 20px;
                    margin: 30px 0;
                    border-radius: 8px;
                }
                .warning-text {
                    color: #991b1b;
                    font-size: 14px;
                    margin: 0;
                    font-weight: 500;
                }
                .info-box {
                    background: #f0f9ff;
                    border-radius: 12px;
                    padding: 25px;
                    margin: 30px 0;
                    border: 1px solid #e0f2fe;
                }
                .info-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: #1a202c;
                    margin-bottom: 10px;
                }
                .info-text {
                    color: #4a5568;
                    font-size: 14px;
                    margin: 0;
                    line-height: 1.6;
                }
                .footer {
                    background: #f8fafc;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }
                .footer-text {
                    color: #718096;
                    font-size: 14px;
                    margin: 0 0 10px 0;
                }
                @media (max-width: 600px) {
                    body {
                        padding: 10px;
                    }
                    .header {
                        padding: 30px 20px;
                    }
                    .content {
                        padding: 30px 20px;
                    }
                    .info-box {
                        padding: 20px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🗑️ Hire In Minutes</div>
                    <p class="tagline">Account Deletion Confirmation</p>
                </div>

                <div class="content">
                    <h1 class="greeting">Account Successfully Deleted</h1>

                    <p class="message">
                        Hi ${userName}, your Hire In Minutes account has been permanently deleted as requested.
                    </p>

                    <div class="warning-box">
                        <p class="warning-text">
                            ⚠️ This action cannot be undone. Your account and all associated data have been permanently removed from our system.
                        </p>
                    </div>

                    <div class="info-box">
                        <div class="info-title">What Was Deleted:</div>
                        <p class="info-text">
                            • Your account profile and personal information<br>
                            • All job applications and saved jobs<br>
                            • Posted jobs and company information (if applicable)<br>
                            • Course enrollments and college data (if applicable)<br>
                            • All notifications and messages<br>
                            • Review history and ratings<br>
                            • Verification applications<br>
                            • Email subscriptions
                        </p>
                    </div>

                    <p class="message">
                        If you change your mind or believe this was done in error, please contact our support team immediately. Note that we cannot restore deleted accounts or their data.
                    </p>
                </div>

                <div class="footer">
                    <p class="footer-text">
                        Need help? <a href="mailto:support@koderspark.com" style="color: #667eea;">Contact our support team</a>
                    </p>
                    <p class="footer-text">
                        © 2025 Hire In Minutes. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        `,
        text: `Account Deletion Confirmation

Hi ${userName},

Your Hire In Minutes account has been permanently deleted as requested.

⚠️ IMPORTANT: This action cannot be undone. Your account and all associated data have been permanently removed from our system.

What Was Deleted:
• Your account profile and personal information
• All job applications and saved jobs
• Posted jobs and company information (if applicable)
• Course enrollments and college data (if applicable)
• All notifications and messages
• Review history and ratings
• Verification applications
• Email subscriptions

If you change your mind or believe this was done in error, please contact our support team immediately. Note that we cannot restore deleted accounts or their data.

Need help? Contact support@koderspark.com

© 2025 Hire In Minutes. All rights reserved.`
    }),

    // Bulk Admin Message Template
    bulkAdminMessage: (userName = 'User', subject, message) => ({
        subject: subject,
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    background-color: #f8fafc;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                }
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 40px 30px;
                    text-align: center;
                    color: white;
                }
                .logo {
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    letter-spacing: -1px;
                }
                .tagline {
                    font-size: 14px;
                    opacity: 0.9;
                    margin: 0;
                }
                .content {
                    padding: 40px 30px;
                }
                .greeting {
                    font-size: 24px;
                    font-weight: 600;
                    color: #1a202c;
                    margin-bottom: 20px;
                }
                .message {
                    font-size: 16px;
                    color: #4a5568;
                    margin-bottom: 30px;
                    line-height: 1.7;
                }
                .footer {
                    background: #f8fafc;
                    padding: 30px;
                    text-align: center;
                    border-top: 1px solid #e2e8f0;
                }
                .footer-text {
                    color: #718096;
                    font-size: 14px;
                    margin: 0 0 10px 0;
                }
                @media (max-width: 600px) {
                    body {
                        padding: 10px;
                    }
                    .header {
                        padding: 30px 20px;
                    }
                    .content {
                        padding: 30px 20px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🚀 Hire In Minutes</div>
                    <p class="tagline">Official Announcement</p>
                </div>

                <div class="content">
                    <h1 class="greeting">Hello ${userName},</h1>
                    <div class="message">${message.replace(/\n/g, '<br>')}</div>
                </div>

                <div class="footer">
                    <p class="footer-text">
                        Need help? <a href="mailto:support@koderspark.com" style="color: #667eea;">Contact our support team</a>
                    </p>
                    <p class="footer-text">
                        © 2025 Hire In Minutes. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        `,
        text: `Hello ${userName},

${message}

Need help? Contact support@koderspark.com

© 2025 Hire In Minutes. All rights reserved.`
    })
};

module.exports = { sendEmail, emailTemplates };
