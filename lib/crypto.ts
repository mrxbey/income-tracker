import crypto from 'crypto'

/**
 * Encryption Utility
 *
 * Uses AES-256-GCM encryption for sensitive data like Plaid access tokens.
 * Requires ENCRYPTION_KEY environment variable (64 hex characters / 32 bytes).
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // For AES, this is always 16
const AUTH_TAG_LENGTH = 16
const ENCODING = 'hex'

/**
 * Get the encryption key from environment variables
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required for encrypting sensitive data'
    )
  }

  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)'
    )
  }

  return Buffer.from(key, 'hex')
}

/**
 * Encrypt a string value
 *
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (all hex encoded)
 *
 * @example
 * const encrypted = encrypt('sensitive-access-token')
 * // Returns: "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(text, 'utf8', ENCODING)
    encrypted += cipher.final(ENCODING)

    const authTag = cipher.getAuthTag()

    // Return format: iv:authTag:encryptedData
    return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt an encrypted string
 *
 * @param encryptedData - Encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plain text
 *
 * @example
 * const decrypted = decrypt('a1b2c3d4....:e5f6g7h8....:i9j0k1l2....')
 * // Returns: "sensitive-access-token"
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey()
    const parts = encryptedData.split(':')

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }

    const [ivHex, authTagHex, encrypted] = parts
    const iv = Buffer.from(ivHex, ENCODING)
    const authTag = Buffer.from(authTagHex, ENCODING)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, ENCODING, 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Generate a new random encryption key
 *
 * Use this to generate a key for ENCRYPTION_KEY environment variable.
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * @returns 64-character hex string (32 bytes)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}
