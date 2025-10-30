const request = require('supertest');
const app = require('../server');

describe('Health Check', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/api/v1/health')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Server is running');
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.environment).toBeDefined();
    expect(response.body.version).toBeDefined();
  });

  it('should return API documentation', async () => {
    const response = await request(app)
      .get('/api/v1/docs')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('API Documentation');
    expect(response.body.endpoints).toBeDefined();
    expect(response.body.endpoints.auth).toBeDefined();
    expect(response.body.endpoints.jobs).toBeDefined();
    expect(response.body.endpoints.applications).toBeDefined();
    expect(response.body.endpoints.files).toBeDefined();
  });

  it('should handle 404 for non-existent routes', async () => {
    const response = await request(app)
      .get('/api/v1/non-existent-route')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Route not found');
    expect(response.body.path).toBeDefined();
  });
});
