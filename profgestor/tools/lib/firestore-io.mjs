// Backup e restauração fiéis do Firestore (Admin SDK), preservando tipos e subcoleções.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Timestamp, GeoPoint, DocumentReference } from 'firebase-admin/firestore';

export function encode(value) {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Timestamp) return { __type: 'timestamp', s: value.seconds, n: value.nanoseconds };
  if (value instanceof GeoPoint) return { __type: 'geopoint', lat: value.latitude, lng: value.longitude };
  if (value instanceof DocumentReference) return { __type: 'ref', path: value.path };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { __type: 'bytes', b64: Buffer.from(value).toString('base64') };
  if (Array.isArray(value)) return value.map(encode);
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]));
}

export function decode(value, db) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => decode(v, db));
  switch (value.__type) {
    case 'timestamp': return new Timestamp(value.s, value.n);
    case 'geopoint': return new GeoPoint(value.lat, value.lng);
    case 'ref': return db.doc(value.path);
    case 'bytes': return Buffer.from(value.b64, 'base64');
    default: return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v, db)]));
  }
}

// Lê todos os documentos (todas as coleções raiz e subcoleções), em ordem determinística.
export async function exportAll(db) {
  const out = [];
  async function walk(collections) {
    for (const col of collections.sort((a, b) => a.id.localeCompare(b.id))) {
      const snap = await col.get();
      for (const d of snap.docs.sort((a, b) => a.id.localeCompare(b.id))) {
        out.push({ path: d.ref.path, data: encode(d.data()) });
        await walk(await d.ref.listCollections());
      }
    }
  }
  await walk(await db.listCollections());
  return out;
}

export function digest(records) {
  return createHash('sha256').update(JSON.stringify(records)).digest('hex');
}

export function countsByCollection(records) {
  const counts = {};
  for (const r of records) {
    const parts = r.path.split('/');
    const key = parts.length > 2 ? parts.filter((_, i) => i % 2 === 0).join('/*/') : parts[0];
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export async function writeBackup(dir, records, meta = {}) {
  await mkdir(dir, { recursive: true });
  const body = records.map((r) => JSON.stringify(r)).join('\n') + (records.length ? '\n' : '');
  await writeFile(join(dir, 'documents.ndjson'), body, { mode: 0o600 });
  const manifest = {
    format: 'profgestor-firestore-backup/1',
    createdAt: new Date().toISOString(),
    documents: records.length,
    counts: countsByCollection(records),
    sha256: digest(records),
    ...meta,
  };
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 });
  return manifest;
}

export async function readBackup(dir) {
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  const raw = await readFile(join(dir, 'documents.ndjson'), 'utf8');
  const records = raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  if (records.length !== manifest.documents || digest(records) !== manifest.sha256) {
    throw new Error('Backup corrompido: contagem ou hash não confere com o manifesto.');
  }
  return { manifest, records };
}

export async function commitInChunks(db, ops, size = 400) {
  for (let i = 0; i < ops.length; i += size) {
    const batch = db.batch();
    for (const op of ops.slice(i, i + size)) {
      if (op.type === 'set') batch.set(db.doc(op.path), op.data);
      else if (op.type === 'update') batch.update(db.doc(op.path), op.data);
      else if (op.type === 'delete') batch.delete(db.doc(op.path));
    }
    await batch.commit();
  }
}
