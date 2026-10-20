// Small dependency-free ZIP writer (stored entries, UTF-8 filenames).

export interface ZipEntry {
  /** Relative path inside the archive: letters, digits, `_ . - /`, no `..`, not absolute. */
  name: string;
  data: string | Uint8Array;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes: Uint8Array) {
  let n = 0xffffffff;
  for (const b of bytes) n = crcTable[(n ^ b) & 255] ^ (n >>> 8);
  return (n ^ 0xffffffff) >>> 0;
}
function header(size: number) {
  const b = new Uint8Array(size);
  return { b, v: new DataView(b.buffer) };
}

/** Packs `files` into an uncompressed ZIP. Throws on unsafe names, oversized entries or too many files. */
export function studioZip(files: ZipEntry[]): Blob {
  const enc = new TextEncoder(), chunks: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    if (!/^[\w.\-/]+$/.test(file.name) || file.name.includes('..') || file.name.startsWith('/')) throw Error('Invalid export filename');
    const name = enc.encode(file.name), data = typeof file.data === 'string' ? enc.encode(file.data) : file.data;
    if (!(data instanceof Uint8Array) || data.length > 150 * 1024 * 1024) throw Error('Invalid export entry');
    const sum = crc32(data), h = header(30);
    h.v.setUint32(0, 0x04034b50, true);
    h.v.setUint16(4, 20, true);
    h.v.setUint16(6, 0x800, true);
    h.v.setUint32(14, sum, true);
    h.v.setUint32(18, data.length, true);
    h.v.setUint32(22, data.length, true);
    h.v.setUint16(26, name.length, true);
    chunks.push(h.b, name, data);
    const c = header(46);
    c.v.setUint32(0, 0x02014b50, true);
    c.v.setUint16(4, 20, true);
    c.v.setUint16(6, 20, true);
    c.v.setUint16(8, 0x800, true);
    c.v.setUint32(16, sum, true);
    c.v.setUint32(20, data.length, true);
    c.v.setUint32(24, data.length, true);
    c.v.setUint16(28, name.length, true);
    c.v.setUint32(42, offset, true);
    central.push(c.b, name);
    offset += 30 + name.length + data.length;
  }
  if (files.length > 65535) throw Error('Too many export files');
  const length = central.reduce((n, b) => n + b.length, 0), end = header(22);
  end.v.setUint32(0, 0x06054b50, true);
  end.v.setUint16(8, files.length, true);
  end.v.setUint16(10, files.length, true);
  end.v.setUint32(12, length, true);
  end.v.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, end.b] as BlobPart[], { type: 'application/zip' });
}

/** Starts a download. Must run inside the user's click (user activation). */
export function studioDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
