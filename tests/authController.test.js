const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../src/utils/prisma', () => ({
  admin: {
    findUnique: jest.fn(),
  },
}));

const prisma = require('../src/utils/prisma');
const { login, logout, me } = require('../src/controllers/authController');

function mockReq(overrides = {}) {
  return { body: {}, cookies: {}, ...overrides };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
}

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'development';
  });

  describe('login', () => {
    it('returns 400 if missing fields', async () => {
      const req = mockReq({ body: {} });
      const res = mockRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Username and password required' });
    });

    it('returns 401 if user not found', async () => {
      prisma.admin.findUnique.mockResolvedValue(null);
      const req = mockReq({ body: { username: 'x', password: 'y' } });
      const res = mockRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 401 if password is wrong', async () => {
      prisma.admin.findUnique.mockResolvedValue({ id: 1, username: 'admin', password: '$2a$10$hash' });
      bcrypt.compare = jest.fn().mockResolvedValue(false);
      const req = mockReq({ body: { username: 'admin', password: 'wrong' } });
      const res = mockRes();
      await login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns token on successful login', async () => {
      const hashed = '$2a$10$dummyhash';
      prisma.admin.findUnique.mockResolvedValue({ id: 1, username: 'admin', password: hashed });
      bcrypt.compare = jest.fn().mockResolvedValue(true);
      jwt.sign = jest.fn().mockReturnValue('signed-token');
      const req = mockReq({ body: { username: 'admin', password: 'correct' } });
      const res = mockRes();
      await login(req, res);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 1, username: 'admin' },
        'test-secret',
        { expiresIn: '1d' }
      );
      expect(res.cookie).toHaveBeenCalledWith('token', 'signed-token', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged in', token: 'signed-token' });
    });
  });

  describe('logout', () => {
    it('clears cookie and returns message', () => {
      const req = mockReq();
      const res = mockRes();
      logout(req, res);
      expect(res.clearCookie).toHaveBeenCalledWith('token');
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out' });
    });
  });

  describe('me', () => {
    it('returns req.user', () => {
      const req = mockReq({ user: { id: 1, username: 'admin' } });
      const res = mockRes();
      me(req, res);
      expect(res.json).toHaveBeenCalledWith({ user: { id: 1, username: 'admin' } });
    });
  });
});
