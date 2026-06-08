/**
 * Transparent content encryption for sensitive free-text fields.
 *
 * Applied as a Prisma Client extension so encryption/decryption happens in ONE
 * place and every read/write path is covered automatically (the fields are read
 * in ~10+ routes/utils — doing it per-call would be error-prone).
 *
 * SAFETY:
 *  - OFF by default. Only activates when CONTENT_ENCRYPTION === 'true' AND a
 *    valid ENCRYPTION_KEY is configured. With the flag off, the base client is
 *    returned unchanged (identical to previous behavior — zero risk).
 *  - Decryption is backward-compatible: rows written before activation are
 *    plaintext and pass through untouched (see utils/encryption.decrypt).
 *  - Only known string fields on specific models are transformed.
 *
 * TO ACTIVATE IN PRODUCTION (do this attended, ideally test on staging first):
 *  1. Set ENCRYPTION_KEY (64-char hex) on the backend host.
 *  2. Set CONTENT_ENCRYPTION=true.
 * Existing plaintext rows keep working; new writes get encrypted.
 */
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

// model (Prisma camelCase delegate) -> sensitive string fields
const ENCRYPTED_FIELDS = {
  dailyLog: ['journalEntry'],
  gratitudeEntry: ['text'],
  realTalk: ['issue', 'feeling', 'need'],
};

function encryptValue(v) {
  return typeof v === 'string' && v.length > 0 ? encrypt(v) : v;
}
function decryptValue(v) {
  return typeof v === 'string' && v.length > 0 ? decrypt(v) : v;
}

function encryptData(data, fields) {
  if (!data || typeof data !== 'object') return data;
  // createMany passes { data: [...] }
  if (Array.isArray(data)) return data.map((d) => encryptData(d, fields));
  const out = { ...data };
  for (const f of fields) {
    if (f in out) out[f] = encryptValue(out[f]);
  }
  return out;
}

function decryptRecord(record, fields) {
  if (!record || typeof record !== 'object') return record;
  for (const f of fields) {
    if (f in record) record[f] = decryptValue(record[f]);
  }
  return record;
}

function decryptResult(result, fields) {
  if (!result) return result;
  if (Array.isArray(result)) return result.map((r) => decryptRecord(r, fields));
  return decryptRecord(result, fields);
}

/**
 * Returns a Prisma client with content encryption applied, or the base client
 * unchanged when encryption is disabled.
 */
function withContentEncryption(prisma) {
  const enabled =
    process.env.CONTENT_ENCRYPTION === 'true' && !!process.env.ENCRYPTION_KEY;
  if (!enabled) return prisma;

  logger.info('Content encryption ENABLED for sensitive fields', {
    models: Object.keys(ENCRYPTED_FIELDS),
  });

  const query = {};
  for (const [model, fields] of Object.entries(ENCRYPTED_FIELDS)) {
    query[model] = {
      async create({ args, query: run }) {
        if (args.data) args.data = encryptData(args.data, fields);
        return decryptResult(await run(args), fields);
      },
      async update({ args, query: run }) {
        if (args.data) args.data = encryptData(args.data, fields);
        return decryptResult(await run(args), fields);
      },
      async upsert({ args, query: run }) {
        if (args.create) args.create = encryptData(args.create, fields);
        if (args.update) args.update = encryptData(args.update, fields);
        return decryptResult(await run(args), fields);
      },
      async createMany({ args, query: run }) {
        if (args.data) args.data = encryptData(args.data, fields);
        return run(args); // returns a count, nothing to decrypt
      },
      async updateMany({ args, query: run }) {
        if (args.data) args.data = encryptData(args.data, fields);
        return run(args);
      },
      async findUnique({ args, query: run }) {
        return decryptResult(await run(args), fields);
      },
      async findFirst({ args, query: run }) {
        return decryptResult(await run(args), fields);
      },
      async findMany({ args, query: run }) {
        return decryptResult(await run(args), fields);
      },
    };
  }

  return prisma.$extends({ query });
}

module.exports = {
  withContentEncryption,
  // exported for unit tests
  _internals: { encryptData, decryptResult, ENCRYPTED_FIELDS },
};
