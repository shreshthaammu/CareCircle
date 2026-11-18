import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthSession, Role } from '../types/index.js';
import { circleRepo } from '../repositories/circle.repo.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthSession;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  let token = req.cookies?.carecircle_token;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please join or sign in to your CareCircle.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'string') {
      res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      return;
    }

    const session = decoded as AuthSession;
    if (
      !session.circleId ||
      !['ELDER', 'CARETAKER', 'FAMILY'].includes(session.role)
    ) {
      res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      return;
    }

    void circleRepo.getById(session.circleId).then((circle) => {
      const currentVersion = circle?.sessionVersions?.[session.role] ?? 0;
      if (!circle || currentVersion !== (session.sessionVersion ?? 0)) {
        res.status(401).json({ error: 'Session revoked. Please join your CareCircle again.' });
        return;
      }

      req.user = session;
      next();
    }).catch(next);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
      return;
    }
    next(error);
  }
}

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Action requires one of: ${allowedRoles.join(', ')}. Current role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}

export function requireVisibility(section: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (req.user.role === 'ELDER') {
      next();
      return;
    }

    const roleKey = req.user.role === 'CARETAKER' ? 'caretaker' : 'family';
    void circleRepo.getById(req.user.circleId).then((circle) => {
      if (!circle) {
        res.status(404).json({ error: 'Care Circle not found' });
        return;
      }
      if (circle.sharingPaused || !circle.roleVisibility?.[roleKey]?.includes(section)) {
        res.status(403).json({ error: 'This information is not shared with your role.' });
        return;
      }
      next();
    }).catch(next);
  };
}

export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  const isStateChanging = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  if (isStateChanging && req.cookies?.carecircle_token && req.get('X-CareCircle-CSRF') !== '1') {
    res.status(403).json({ error: 'CSRF validation failed.' });
    return;
  }
  next();
}
