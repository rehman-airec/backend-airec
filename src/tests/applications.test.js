const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const Application = require('../modules/application/application.model');
const Job = require('../modules/jobs/job.model');
const { Admin, Candidate } = require('../modules/auth/auth.model');
const path = require('path');
const fs = require('fs');

// Test database setup
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/recruitment_test');
  }
});

afterAll(async () => {
  await Application.deleteMany({});
  await Job.deleteMany({});
  await Admin.deleteMany({});
  await Candidate.deleteMany({});
  await mongoose.connection.close();
});

describe('Application Endpoints', () => {
  let adminToken, candidateToken;
  let testJob, testCandidate;

  beforeAll(async () => {
    // Create test admin
    const admin = await Admin.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'recruiter'
    });

    // Create test candidate
    const candidate = await Candidate.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'candidate@test.com',
      password: 'password123',
      phone: '+1234567890',
      totalExperience: 5
    });

    testCandidate = candidate;

    // Create test job
    const job = await Job.create({
      title: 'Senior Developer',
      location: { city: 'New York', country: 'USA', remote: false },
      department: 'Engineering',
      description: 'We are looking for a senior developer.',
      createdBy: admin._id,
      isPublished: true,
      status: 'published'
    });

    testJob = job;

    // Get tokens
    const adminLogin = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    adminToken = adminLogin.body.accessToken;

    const candidateLogin = await request(app)
      .post('/api/v1/auth/candidate/login')
      .send({ email: 'candidate@test.com', password: 'password123' });
    candidateToken = candidateLogin.body.accessToken;
  });

  describe('POST /api/v1/applications/jobs/:jobId/apply', () => {
    it('should apply for job with valid data', async () => {
      // Create a test PDF file
      const testPdfPath = path.join(__dirname, '../uploads/test.pdf');
      const testPdfContent = Buffer.from('Test PDF content');
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      fs.writeFileSync(testPdfPath, testPdfContent);

      const response = await request(app)
        .post(`/api/v1/applications/jobs/${testJob._id}/apply`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .field('firstName', 'John')
        .field('lastName', 'Doe')
        .field('email', 'candidate@test.com')
        .field('phone', '+1234567890')
        .field('totalExperience', '5')
        .field('screeningAnswers', JSON.stringify([
          { questionId: new mongoose.Types.ObjectId(), answer: '5 years' }
        ]))
        .attach('resume', testPdfPath)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.application).toBeDefined();

      // Clean up test file
      if (fs.existsSync(testPdfPath)) {
        fs.unlinkSync(testPdfPath);
      }
    });

    it('should not apply for job without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/applications/jobs/${testJob._id}/apply`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'test@example.com'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not apply for unpublished job', async () => {
      // Create unpublished job
      const unpublishedJob = await Job.create({
        title: 'Unpublished Job',
        location: { city: 'Test', country: 'Test', remote: false },
        department: 'Test',
        description: 'Test description',
        createdBy: new mongoose.Types.ObjectId(),
        isPublished: false,
        status: 'draft'
      });

      const response = await request(app)
        .post(`/api/v1/applications/jobs/${unpublishedJob._id}/apply`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: 'test@example.com'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/applications/candidate/applications', () => {
    it('should get candidate applications', async () => {
      const response = await request(app)
        .get('/api/v1/applications/candidate/applications')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.applications).toBeDefined();
    });

    it('should filter applications by status', async () => {
      const response = await request(app)
        .get('/api/v1/applications/candidate/applications?status=New')
        .set('Authorization', `Bearer ${candidateToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not get applications without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/applications/candidate/applications')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/applications/:id/status', () => {
    let testApplication;

    beforeAll(async () => {
      // Create test application
      const application = await Application.create({
        jobId: testJob._id,
        candidateId: testCandidate._id,
        resumePath: '/test/path.pdf',
        resumeFilename: 'test.pdf',
        candidateSnapshot: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'candidate@test.com'
        }
      });
      testApplication = application;
    });

    it('should update application status', async () => {
      const response = await request(app)
        .put(`/api/v1/applications/${testApplication._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'In Review',
          note: 'Moving to next round',
          priority: 'High'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.application.status).toBe('In Review');
    });

    it('should not update status without authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/applications/${testApplication._id}/status`)
        .send({ status: 'In Review' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate status values', async () => {
      const response = await request(app)
        .put(`/api/v1/applications/${testApplication._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Invalid Status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/applications/:id/note', () => {
    let testApplication;

    beforeAll(async () => {
      // Create test application
      const application = await Application.create({
        jobId: testJob._id,
        candidateId: testCandidate._id,
        resumePath: '/test/path2.pdf',
        resumeFilename: 'test2.pdf',
        candidateSnapshot: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'candidate@test.com'
        }
      });
      testApplication = application;
    });

    it('should add note to application', async () => {
      const response = await request(app)
        .post(`/api/v1/applications/${testApplication._id}/note`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'This is a test note' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate note content', async () => {
      const response = await request(app)
        .post(`/api/v1/applications/${testApplication._id}/note`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/applications/bulk/status', () => {
    let testApplications;

    beforeAll(async () => {
      // Create test applications
      const applications = await Application.create([
        {
          jobId: testJob._id,
          candidateId: testCandidate._id,
          resumePath: '/test/path3.pdf',
          resumeFilename: 'test3.pdf',
          candidateSnapshot: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'candidate@test.com'
          }
        },
        {
          jobId: testJob._id,
          candidateId: testCandidate._id,
          resumePath: '/test/path4.pdf',
          resumeFilename: 'test4.pdf',
          candidateSnapshot: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'candidate@test.com'
          }
        }
      ]);
      testApplications = applications;
    });

    it('should bulk update application statuses', async () => {
      const response = await request(app)
        .put('/api/v1/applications/bulk/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          applicationIds: testApplications.map(app => app._id),
          status: 'Interview',
          note: 'Scheduled for interview'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should validate application IDs', async () => {
      const response = await request(app)
        .put('/api/v1/applications/bulk/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          applicationIds: [],
          status: 'Interview'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/applications/admin/stats', () => {
    it('should get application statistics', async () => {
      const response = await request(app)
        .get('/api/v1/applications/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
    });

    it('should not get stats without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/applications/admin/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
