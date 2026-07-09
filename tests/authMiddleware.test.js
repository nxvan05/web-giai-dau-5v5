const jwt = require('jsonwebtoken');
const auth = require('../src/middleware/auth');
const orAuth = require('../src/middleware/orAuth');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function runMiddleware(middleware, req) {
  const res = mockRes();
  const next = jest.fn();
  middleware(req, res, next);
  return { res, next };
}

describe('auth middleware', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_DISCORD_IDS = 'admin-discord-id';
  });

  it('rejects a regular Discord JWT on admin-only routes', () => {
    const token = jwt.sign(
      { type: 'discord', discordId: 'regular-user', discordUsername: 'player' },
      process.env.JWT_SECRET
    );

    const { res, next } = runMiddleware(auth, {
      cookies: {},
      headers: { authorization: 'Bearer ' + token }
    });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('allows a configured Discord admin when using the admin sentinel', () => {
    const token = jwt.sign(
      { type: 'discord', discordId: 'admin-discord-id', discordUsername: 'evan', playerId: 'p1' },
      process.env.JWT_SECRET
    );
    const req = {
      cookies: { discord_token: token },
      headers: { authorization: 'Bearer discord_admin' }
    };

    const { next } = runMiddleware(auth, req);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      id: 'p1',
      username: 'evan',
      discordId: 'admin-discord-id',
      isAdmin: true
    });
  });
});

describe('orAuth middleware', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.ADMIN_DISCORD_IDS = 'admin-discord-id';
  });

  it('sets req.discordUser, not req.user, for a regular Discord JWT', () => {
    const token = jwt.sign(
      { type: 'discord', discordId: 'regular-user', discordUsername: 'player' },
      process.env.JWT_SECRET
    );
    const req = {
      cookies: {},
      headers: { authorization: 'Bearer ' + token }
    };

    const { next } = runMiddleware(orAuth, req);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(req.discordUser.discordId).toBe('regular-user');
  });

  it('promotes a configured Discord admin only when the admin sentinel is present', () => {
    const token = jwt.sign(
      { type: 'discord', discordId: 'admin-discord-id', discordUsername: 'evan', playerId: 'p1' },
      process.env.JWT_SECRET
    );
    const req = {
      cookies: { discord_token: token },
      headers: { authorization: 'Bearer discord_admin' }
    };

    const { next } = runMiddleware(orAuth, req);

    expect(next).toHaveBeenCalled();
    expect(req.discordUser).toBeUndefined();
    expect(req.user).toEqual({
      id: 'p1',
      username: 'evan',
      discordId: 'admin-discord-id',
      isAdmin: true
    });
  });
});
