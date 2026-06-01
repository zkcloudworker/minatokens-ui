// AES-256-GCM encryption for Mesa private keys.
//
// Byte format is intentionally identical to the canton-agent Rust scheme
// (crates/dvp/src/crypto.rs): base64( nonce(12) | ciphertext | tag(16) ),
// key = base64-decoded MESA_ENCRYPTION_KEY (raw 32 bytes, no KDF), plaintext =
// the base58 private key string. This keeps stored values decryptable by that
// same scheme later. Server-only — never import from a "use client" module.

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const NONCE_SIZE = 12;
const TAG_SIZE = 16;

function loadEncryptionKey(): Buffer {
  const keyBase64 = process.env.MESA_ENCRYPTION_KEY;
  if (!keyBase64) throw new Error("MESA_ENCRYPTION_KEY is undefined");
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32)
    throw new Error(
      `MESA_ENCRYPTION_KEY must decode to 32 bytes (256 bits), got ${key.length}`
    );
  return key;
}

/** Encrypt a base58 private key. Returns base64( nonce | ciphertext | tag ). */
export function encryptPrivateKey(plaintextBase58: string): string {
  const key = loadEncryptionKey();
  const nonce = randomBytes(NONCE_SIZE);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(plaintextBase58, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, ciphertext, tag]).toString("base64");
}

/** Inverse of encryptPrivateKey. Returns the original base58 private key. */
export function decryptPrivateKey(encrypted: string): string {
  const key = loadEncryptionKey();
  const combined = Buffer.from(encrypted, "base64");
  if (combined.length < NONCE_SIZE + TAG_SIZE)
    throw new Error("Encrypted data too short");
  const nonce = combined.subarray(0, NONCE_SIZE);
  const tag = combined.subarray(combined.length - TAG_SIZE);
  const ciphertext = combined.subarray(NONCE_SIZE, combined.length - TAG_SIZE);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8"
  );
}
