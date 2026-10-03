/**
 * A minimal ZIP writer, and a reader to check its own work.
 *
 * WHY THIS IS HAND-WRITTEN
 *
 * A .docx is a ZIP of XML, so producing editable Word documents needs a zip
 * writer. There is not one available: `npm install` cannot run in this project
 * because sixty of the hundred and thirty dependency entries in package.json
 * are malformed (`"@emotion/react@11.14.0": "npm:@emotion/react@11.14.0"`, an
 * artefact of the original Figma export), and npm refuses the whole file. That
 * is somebody else's blast radius to fix, not something to repair in passing
 * while writing an ebook.
 *
 * Node's `zlib` is built in, and the ZIP container is a documented format of
 * fixed-width headers. So this is about eighty lines rather than a dependency,
 * and it removes the question entirely.
 *
 * WHY THERE IS A READER TOO
 *
 * Because there is no Word on this machine to open the result in. A zip with
 * the central directory offset off by one byte is still a file, still the right
 * size, and completely unopenable — and that failure would reach a buyer. The
 * reader parses the archive back, inflates every entry and checks each CRC
 * against the stored one, which is a real round trip rather than a hope.
 */
import { deflateRawSync, inflateRawSync } from 'node:zlib';

// ── CRC32 ───────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

export function crc32(buf) {
  let c = 0 ^ -1;
  for (let i = 0; i < buf.length; i += 1) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xFF];
  return (c ^ -1) >>> 0;
}

/**
 * MS-DOS date and time, which is what ZIP stores.
 *
 * Fixed rather than "now" by default: two builds of the same unchanged document
 * should produce identical bytes, so a diff of the output means the content
 * actually changed. A timestamp would make every rebuild look like a change.
 */
function dosDateTime(date = new Date(2026, 0, 1, 0, 0, 0)) {
  const time = ((date.getHours() & 0x1F) << 11) | ((date.getMinutes() & 0x3F) << 5) | ((date.getSeconds() / 2) & 0x1F);
  const day = (((date.getFullYear() - 1980) & 0x7F) << 9) | (((date.getMonth() + 1) & 0x0F) << 5) | (date.getDate() & 0x1F);
  return { time, day };
}

/**
 * Build a ZIP archive.
 *
 * `entries` is [{ name, data }] where data is a Buffer or a string. Order is
 * preserved, which matters for Office formats: `[Content_Types].xml` is
 * expected first, and some readers are less forgiving about it than others.
 */
export function zip(entries) {
  const { time, day } = dosDateTime();
  const locals = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const raw = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data), 'utf8');
    const compressed = deflateRawSync(raw, { level: 9 });
    // Only use deflate when it actually helps; tiny XML files can grow.
    const useDeflate = compressed.length < raw.length;
    const body = useDeflate ? compressed : raw;
    const method = useDeflate ? 8 : 0;
    const sum = crc32(raw);

    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);   // local file header signature
    local.writeUInt16LE(20, 4);           // version needed
    local.writeUInt16LE(0x0800, 6);       // flags: UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(sum, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);           // no extra field
    name.copy(local, 30);

    locals.push(local, body);

    const dir = Buffer.alloc(46 + name.length);
    dir.writeUInt32LE(0x02014b50, 0);     // central directory signature
    dir.writeUInt16LE(20, 4);             // version made by
    dir.writeUInt16LE(20, 6);             // version needed
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(method, 10);
    dir.writeUInt16LE(time, 12);
    dir.writeUInt16LE(day, 14);
    dir.writeUInt32LE(sum, 16);
    dir.writeUInt32LE(body.length, 20);
    dir.writeUInt32LE(raw.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt16LE(0, 30);             // extra
    dir.writeUInt16LE(0, 32);             // comment
    dir.writeUInt16LE(0, 34);             // disk number
    dir.writeUInt16LE(0, 36);             // internal attrs
    dir.writeUInt32LE(0, 38);             // external attrs
    dir.writeUInt32LE(offset, 42);        // offset of local header
    name.copy(dir, 46);
    central.push(dir);

    offset += local.length + body.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);       // end of central directory
  end.writeUInt16LE(0, 4);                // this disk
  end.writeUInt16LE(0, 6);                // disk with central dir
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);          // central dir offset
  end.writeUInt16LE(0, 20);               // comment length

  return Buffer.concat([...locals, centralBuf, end]);
}

/**
 * Read an archive back, inflating every entry and verifying its CRC.
 *
 * Reads through the CENTRAL DIRECTORY rather than scanning for local headers,
 * because that is what a real reader does — and an archive whose central
 * directory is wrong is exactly the kind that opens fine in one tool and not in
 * Word. Throws on any mismatch, so the verifier does not have to interpret.
 */
export function unzip(buffer) {
  const eocdSig = 0x06054b50;
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === eocdSig) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('No end-of-central-directory record: this is not a readable zip.');

  const count = buffer.readUInt16LE(eocd + 10);
  const dirSize = buffer.readUInt32LE(eocd + 12);
  const dirOffset = buffer.readUInt32LE(eocd + 16);
  if (dirOffset + dirSize > buffer.length) {
    throw new Error('The central directory points past the end of the file.');
  }

  const files = [];
  let p = dirOffset;
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) {
      throw new Error(`Central directory entry ${i} has the wrong signature.`);
    }
    const method = buffer.readUInt16LE(p + 10);
    const storedCrc = buffer.readUInt32LE(p + 16);
    const compSize = buffer.readUInt32LE(p + 20);
    const rawSize = buffer.readUInt32LE(p + 24);
    const nameLen = buffer.readUInt16LE(p + 28);
    const extraLen = buffer.readUInt16LE(p + 30);
    const commentLen = buffer.readUInt16LE(p + 32);
    const localOffset = buffer.readUInt32LE(p + 42);
    const name = buffer.subarray(p + 46, p + 46 + nameLen).toString('utf8');

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`"${name}" does not have a local file header where the directory says it does.`);
    }
    const localNameLen = buffer.readUInt16LE(localOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const body = buffer.subarray(dataStart, dataStart + compSize);
    const data = method === 8 ? inflateRawSync(body) : Buffer.from(body);

    if (data.length !== rawSize) {
      throw new Error(`"${name}" inflated to ${data.length} bytes, but the directory says ${rawSize}.`);
    }
    const actual = crc32(data);
    if (actual !== storedCrc) {
      throw new Error(`"${name}" fails its checksum — the archive is corrupt.`);
    }

    files.push({ name, data });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}
