const mongoose = require('mongoose');
const College = require('./models/College');

require('dotenv').config();

const updateCollegeRoles = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Update all colleges that don't have a role field
    const result = await College.updateMany(
      { role: { $exists: false } },
      { $set: { role: 'college' } }
    );

    console.log(`Updated ${result.modifiedCount} college records with role field`);

    await mongoose.disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error updating college roles:', error);
  }
};

updateCollegeRoles();