import qrcode from "qrcode-generator";

export type QrErrorCorrection = "L" | "M" | "Q" | "H";

/**
 * Row-major matrix of booleans; `null` when the payload cannot be encoded
 * (for example when it exceeds QR capacity).
 */
export type QrMatrix = boolean[][] | null;

const cache = new Map<string, QrMatrix>();
const MAX_ENTRIES = 24;

export function getQrMatrix(
  value: string,
  errorCorrection: QrErrorCorrection,
): QrMatrix {
  const text = value.trim();
  if (!text) return null;

  const key = `${errorCorrection}:${text}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let matrix: QrMatrix = null;
  try {
    // Type number 0 lets the library pick the smallest fitting version.
    const code = qrcode(0, errorCorrection);
    code.addData(text);
    code.make();
    const count = code.getModuleCount();
    matrix = Array.from({ length: count }, (_, row) =>
      Array.from({ length: count }, (_, col) => code.isDark(row, col)),
    );
  } catch {
    matrix = null;
  }

  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, matrix);
  return matrix;
}
