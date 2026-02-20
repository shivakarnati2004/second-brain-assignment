import type { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession, type SessionOptions } from 'iron-session';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface AppSessionData {
  user?: SessionUser;
}

const secret = process.env.AUTH_SECRET;
if (!secret) {
  throw new Error('AUTH_SECRET is not configured. Set AUTH_SECRET in .env.local.');
}

export const sessionOptions: SessionOptions = {
  cookieName: 'second_brain_session',
  password: secret,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

export async function getSession(req: NextApiRequest, res: NextApiResponse) {
  return getIronSession<AppSessionData>(req, res, sessionOptions);
}

export async function getSessionUser(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  return session.user || null;
}

export async function requireSessionUser(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req, res);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return user;
}
