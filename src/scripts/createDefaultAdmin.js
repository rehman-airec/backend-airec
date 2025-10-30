const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Admin } = require('../modules/auth/auth.model');
require('dotenv').config();

const createDefaultAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@gmail.com' });
    if (existingAdmin) {
      console.log('Default admin already exists');
      process.exit(0);
    }

    // Create default admin
    const admin = new Admin({
      name: 'Default Admin',
      email: 'admin@gmail.com',
      password: 'admin1234',
      role: 'superadmin'
    });

    await admin.save();
    console.log('Default admin created successfully:');
    console.log('Email: admin@gmail.com');
    console.log('Password: admin1234');
    console.log('Role: superadmin');

  } catch (error) {
    console.error('Error creating default admin:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createDefaultAdmin();
