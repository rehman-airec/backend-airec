/**
 * Migration script to update existing guest applications with candidateSnapshot
 * Run this once to fix existing applications
 * Usage: node src/scripts/updateGuestApplications.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const GuestApplication = require('../modules/guestApplications/guestApplication.model');
const Application = require('../modules/application/application.model');

async function updateGuestApplications() {
  try {
    await connectDB();
    console.log('Database connected');

    // Find all guest applications without candidateSnapshot
    const applications = await Application.find({ 
      isGuestApplication: true,
      $or: [
        { candidateSnapshot: { $exists: false } },
        { candidateSnapshot: null }
      ]
    });

    console.log(`Found ${applications.length} guest applications without candidateSnapshot`);

    let updated = 0;

    for (const application of applications) {
      if (application.guestApplicationId) {
        // Get the guest application
        const guestApp = await GuestApplication.findById(application.guestApplicationId);
        
        if (guestApp && guestApp.candidateInfo) {
          // Update with candidate snapshot
          application.candidateSnapshot = {
            firstName: guestApp.candidateInfo.firstName,
            lastName: guestApp.candidateInfo.lastName,
            email: guestApp.candidateInfo.email,
            phone: guestApp.candidateInfo.phone,
            totalExperience: guestApp.candidateInfo.totalExperience,
            linkedinUrl: guestApp.candidateInfo.linkedinUrl || ''
          };

          await application.save();
          updated++;
          console.log(`Updated application ${application._id}`);
        }
      }
    }

    console.log(`Successfully updated ${updated} guest applications`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating guest applications:', error);
    process.exit(1);
  }
}

updateGuestApplications();

