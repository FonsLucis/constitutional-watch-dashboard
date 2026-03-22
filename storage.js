const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { Pool } = require("pg");

const MAX_AUDIT_ENTRIES = 200;

function createId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }

  return value.trim();
}

function normalizeAlias(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
}

function normalizeAuditEntry(entry) {
  if (!isPlainObject(entry)) {
    throw new Error("entry must be an object");
  }

  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : createId(),
    action: requireString(entry.action, "entry.action"),
    detail: requireString(entry.detail, "entry.detail"),
    reportId: typeof entry.reportId === "string" ? entry.reportId : "",
    actorAlias: typeof entry.actorAlias === "string" && entry.actorAlias ? entry.actorAlias : "anonymous",
    actorRole: typeof entry.actorRole === "string" && entry.actorRole ? entry.actorRole : "public",
    createdAt: typeof entry.createdAt === "string" && entry.createdAt ? entry.createdAt : new Date().toISOString()
  };
}

function normalizeReportComment(comment) {
  if (!isPlainObject(comment)) {
    throw new Error("comment must be an object");
  }

  return {
    id: typeof comment.id === "string" && comment.id ? comment.id : createId(),
    alias: typeof comment.alias === "string" ? comment.alias : "",
    note: requireString(comment.note, "comment.note"),
    voteKey: typeof comment.voteKey === "string" ? comment.voteKey : "",
    authorRole: typeof comment.authorRole === "string" && comment.authorRole ? comment.authorRole : "public",
    trusted: Boolean(comment.trusted),
    createdAt: typeof comment.createdAt === "string" && comment.createdAt ? comment.createdAt : new Date().toISOString()
  };
}

function normalizeBoardComment(comment) {
  if (!isPlainObject(comment)) {
    throw new Error("comment must be an object");
  }

  return {
    id: typeof comment.id === "string" && comment.id ? comment.id : createId(),
    alias: typeof comment.alias === "string" ? comment.alias : "",
    body: requireString(comment.body, "comment.body"),
    createdAt: typeof comment.createdAt === "string" && comment.createdAt ? comment.createdAt : new Date().toISOString()
  };
}

function normalizeBoardPost(post) {
  if (!isPlainObject(post)) {
    throw new Error("post must be an object");
  }

  return {
    id: requireString(post.id, "post.id"),
    category: typeof post.category === "string" && post.category ? post.category : "자유 토론",
    alias: typeof post.alias === "string" ? post.alias : "",
    title: requireString(post.title, "post.title"),
    tag: typeof post.tag === "string" ? post.tag : "",
    body: requireString(post.body, "post.body"),
    reactions: isPlainObject(post.reactions) ? post.reactions : {},
    comments: Array.isArray(post.comments) ? post.comments.map(normalizeBoardComment) : [],
    createdAt: typeof post.createdAt === "string" && post.createdAt ? post.createdAt : new Date().toISOString()
  };
}

function normalizeReport(report) {
  if (!isPlainObject(report)) {
    throw new Error("report must be an object");
  }

  return {
    id: requireString(report.id, "report.id"),
    category: typeof report.category === "string" && report.category ? report.category : "기타",
    exposure: typeof report.exposure === "string" && report.exposure ? report.exposure : "익명 공개 가능",
    title: requireString(report.title, "report.title"),
    observedAt: requireString(report.observedAt, "report.observedAt"),
    location: typeof report.location === "string" ? report.location : "",
    sourceUrl: typeof report.sourceUrl === "string" ? report.sourceUrl : "",
    mirrorUrl: typeof report.mirrorUrl === "string" ? report.mirrorUrl : "",
    alias: typeof report.alias === "string" ? report.alias : "",
    fileNote: typeof report.fileNote === "string" ? report.fileNote : "",
    summary: requireString(report.summary, "report.summary"),
    evidenceNote: typeof report.evidenceNote === "string" ? report.evidenceNote : "",
    checks: normalizeStringArray(report.checks),
    verificationScore: Number.isFinite(report.verificationScore) ? Number(report.verificationScore) : 0,
    reviewed: Boolean(report.reviewed),
    publishedAt: typeof report.publishedAt === "string" ? report.publishedAt : "",
    communityVotes: isPlainObject(report.communityVotes) ? report.communityVotes : {},
    reviewVotes: isPlainObject(report.reviewVotes) ? report.reviewVotes : {},
    communityComments: Array.isArray(report.communityComments)
      ? report.communityComments.map(normalizeReportComment)
      : [],
    createdAt: typeof report.createdAt === "string" && report.createdAt ? report.createdAt : new Date().toISOString()
  };
}

