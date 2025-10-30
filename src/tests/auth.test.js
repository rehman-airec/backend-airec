const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const { Admin, Candidate } = require('../modules/auth/auth.model');

// Test database setup
beforeAll(async () => {
  // Connect to test database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/recruitment_test');
  }
});

afterAll(async () => {
  // Clean up test database
  await Admin.deleteMany({});
  await Candidate.deleteMany({});
  await mongoose.connection.close();
});

describe('Authentication Endpoints', () => {
  describe('POST /api/v1/auth/admin/signup', () => {
    it('should create a new admin', async () => {
      const adminData = {
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'password123',
        role: 'recruiter'
      };

      const response = await request(app)
        .post('/api/v1/auth/admin/signup')
        .send(adminData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.admin.email).toBe(adminData.email);
    });

    it('should not create admin with duplicate email', async () => {
      const adminData = {
        name: 'Test Admin 2',
        email: 'admin@test.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/admin/signup')
        .send(adminData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/admin/signup')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/candidate/signup', () => {
    it('should create a new candidate', async () => {
      const candidateData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'candidate@test.com',
        password: 'password123',
        phone: '+1234567890',
        totalExperience: 5
      };

      const response = await request(app)
        .post('/api/v1/auth/candidate/signup')
        .send(candidateData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.candidate.email).toBe(candidateData.email);
    });

    it('should validate candidate data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/candidate/signup')
        .send({
          firstName: 'John',
          email: 'invalid-email',
          password: '123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/admin/login', () => {
    it('should login admin with valid credentials', async () => {
      const loginData = {
        email: 'admin@test.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/admin/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should not login admin with invalid credentials', async () => {
      const loginData = {
        email: 'admin@test.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/admin/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken;

    beforeAll(async () => {
      // Get refresh token from login
      const loginResponse = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'password123'
        });
      
      refreshToken = loginResponse.body.refreshToken;
    });

    it('should refresh access token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authToken;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/v1/auth/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'password123'
        });
      
      authToken = loginResponse.body.accessToken;
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.userType).toBe('admin');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
