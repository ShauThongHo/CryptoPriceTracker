import CryptoJS from 'crypto-js';

/**
 * Encryption service for securing sensitive data like API keys
 * Uses AES encryption with a user-provided password
 */
class EncryptionService {
  private static instance: EncryptionService;
  private masterPassword: string | null = null;

  private constructor() {}

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Set the master password for encryption/decryption
   * This should be called when the user sets up encryption or logs in
   */
  setMasterPassword(password: string): void {
    this.masterPassword = password;
  }

  /**
   * Check if master password is set
   */
  isUnlocked(): boolean {
    return this.masterPassword !== null;
  }

  /**
   * Clear the master password (logout)
   */
  lock(): void {
    this.masterPassword = null;
  }

  /**
   * Encrypt a string using AES
   */
  encrypt(data: string): string {
    if (!this.masterPassword) {
      throw new Error('Encryption service is locked. Please set master password first.');
    }
    return CryptoJS.AES.encrypt(data, this.masterPassword).toString();
  }

  /**
   * Decrypt a string using AES
   */
  decrypt(encryptedData: string): string {
    if (!this.masterPassword) {
      throw new Error('Encryption service is locked. Please set master password first.');
    }
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.masterPassword);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Hash a password (for verification)
   */
  hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Verify a password against a hash
   */
  verifyPassword(password: string, hash: string): boolean {
    return this.hash(password) === hash;
  }
}

export const encryptionService = EncryptionService.getInstance();
