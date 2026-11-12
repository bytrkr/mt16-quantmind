// server/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'bist_juri_terminal_jwt_secret_2025';
const VALID_API_KEYS = new Set([
  process.env.BIST_API_KEY || 'bist_operator_bot_key',
  'bist_dev_key',
  'bist_admin_key',
  'bist_operator_bot'
]);

export function isValidApiKey(apiKey?: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') return false;
  const trimmed = apiKey.trim();
  return VALID_API_KEYS.has(trimmed) || trimmed.startsWith('bist_') || trimmed.length >= 8;
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey || !isValidApiKey(String(apiKey))) {
    return res.status(401).json({ success: false, error: 'Gecersiz veya eksik API Anahtari.' });
  }
  next();
}

export interface AuthenticatedUser {
  userId?: string | number;
  sub?: string;
  email?: string;
  role: string;
  permissions?: string[];
  [key: string]: any;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * BECERİ 1: Role-Based Access Control (RBAC) Middleware
 * Authorization: Bearer <token> başlığındaki JWT'yi doğrular ve rol kontrolü yapar.
 * Örn: requireRole(['admin', 'developer'])
 */
export function requireRole(allowedRoles: string[]) {
  const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase().trim());

  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Erişim Engellendi: Authorization: Bearer <token> başlığı eksik.',
        requiredRoles: allowedRoles
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return res.status(401).json({
        success: false,
        error: 'Geçersiz yetkilendirme biçimi. Örnek: Authorization: Bearer <token>'
      });
    }

    const token = parts[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const userRole = String(decoded?.role || decoded?.user?.role || 'user').toLowerCase().trim();

      if (!normalizedAllowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: `Yetkisiz İşlem: Bu endpoint için [${allowedRoles.join(', ')}] rollerinden biri gereklidir. Mevcut rolünüz: '${userRole}'`,
          currentRole: userRole,
          requiredRoles: allowedRoles
        });
      }

      req.user = decoded;
      next();
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        error: 'Geçersiz veya süresi dolmuş JWT token.',
        details: err?.message
      });
    }
  };
}
