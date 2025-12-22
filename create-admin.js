require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@hireinminutes.com' });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      console.log('Email: admin@hireinminutes.com');
      console.log('Password: admin123');
      process.exit(0);
    }

    // Create new admin
    const admin = new Admin({
      email: 'admin@hireinminutes.com',
      password: 'admin123',
      fullName: 'System Administrator',
      role: 'admin',
      isActive: true
    });

    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@hireinminutes.com');
    console.log('Password: admin123');
    console.log('Role: admin');

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();