import { createCipheriv, randomBytes, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // AES blocksize
const KEY_LENGTH = 32; // 256 bits

export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex').slice(0, KEY_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift() || '', 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex').slice(0, KEY_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}