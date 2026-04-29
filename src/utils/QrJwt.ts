import jwt from 'jsonwebtoken';
import { ApiError } from './ApiError.js';

const QR_SECRET = process.env.QR_ACCESS_TOKEN_SECRET || '';
const QR_EXPIRES = Number(process.env.QR_TOKEN_EXPIRES_SECONDS || '15');

export function generateQRToken(payload: object) {
  if (!QR_SECRET) throw new ApiError(500, 'QR secret not configured');
  return jwt.sign(payload, QR_SECRET, { expiresIn: `${QR_EXPIRES}s` });
}

export function verifyQRToken(token: string) {
  try {
    return jwt.verify(token, QR_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired QR token');
  }
}
