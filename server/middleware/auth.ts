import '../config/env';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbService } from '../services/dbStore';
import { IUser, UserRole } from '../models/types';

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '' || secret === 'replace_with_secure_secret') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable must be set in production mode.');
    }
    return 'eventhub_development_fallback_secret_key_only';
  }
  return secret;
};

export interface AuthRequest extends Request {
  user?: IUser;
}

export const generateToken = (user: IUser): string => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authentication required. No Bearer token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      res.status(401).json({ message: 'Invalid token format.' });
      return;
    }

    const decoded = jwt.verify(token, getJwtSecret()) as { id: string; email: string; role: string };

    const user = await dbService.findUserById(decoded.id);
    if (!user) {
      res.status(401).json({ message: 'User account not found or was deleted.' });
      return;
    }

    if (user.accountStatus === 'suspended') {
      res.status(403).json({ message: 'Your account has been suspended by an administrator.' });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Session expired. Please log in again.' });
      return;
    }
    res.status(401).json({ message: 'Invalid or malformed authentication token.' });
  }
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token && token.trim() !== '') {
        const decoded = jwt.verify(token, getJwtSecret()) as { id: string };
        const user = await dbService.findUserById(decoded.id);
        if (user && user.accountStatus === 'active') {
          req.user = user;
        }
      }
    }
    next();
  } catch {
    next();
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        message: `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required: [${allowedRoles.join(', ')}]`
      });
      return;
    }

    next();
  };
};
