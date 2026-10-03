// Web Crypto API utilities for cryptographic integrity & SHA-256 seals
// Strictly non-hallucinated, standards-compliant Web Cryptography

export async function computeSha256(data: string | Uint8Array | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof data === 'string') {
    buffer = new TextEncoder().encode(data).buffer;
  } else if (data instanceof Uint8Array) {
    buffer = data.buffer as ArrayBuffer;
  } else {
    buffer = data;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function computeFileSha256(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return computeSha256(arrayBuffer);
}

export async function verifySha256(data: string | Uint8Array | ArrayBuffer, expectedHash: string): Promise<boolean> {
  const actualHash = await computeSha256(data);
  return actualHash.toLowerCase() === expectedHash.toLowerCase();
}