function normalizeUser(user) {
  if (!isPlainObject(user)) {
    throw new Error("user must be an object");
  }

  const alias = requireString(user.alias, "user.alias");

  return {
    id: typeof user.id === "string" && user.id ? user.id : createId(),
    alias,
    aliasKey: typeof user.aliasKey === "string" && user.aliasKey ? user.aliasKey : normalizeAlias(alias),
    displayName: typeof user.displayName === "string" && user.displayName ? user.displayName : alias,
    role: requireString(user.role, "user.role"),
    createdAt: typeof user.createdAt === "string" && user.createdAt ? user.createdAt : new Date().toISOString()
  };
}

function normalizeCredential(credential) {
  if (!isPlainObject(credential)) {
    throw new Error("credential must be an object");
  }

  return {
    id: typeof credential.id === "string" && credential.id ? credential.id : createId(),
    userId: requireString(credential.userId, "credential.userId"),
    credentialId: requireString(credential.credentialId, "credential.credentialId"),
    publicKey: requireString(credential.publicKey, "credential.publicKey"),
    counter: Number.isFinite(credential.counter) ? Number(credential.counter) : 0,
    transports: normalizeStringArray(credential.transports),
    deviceType: typeof credential.deviceType === "string" && credential.deviceType ? credential.deviceType : "singleDevice",
    backedUp: Boolean(credential.backedUp),
    createdAt: typeof credential.createdAt === "string" && credential.createdAt ? credential.createdAt : new Date().toISOString(),
    lastUsedAt: typeof credential.lastUsedAt === "string" ? credential.lastUsedAt : ""
  };
}

function normalizeSession(session) {
  if (!isPlainObject(session)) {
    throw new Error("session must be an object");
  }

  return {
    id: requireString(session.id, "session.id"),
    userId: requireString(session.userId, "session.userId"),
    alias: requireString(session.alias, "session.alias"),
    role: requireString(session.role, "session.role"),
    createdAt: typeof session.createdAt === "string" && session.createdAt ? session.createdAt : new Date().toISOString(),
    expiresAt: requireString(session.expiresAt, "session.expiresAt")
  };
}

function normalizeChallenge(challenge) {
  if (!isPlainObject(challenge)) {
    throw new Error("challenge must be an object");
  }

  const alias = requireString(challenge.alias, "challenge.alias");

  return {
    id: typeof challenge.id === "string" && challenge.id ? challenge.id : createId(),
    kind: requireString(challenge.kind, "challenge.kind"),
    alias,
    aliasKey: typeof challenge.aliasKey === "string" && challenge.aliasKey ? challenge.aliasKey : normalizeAlias(alias),
    role: typeof challenge.role === "string" ? challenge.role : "",
    userId: typeof challenge.userId === "string" ? challenge.userId : "",
    challenge: requireString(challenge.challenge, "challenge.challenge"),
    rpId: requireString(challenge.rpId, "challenge.rpId"),
    origins: normalizeStringArray(challenge.origins),
    createdAt: typeof challenge.createdAt === "string" && challenge.createdAt ? challenge.createdAt : new Date().toISOString(),
    expiresAt: requireString(challenge.expiresAt, "challenge.expiresAt")
  };
}

function normalizeAuthState(auth) {
  const nextAuth = isPlainObject(auth) ? auth : {};
  const now = Date.now();

  const sessions = Array.isArray(nextAuth.sessions)
    ? nextAuth.sessions
        .map(normalizeSession)
        .filter((session) => Date.parse(session.expiresAt) > now)
    : [];

  const challenges = Array.isArray(nextAuth.challenges)
    ? nextAuth.challenges
        .map(normalizeChallenge)
        .filter((challenge) => Date.parse(challenge.expiresAt) > now)
    : [];

  return {
    users: Array.isArray(nextAuth.users) ? nextAuth.users.map(normalizeUser) : [],
    credentials: Array.isArray(nextAuth.credentials) ? nextAuth.credentials.map(normalizeCredential) : [],
    sessions,
    challenges
  };
}

