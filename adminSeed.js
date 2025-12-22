const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const seedAdmin = async () => {
    try {
        console.log('Connecting to MongoDB...');
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is not defined in .env file');
        }

        // Mask password in log
        const uri = process.env.MONGO_URI;
        const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
        console.log(`Using Database: ${maskedUri}`);

        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const email = 'akhilduddi95@gmail.com';
        const password = '123456789';

        let admin = await Admin.findOne({ email });

        if (admin) {
            console.log('Admin found. Updating account settings...');
            // Updating properties
            admin.password = password; // Will be hashed by pre-save hook
            admin.role = 'admin';
            admin.isActive = true;
            admin.isVerified = true; // Required for login
            admin.twoFactorEnabled = false; // Disable 2FA as requested

            // Clear 2FA related fields just in case
            admin.twoFactorSecret = undefined;
            admin.twoFactorBackupCodes = [];
            admin.twoFactorSetupToken = undefined;
            admin.twoFactorSetupExpires = undefined;

            console.log('Resetting password, enabling verification, and disabling 2FA...');
        } else {
            console.log('Admin not found. Creating new account...');
            admin = new Admin({
                email,
                password, // Will be hashed by pre-save hook
                fullName: 'Akhil Duddi',
                role: 'admin',
                isActive: true,
                isVerified: true, // Required for login
                twoFactorEnabled: false,
                preferences: {
                    theme: 'light',
                    emailNotifications: true
                }
            });
        }

        await admin.save();

        console.log('-------------------------------------------');
        console.log('✅ Admin Setup Complete');
        console.log('-------------------------------------------');
        console.log(`Email:    ${email}`);
        console.log(`Password: ${password}`);
        console.log(`Role:     admin`);
        console.log(`Verified: Yes`);
        console.log(`2FA:      Disabled`);
        console.log('-------------------------------------------');
        console.log('You can now login directly.');

    } catch (error) {
        console.error('❌ Error in admin seed script:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit(0);
    }
};

seedAdmin();
