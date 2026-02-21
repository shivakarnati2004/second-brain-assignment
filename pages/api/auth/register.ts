import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { ensureSchemaInitialized } from '@/lib/schema';

interface ExistingUser {
  id: string;
}

interface CreatedUser {
  id: string;
  email: string;
  name: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, password } = req.body || {};

  const safeName = String(name || '').trim();
  const safeEmail = String(email || '').trim().toLowerCase();
  const safePassword = String(password || '');

  if (!safeName || !safeEmail || !safePassword) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (safePassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    await ensureSchemaInitialized();

    const [existing] = await query<ExistingUser>(
      'SELECT id FROM users WHERE email = $1',
      [safeEmail]
    );

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(safePassword, 10);

    const [user] = await query<CreatedUser>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [safeName, safeEmail, passwordHash]
    );

    return res.status(201).json({ data: user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Account creation failed' });
  }
}
