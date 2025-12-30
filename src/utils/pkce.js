// src/utils/pkce.js
const base64UrlEncode = (arrayBuffer) => {
  const bytes = new Uint8Array(arrayBuffer);
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const randomString = (len = 32) => {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return base64UrlEncode(arr);
};

export const sha256 = async (plain) => {
  const enc = new TextEncoder().encode(plain);
  return await crypto.subtle.digest("SHA-256", enc);
};

export const pkceChallengeFromVerifier = async (verifier) => {
  const hashed = await sha256(verifier);
  return base64UrlEncode(hashed);
};
