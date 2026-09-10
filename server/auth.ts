import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';
import type { StoredUser } from './db.ts';

export const JWT_SECRET = process.env.JWT_SECRET || 'teacher_resource_hub_secret_key_2026_jwt';
export { jwt };

export interface AuthenticatedRequest extends Request {
  user?: StoredUser;
}

export function hashPassword(plainText: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(plainText, salt);
}

export function comparePassword(plainText: string, hash: string): boolean {
  return bcrypt.compareSync(plainText, hash);
}

export function generateToken(user: StoredUser, rememberMe = false): string {
  const expiresIn = rememberMe ? '30d' : '24h';
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn }
  );
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  // Also accept ?token= from query parameters (critical for <img>, <video>, <audio>, <iframe>, and downloads)
  if (!token && req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = db.getUserById(decoded.id);

    if (!user) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ error: 'Account has been suspended by an administrator.' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    return;
  }
  next();
}
