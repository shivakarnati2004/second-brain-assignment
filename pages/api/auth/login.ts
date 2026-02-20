import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { getSession } from '@/lib/auth';

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [user] = await query<UserRow>(
      `SELECT id, email, name, password_hash
       FROM users
       WHERE email = $1`,
      [String(email).trim().toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(String(password), user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const session = await getSession(req, res);
    session.user = { id: user.id, email: user.email, name: user.name };
    await session.save();

    return res.status(200).json({ data: { id: user.id, email: user.email, name: user.name } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
}
