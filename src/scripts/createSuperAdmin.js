const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Admin } = require('../modules/auth/auth.model');
require('dotenv').config();

/**
 * Script to create a super admin account
 * 
 * Usage:
 *   node src/scripts/createSuperAdmin.js
 *   node src/scripts/createSuperAdmin.js --email admin@example.com --password secure123 --name "Super Admin"
 */
const createSuperAdmin = async () => {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let email = 'admin@example.com';
    let password = 'admin1234';
    let name = 'Super Admin';

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--email' && args[i + 1]) {
        email = args[i + 1];
        i++;
      } else if (args[i] === '--password' && args[i + 1]) {
        password = args[i + 1];
        i++;
      } else if (args[i] === '--name' && args[i + 1]) {
        name = args[i + 1];
        i++;
      }
    }

    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      console.error('❌ Error: MONGODB_URI not found in environment variables');
      console.error('Please make sure .env file exists and contains MONGODB_URI');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin with this email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      console.log(`⚠️  Admin with email "${email}" already exists`);
      if (existingAdmin.role === 'superadmin') {
        console.log('✅ This admin is already a super admin');
      } else {
        console.log(`ℹ️  Current role: ${existingAdmin.role}`);
        console.log('💡 To convert to superadmin, update the role in MongoDB:');
        console.log(`   db.admins.updateOne({email: "${email}"}, {$set: {role: "superadmin"}})`);
      }
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create super admin
    // Note: Password will be hashed by the pre-save middleware in the Admin model
    const admin = new Admin({
      name: name,
      email: email.toLowerCase(),
      password: password,
      role: 'superadmin',
      isActive: true,
      // tenantId is intentionally not set for super admin
    });

    await admin.save();
    
    console.log('\n✅ Super admin created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 Name:', name);
    console.log('⭐ Role: superadmin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 You can now login with these credentials');
    console.log('   URL: http://localhost:3000/auth/login');
    console.log('   Select role: Admin');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    if (error.message.includes('duplicate key')) {
      console.error('💡 An admin with this email already exists');
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

createSuperAdmin();

