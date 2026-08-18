/**
 * Web Push implementation using Workers' built-in Web Crypto API.
 * Implements VAPID (RFC 8292) and aes128gcm payload encryption (RFC 8291 / RFC 8188).
 * No npm dependencies required.
 */

// ---------------------------------------------------------------------------
// Byte utilities
// ---------------------------------------------------------------------------

function base64urlToBytes(b64url) {
  const b64 = b64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(b64url.length + (4 - (b64url.length % 4)) % 4, '=');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64url(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function concat(...arrays) {
  const total = arrays.reduce((n, a) => n + a.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    const src = new Uint8Array(a instanceof ArrayBuffer ? a : a.buffer, a.byteOffset ?? 0, a.byteLength);
    out.set(src, offset);
    offset += src.byteLength;
  }
  return out;
}

function utf8Encode(str) {
  return new TextEncoder().encode(str);
}

// ---------------------------------------------------------------------------
// VAPID private key import
//
// web-push CLI outputs the private key as a raw 32-byte P-256 scalar (base64url).
// Web Crypto cannot import raw EC private keys; we must wrap them in a PKCS#8
// DER structure. The fixed 36-byte prefix below is the PKCS#8 wrapper for
// prime256v1 EC keys. The 32 raw key bytes are appended directly after it.
// ---------------------------------------------------------------------------

const PKCS8_EC_P256_PREFIX = new Uint8Array([
  0x30, 0x41,                                           // SEQUENCE (65 bytes total)
  0x02, 0x01, 0x00,                                     // INTEGER 0 (version)
  0x30, 0x13,                                           // SEQUENCE AlgorithmIdentifier (19 bytes)
  0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
  0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID prime256v1
  0x04, 0x27,                                           // OCTET STRING (39 bytes)
  0x30, 0x25,                                           // SEQUENCE ECPrivateKey (37 bytes)
  0x02, 0x01, 0x01,                                     // INTEGER 1 (ECPrivateKey version)
  0x04, 0x20,                                           // OCTET STRING (32 bytes) ← key follows
]);

async function importVapidPrivateKey(rawBase64url) {
  const rawBytes = base64urlToBytes(rawBase64url);
  if (rawBytes.length !== 32) throw new Error('VAPID private key must be 32 bytes');
  const pkcs8 = concat(PKCS8_EC_P256_PREFIX, rawBytes);
  return crypto.subtle.importKey(
    'pkcs8',
    pkcs8.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

// ---------------------------------------------------------------------------
// VAPID JWT signing (RFC 8292)
// ---------------------------------------------------------------------------

/**
 * Sign and return the VAPID Authorization header value.
 * @returns {Promise<{ authorization: string }>}
 */
export async function signVapidJWT(endpoint, privateB64, publicB64, subject) {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);

  const headerB64  = bytesToBase64url(utf8Encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payloadB64 = bytesToBase64url(utf8Encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: subject })));
  const signingInput = utf8Encode(`${headerB64}.${payloadB64}`);

  const privateKey = await importVapidPrivateKey(privateB64);

  // Web Crypto returns ECDSA signatures in IEEE P1363 (r‖s, 64 bytes).
  // JWT ES256 also expects IEEE P1363 — no DER conversion needed.
  const sigRaw = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, signingInput);
  const jwt = `${headerB64}.${payloadB64}.${bytesToBase64url(new Uint8Array(sigRaw))}`;

  return { authorization: `vapid t=${jwt},k=${publicB64}` };
}

// ---------------------------------------------------------------------------
// Payload encryption — RFC 8291 (aes128gcm content encoding)
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext string for delivery to a Web Push subscription.
 * @param {{ endpoint: string, keys: { p256dh: string, auth: string } }} subscription
 * @param {string} plaintext
 * @returns {Promise<{ body: ArrayBuffer }>}
 */
export async function encryptPayload(subscription, plaintext) {
  const recipientPubKeyBytes = base64urlToBytes(subscription.keys.p256dh); // 65 bytes
  const authSecret = base64urlToBytes(subscription.keys.auth);              // 16 bytes

  // 1. Ephemeral sender ECDH key pair
  const ephemeralPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const ephemeralPubKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeralPair.publicKey));

  // 2. Import recipient public key and derive ECDH shared secret
  const recipientPubKey = await crypto.subtle.importKey('raw', recipientPubKeyBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = await crypto.subtle.deriveBits({ name: 'ECDH', public: recipientPubKey }, ephemeralPair.privateKey, 256);

  // 3. HKDF stage 1: extract IKM
  //    key_info = "WebPush: info\x00" | recipientPubKey | ephemeralPubKey
  const keyInfo = concat(utf8Encode('WebPush: info\x00'), recipientPubKeyBytes, ephemeralPubKeyRaw);
  const ecdhKey = await crypto.subtle.importKey('raw', ecdhSecret, { name: 'HKDF' }, false, ['deriveBits']);
  const ikm = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: keyInfo }, ecdhKey, 256);

  // 4. Random 16-byte content encryption salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 5. HKDF stage 2: derive CEK (16 bytes) and Nonce (12 bytes) from IKM
  const ikmKey = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  const cekBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: utf8Encode('Content-Encoding: aes128gcm\x00\x01') },
    ikmKey, 128
  );
  const nonceBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: utf8Encode('Content-Encoding: nonce\x00\x01') },
    ikmKey, 96
  );

  // 6. AES-128-GCM encrypt (plaintext | 0x02 delimiter byte)
  const cek = await crypto.subtle.importKey('raw', cekBits, { name: 'AES-GCM' }, false, ['encrypt']);
  const paddedPlaintext = concat(utf8Encode(plaintext), new Uint8Array([0x02]));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, cek, paddedPlaintext);

  // 7. Build RFC 8188 aes128gcm header (86 bytes total):
  //    salt(16) | recordSize(4, BE uint32) | keyidLen(1) | keyid=ephemeralPubKey(65)
  const header = new Uint8Array(86);
  const view = new DataView(header.buffer);
  header.set(salt, 0);
  view.setUint32(16, 4096, false); // record size big-endian
  header[20] = 65;                  // keyid length
  header.set(ephemeralPubKeyRaw, 21);

  return { body: concat(header, new Uint8Array(ciphertext)).buffer };
}

// ---------------------------------------------------------------------------
// Send Web Push notification
// ---------------------------------------------------------------------------

/**
 * @param {{ endpoint: string, keys: { p256dh: string, auth: string } }} subscription
 * @param {object} payload - Will be JSON-serialized; received by sw.js push handler
 * @param {{ publicKey: string, privateKey: string, subject: string }} vapidKeys
 * @returns {Promise<Response>}
 */
export async function sendWebPush(subscription, payload, vapidKeys) {
  const { body } = await encryptPayload(subscription, JSON.stringify(payload));
  const { authorization } = await signVapidJWT(
    subscription.endpoint,
    vapidKeys.privateKey,
    vapidKeys.publicKey,
    vapidKeys.subject
  );

  return fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: '300',
    },
    body,
  });
}
