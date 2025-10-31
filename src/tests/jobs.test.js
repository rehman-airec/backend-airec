require('dotenv').config();

const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const Job = require('../modules/jobs/job.model');
const { Admin } = require('../modules/auth/auth.model');

// Test database setup
beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

afterAll(async () => {
  await Job.deleteMany({});
  await Admin.deleteMany({});
  await mongoose.connection.close();
});

describe('Job Endpoints', () => {
  let adminToken;
  let testJob;

  beforeAll(async () => {
    // Create test admin and get token
    const admin = await Admin.create({
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'recruiter'
    });

    const loginResponse = await request(app)
      .post('/api/v1/auth/admin/login')
      .send({
        email: 'admin@test.com',
        password: 'password123'
      });

    adminToken = loginResponse.body.accessToken;
  });

  describe('POST /api/v1/jobs', () => {
    it('should create a new job', async () => {
      const jobData = {
        title: 'Senior Developer',
        location: {
          city: 'New York',
          country: 'USA',
          remote: false
        },
        department: 'Engineering',
        description: 'We are looking for a senior developer with 5+ years of experience.',
        employmentType: 'Full-time',
        experienceLevel: 'Senior'
      };

      const response = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(jobData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.job.title).toBe(jobData.title);
      testJob = response.body.job;
    });

    it('should not create job without authentication', async () => {
      const jobData = {
        title: 'Test Job',
        location: { city: 'Test', country: 'Test' },
        department: 'Test',
        description: 'Test description'
      };

      const response = await request(app)
        .post('/api/v1/jobs')
        .send(jobData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/jobs', () => {
    it('should get all published jobs', async () => {
      const response = await request(app)
        .get('/api/v1/jobs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobs).toBeDefined();
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter jobs by department', async () => {
      const response = await request(app)
        .get('/api/v1/jobs?department=Engineering')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/jobs?page=1&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.current).toBe(1);
      expect(response.body.pagination.pages).toBeDefined();
    });
  });

  describe('GET /api/v1/jobs/search', () => {
    it('should search jobs by query', async () => {
      const response = await request(app)
        .get('/api/v1/jobs/search?q=developer')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobs).toBeDefined();
    });

    it('should filter by multiple criteria', async () => {
      const response = await request(app)
        .get('/api/v1/jobs/search?location=New York&employmentType=Full-time')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/jobs/:id', () => {
    it('should get job by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/jobs/${testJob._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.job._id).toBe(testJob._id.toString());
    });

    it('should return 404 for non-existent job', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/v1/jobs/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/jobs/:id/step/:step', () => {
    it('should update job step 2 (screening questions)', async () => {
      const stepData = {
        jobId: testJob._id,
        screeningQuestions: [
          {
            text: 'How many years of experience do you have?',
            type: 'text'
          }
        ]
      };

      const response = await request(app)
        .put(`/api/v1/jobs/${testJob._id}/step/2`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(stepData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not update job step without authentication', async () => {
      const response = await request(app)
        .put(`/api/v1/jobs/${testJob._id}/step/2`)
        .send({ jobId: testJob._id })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/jobs/:id/publish', () => {
    it('should publish job', async () => {
      const publishData = {
        publishedOn: ['linkedin', 'company']
      };

      const response = await request(app)
        .post(`/api/v1/jobs/${testJob._id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(publishData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.job.isPublished).toBe(true);
    });
  });

  describe('GET /api/v1/jobs/admin/jobs', () => {
    it('should get admin jobs', async () => {
      const response = await request(app)
        .get('/api/v1/jobs/admin/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.jobs).toBeDefined();
    });

    it('should not get admin jobs without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/jobs/admin/jobs')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/jobs/admin/stats', () => {
    it('should get job statistics', async () => {
      const response = await request(app)
        .get('/api/v1/jobs/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
    });
  });
});
