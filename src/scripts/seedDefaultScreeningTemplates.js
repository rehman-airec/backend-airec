/**
 * Seed default screening question templates
 * Run this once to create default templates
 * Usage: node src/scripts/seedDefaultScreeningTemplates.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const ScreeningTemplate = require('../modules/screeningTemplates/screeningTemplate.model');
const { Admin } = require('../modules/auth/auth.model');

const defaultTemplates = [
  {
    name: 'Standard Hiring Questions',
    description: 'Common questions for general positions',
    isDefault: true,
    tags: ['standard', 'general', 'hiring'],
    questions: [
      {
        text: 'How soon could you join if given a job offer?',
        type: 'text',
        required: true,
        placeholder: 'e.g., 2 weeks notice period'
      },
      {
        text: 'What are your salary expectations?',
        type: 'text',
        required: true,
        placeholder: 'e.g., $50,000 - $60,000'
      },
      {
        text: 'Are you authorized to work in the country where this position is located?',
        type: 'yes-no',
        required: true
      }
    ]
  },
  {
    name: 'Technical Assessment',
    description: 'Questions for technical positions',
    isDefault: true,
    tags: ['technical', 'assessment', 'skills'],
    questions: [
      {
        text: 'How many years of experience do you have in this field?',
        type: 'text',
        required: true,
        placeholder: 'e.g., 3 years'
      },
      {
        text: 'What programming languages are you most proficient in?',
        type: 'multiple-choice',
        required: true,
        options: ['JavaScript', 'Python', 'Java', 'C++', 'TypeScript', 'Ruby', 'Go', 'Rust']
      },
      {
        text: 'Are you comfortable with remote work?',
        type: 'yes-no',
        required: true
      }
    ]
  },
  {
    name: 'Management & Leadership',
    description: 'Questions for management and leadership positions',
    isDefault: true,
    tags: ['management', 'leadership', 'leadership'],
    questions: [
      {
        text: 'How many years of management experience do you have?',
        type: 'text',
        required: true,
        placeholder: 'e.g., 5 years'
      },
      {
        text: 'How many people have you managed?',
        type: 'multiple-choice',
        required: true,
        options: ['1-5', '6-10', '11-25', '26-50', '50+']
      },
      {
        text: 'Describe your leadership style',
        type: 'text',
        required: true,
        placeholder: 'Brief description of your leadership approach'
      }
    ]
  }
];

async function seedDefaultTemplates() {
  try {
    await connectDB();
    console.log('Database connected');

    // Get the first admin user to use as creator
    const admin = await Admin.findOne();
    
    if (!admin) {
      console.error('No admin user found. Please create an admin first.');
      process.exit(1);
    }

    console.log(`Using admin: ${admin.email}`);

    let created = 0;
    let skipped = 0;

    for (const templateData of defaultTemplates) {
      const existingTemplate = await ScreeningTemplate.findOne({ 
        name: templateData.name,
        isDefault: true 
      });

      if (existingTemplate) {
        console.log(`Skipping ${templateData.name} - already exists`);
        skipped++;
        continue;
      }

      const template = await ScreeningTemplate.create({
        ...templateData,
        createdBy: admin._id
      });

      console.log(`Created template: ${template.name}`);
      created++;
    }

    console.log(`\nSeed completed:`);
    console.log(`  Created: ${created}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total templates: ${await ScreeningTemplate.countDocuments()}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
}

seedDefaultTemplates();

