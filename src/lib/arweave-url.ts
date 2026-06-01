/**
 * Arweave URL normalization.
 *
 * In early 2026 arweave.net migrated to a new (AO-based) backend. The old
 * gateway ignored anything after the transaction id in the path; the new one
 * treats it as a manifest path. This app uploads each file as its own
 * standalone transaction and then appends a cosmetic filename, producing URLs
 * like `https://arweave.net/<43-char-TXID>/RA.png`. That trailing `/RA.png`
 * now returns 404 — the bare `https://arweave.net/<TXID>` works.
 *
 * These helpers strip everything after the TXID so existing (and on-chain,
 * immutable) URLs render again. They are pure synchronous utilities — keep
 * this file free of `"use server"` so it can be imported anywhere.
 */

// Matches both path-style (arweave.net/<txid>/..) and subdomain-style
// (<base32>.arweave.net/<txid>/..). Arweave TXIDs are exactly 43 base64url chars.
const ARWEAVE_TXID =
  /^(https?:\/\/(?:[^/]+\.)?arweave\.net\/[A-Za-z0-9_-]{43})(?:[/?#].*)?$/;

export function normalizeArweaveUrl(url: string): string;
export function normalizeArweaveUrl(url: string | undefined): string | undefined;
export function normalizeArweaveUrl(url?: string): string | undefined {
  if (!url || typeof url !== "string") return url;
  const m = url.match(ARWEAVE_TXID);
  // Non-arweave URLs (ipfs, dalle blob, local /launchpad.png) pass through.
  return m ? m[1] : url;
}

// Fields that may hold an arweave URL on a token / collection object.
const URL_FIELDS = ["image", "uri", "adminUri", "banner"] as const;

type WithUrls = {
  image?: string;
  uri?: string;
  adminUri?: string;
  banner?: string;
};

/**
 * Returns a shallow copy of a token/collection with its URL-bearing fields
 * normalized. Only string fields that are actually present are rewritten.
 */
export function normalizeTokenInfoUrls<T extends WithUrls>(token: T): T {
  if (!token || typeof token !== "object") return token;
  const result = { ...token };
  for (const field of URL_FIELDS) {
    const value = result[field];
    if (typeof value === "string") {
      result[field] = normalizeArweaveUrl(value);
    }
  }
  return result;
}
