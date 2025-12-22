const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const connectDB = require('./config/database');
const Recruiter = require('./models/Recruiter');

const run = async () => {
    try {
        await connectDB();
        console.log('Connected to DB');

        // Find the specific user mentioned by the user
        // Note: The user ID in the request was 6942e1eb642b8b13e22fa8c4 (likely mocked/example or real)
        // We'll search by email if possible, or list recent recruiters

        console.log('--- RECENT RECRUITERS ---');
        const recruiters = await Recruiter.find().sort({ createdAt: -1 }).limit(3);

        recruiters.forEach(r => {
            console.log(`ID: ${r._id}`);
            console.log(`Email: ${r.email}`);
            console.log(`Onboarding Complete: ${r.recruiterOnboardingDetails?.isComplete}`);
            console.log(`Company Name (Onboarding): ${r.recruiterOnboardingDetails?.company?.name}`);
            console.log(`Company Address (Onboarding): ${r.recruiterOnboardingDetails?.company?.address}`);
            console.log('-----------------------------------');
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
};

run();