function normalizeDatabase(parsed) {
  const next = isPlainObject(parsed) ? parsed : {};

  return {
    reports: Array.isArray(next.reports) ? next.reports.map(normalizeReport) : [],
    boardPosts: Array.isArray(next.boardPosts) ? next.boardPosts.map(normalizeBoardPost) : [],
    auditLog: Array.isArray(next.auditLog) ? next.auditLog.map(normalizeAuditEntry).slice(0, MAX_AUDIT_ENTRIES) : [],
    auth: normalizeAuthState(next.auth),
    meta: {
      ...(isPlainObject(next.meta) ? next.meta : {}),
      updatedAt:
        next.meta && typeof next.meta.updatedAt === "string" && next.meta.updatedAt
          ? next.meta.updatedAt
          : new Date().toISOString()
    }
  };
}

function createInitialState() {
  return normalizeDatabase({
    reports: [],
    boardPosts: [],
    auditLog: [],
    auth: {
      users: [],
      credentials: [],
      sessions: [],
      challenges: []
    },
    meta: {
      updatedAt: new Date().toISOString()
    }
  });
}

function finalizeNextState(state) {
  const normalized = normalizeDatabase(state);
  normalized.meta.updatedAt = new Date().toISOString();
  return normalized;
}

class FileStateStore {
  constructor({ storageDir, dbPath }) {
    this.kind = "file";
    this.storageDir = storageDir;
    this.dbPath = dbPath;
    this.writeChain = Promise.resolve();
  }

  async init() {
    await fs.mkdir(this.storageDir, { recursive: true });

    try {
      await fs.access(this.dbPath);
    } catch (error) {
      const initial = createInitialState();
      await fs.writeFile(this.dbPath, JSON.stringify(initial, null, 2), "utf8");
    }
  }

  async read() {
    await this.init();
    const raw = await fs.readFile(this.dbPath, "utf8");
    return normalizeDatabase(JSON.parse(raw));
  }

  async write(state) {
    const next = finalizeNextState(state);
    const tempPath = `${this.dbPath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(next, null, 2), "utf8");
    await fs.rename(tempPath, this.dbPath);
    return next;
  }

  async mutate(mutator) {
    const operation = this.writeChain.then(async () => {
      const current = await this.read();
      const mutated = (await mutator(current)) || current;
      return this.write(mutated);
    });

    this.writeChain = operation.catch(() => undefined);
    return operation;
  }

  async close() {
    return undefined;
  }
}

class PostgresStateStore {
  constructor({ connectionString, ssl }) {
    this.kind = "postgres";
    this.pool = new Pool({
      connectionString,
      ...(ssl ? { ssl } : {})
    });
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const initial = JSON.stringify(createInitialState());
    await this.pool.query(
      `
        INSERT INTO app_state (id, payload)
        VALUES (1, $1::jsonb)
        ON CONFLICT (id) DO NOTHING
      `,
      [initial]
    );
  }

  async read() {
    await this.init();
    const result = await this.pool.query("SELECT payload FROM app_state WHERE id = 1");
    const row = result.rows[0];
    if (!row) {
      return createInitialState();
    }

    const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
    return normalizeDatabase(payload);
  }

  async mutate(mutator) {
    await this.init();
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT payload FROM app_state WHERE id = 1 FOR UPDATE");
      const row = result.rows[0];
      const currentPayload = row ? (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload) : createInitialState();
      const current = normalizeDatabase(currentPayload);
      const mutated = (await mutator(current)) || current;
      const next = finalizeNextState(mutated);

      await client.query(
        `
          INSERT INTO app_state (id, payload, updated_at)
          VALUES (1, $1::jsonb, NOW())
          ON CONFLICT (id)
          DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
        `,
        [JSON.stringify(next)]
      );

      await client.query("COMMIT");
      return next;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

function resolvePgSsl() {
  if (process.env.DATABASE_SSL === "true" || process.env.PGSSLMODE === "require") {
    return { rejectUnauthorized: false };
  }

  return undefined;
}

function createStateStore({ storageDir, dbPath, databaseUrl }) {
  if (databaseUrl) {
    return new PostgresStateStore({
      connectionString: databaseUrl,
      ssl: resolvePgSsl()
    });
  }

  return new FileStateStore({ storageDir, dbPath });
}

module.exports = {
  MAX_AUDIT_ENTRIES,
  createId,
  createInitialState,
  createStateStore,
  isPlainObject,
  normalizeAlias,
  normalizeAuditEntry,
  normalizeBoardComment,
  normalizeBoardPost,
  normalizeCredential,
  normalizeChallenge,
  normalizeDatabase,
  normalizeReport,
  normalizeReportComment,
  normalizeSession,
  normalizeUser,
  requireString
};
