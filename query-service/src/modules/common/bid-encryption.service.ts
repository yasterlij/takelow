import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

@Injectable()
export class BidEncryptionService {
  private key: Buffer;

  constructor() {
    const raw = process.env.BID_ENCRYPTION_KEY;
    if (!raw) {
      throw new Error('BID_ENCRYPTION_KEY environment variable is not set');
    }
    this.key = crypto.scryptSync(raw, 'takelow-bid-salt', 32);
  }

  encrypt(plaintext: number): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(String(plaintext), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(encoded: string): number {
    const [ivB64, tagB64, dataB64] = encoded.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    const decrypted = decipher.update(encrypted);
    return parseFloat(decipher.final().toString());
  }
}