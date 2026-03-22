const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { URL } = require("node:url");

const ROOT_DIR = __dirname;
const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || path.join(ROOT_DIR, "storage"));
const DB_PATH = path.join(STORAGE_DIR, "db.json");
const INDEX_TEMPLATE_PATH = path.join(ROOT_DIR, "index.html");
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 4173);
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_AUDIT_ENTRIES = 200;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

const STORAGE_BUCKETS = {
  reports: "reports",
  "board-posts": "boardPosts",
  "audit-log": "auditLog"
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'"
};

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

let writeChain = Promise.resolve();

function createId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, label) {
  if (!isPlainObject(value)) {
    throw new HttpError(400, `${label} must be an object`);
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${label} must be a non-empty string`);
  }
  return value.trim();
}

function normalizeAuditEntry(entry) {
  requireObject(entry, "entry");

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
  requireObject(comment, "comment");

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
  requireObject(comment, "comment");

  return {
    id: typeof comment.id === "string" && comment.id ? comment.id : createId(),
    alias: typeof comment.alias === "string" ? comment.alias : "",
    body: requireString(comment.body, "comment.body"),
    createdAt: typeof comment.createdAt === "string" && comment.createdAt ? comment.createdAt : new Date().toISOString()
  };
}

function normalizeBoardPost(post) {
  requireObject(post, "post");

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
  requireObject(report, "report");

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
    checks: Array.isArray(report.checks) ? report.checks.filter((item) => typeof item === "string") : [],
    verificationScore: Number.isFinite(report.verificationScore) ? Number(report.verificationScore) : 0,
    reviewed: Boolean(report.reviewed),
    publishedAt: typeof report.publishedAt === "string" ? report.publishedAt : "",
    communityVotes: isPlainObject(report.communityVotes) ? report.communityVotes : {},
    reviewVotes: isPlainObject(report.reviewVotes) ? report.reviewVotes : {},
    communityComments: Array.isArray(report.communityComments) ? report.communityComments.map(normalizeReportComment) : [],
    createdAt: typeof report.createdAt === "string" && report.createdAt ? report.createdAt : new Date().toISOString()
  };
}

function normalizeDatabase(parsed) {
  return {
    reports: Array.isArray(parsed.reports) ? parsed.reports.map(normalizeReport) : [],
    boardPosts: Array.isArray(parsed.boardPosts) ? parsed.boardPosts.map(normalizeBoardPost) : [],
    auditLog: Array.isArray(parsed.auditLog) ? parsed.auditLog.map(normalizeAuditEntry) : [],
    meta: isPlainObject(parsed.meta) ? parsed.meta : {}
  };
}

async function ensureDatabase() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });

  try {
    await fs.access(DB_PATH);
  } catch (error) {
    const initial = {
      reports: [],
      boardPosts: [],
      auditLog: [],
      meta: {
        updatedAt: new Date().toISOString()
      }
    };
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readDatabase() {
  await ensureDatabase();
  const raw = await fs.readFile(DB_PATH, "utf8");
  return normalizeDatabase(JSON.parse(raw));
}

async function writeDatabase(db) {
  const nextDb = {
    reports: Array.isArray(db.reports) ? db.reports.map(normalizeReport) : [],
    boardPosts: Array.isArray(db.boardPosts) ? db.boardPosts.map(normalizeBoardPost) : [],
    auditLog: Array.isArray(db.auditLog) ? db.auditLog.map(normalizeAuditEntry).slice(0, MAX_AUDIT_ENTRIES) : [],
    meta: {
      updatedAt: new Date().toISOString()
    }
  };

  const tempPath = `${DB_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(nextDb, null, 2), "utf8");
  await fs.rename(tempPath, DB_PATH);
  return nextDb;
}

function updateDatabase(mutator) {
  const operation = writeChain.then(async () => {
    const current = await readDatabase();
    const mutated = (await mutator(current)) || current;
    return writeDatabase(mutated);
  });

  writeChain = operation.catch(() => undefined);
  return operation;
}

function getBootstrapPayload(db) {
  return {
    reports: db.reports,
    boardPosts: db.boardPosts,
    auditLog: db.auditLog,
    meta: db.meta,
    mode: "backend-api"
  };
}

function toInlineJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, statusCode, body) {
  res.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, "Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const raw = chunks.length ? Buffer.concat(chunks).toString("utf8") : "{}";
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new HttpError(400, "Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

function getStaticFilePath(pathname) {
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  return path.resolve(ROOT_DIR, relativePath);
}

async function renderIndexHtml() {
  const [template, db] = await Promise.all([fs.readFile(INDEX_TEMPLATE_PATH, "utf8"), readDatabase()]);
  const bootstrapPayload = getBootstrapPayload(db);
  const deploymentContext = {
    kind: "dynamic-node",
    renderedAt: new Date().toISOString(),
    mode: "server-rendered-html",
    port: PORT
  };

  return template.replace(
    "<!-- SERVER_BOOTSTRAP -->",
    `<script>window.__INITIAL_BOOTSTRAP__=${toInlineJson(bootstrapPayload)};window.__DEPLOYMENT_CONTEXT__=${toInlineJson(deploymentContext)};</script>`
  );
}

async function serveStaticFile(res, pathname) {
  if (pathname === "/" || pathname === "/index.html") {
    const html = await renderIndexHtml();
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      "Content-Length": Buffer.byteLength(html)
    });
    res.end(html);
    return;
  }

  const filePath = getStaticFilePath(pathname);

  if (!filePath.startsWith(ROOT_DIR)) {
    sendText(res, 403, "Forbidden\n");
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      sendText(res, 404, "Not Found\n");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const cacheControl = ext === ".html" ? "no-cache" : "public, max-age=300";
    const body = await fs.readFile(filePath);

    res.writeHead(200, {
      ...SECURITY_HEADERS,
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "Content-Length": body.length
    });
    res.end(body);
  } catch (error) {
    sendText(res, 404, "Not Found\n");
  }
}

function getReportById(db, reportId) {
  const index = db.reports.findIndex((report) => report.id === reportId);
  if (index === -1) {
    throw new HttpError(404, "Report not found");
  }
  return { index, report: db.reports[index] };
}

function getBoardPostById(db, postId) {
  const index = db.boardPosts.findIndex((post) => post.id === postId);
  if (index === -1) {
    throw new HttpError(404, "Board post not found");
  }
  return { index, post: db.boardPosts[index] };
}

async function handleStorageWrite(res, bucketName, req) {
  const body = await readJsonBody(req);
  if (!Array.isArray(body.data)) {
    throw new HttpError(400, "data must be an array");
  }

  const db = await updateDatabase((current) => {
    current[bucketName] = body.data;
    return current;
  });

  sendJson(res, 200, getBootstrapPayload(db));
}

async function handleStorageDelete(res, bucketName) {
  const db = await updateDatabase((current) => {
    current[bucketName] = [];
    return current;
  });

  sendJson(res, 200, getBootstrapPayload(db));
}

async function handleCreateReport(res, req) {
  const body = await readJsonBody(req);
  const report = normalizeReport(body.report || body);

  const db = await updateDatabase((current) => {
    if (current.reports.some((item) => item.id === report.id)) {
      throw new HttpError(409, "Report already exists");
    }
    current.reports.unshift(report);
    return current;
  });

  sendJson(res, 201, getBootstrapPayload(db));
}

async function handleClearReports(res) {
  const db = await updateDatabase((current) => {
    current.reports = [];
    return current;
  });

  sendJson(res, 200, getBootstrapPayload(db));
}

async function handleDeleteReport(res, reportId) {
  const db = await updateDatabase((current) => {
    const nextReports = current.reports.filter((report) => report.id !== reportId);
    if (nextReports.length === current.reports.length) {
      throw new HttpError(404, "Report not found");
    }
    current.reports = nextReports;
    return current;
  });

  sendJson(res, 200, getBootstrapPayload(db));
}

async function handleReportAction(res, req, reportId, action) {
  const body = await readJsonBody(req);
  const db = await updateDatabase((current) => {
    const { index, report } = getReportById(current, reportId);

    if (action === "publish") {
      current.reports[index] = {
        ...report,
        publishedAt: new Date().toISOString()
      };
      return current;
    }

    if (action === "unpublish") {
      current.reports[index] = {
        ...report,
        publishedAt: ""
      };
      return current;
    }

    if (action === "toggle-review") {
      current.reports[index] = {
        ...report,
        reviewed: !report.reviewed
      };
      return current;
    }

    if (action === "public-signal") {
      const verifierId = requireString(body.verifierId, "verifierId");
      const voteKey = requireString(body.voteKey, "voteKey");
      current.reports[index] = {
        ...report,
        communityVotes: {
          ...report.communityVotes,
          [verifierId]: voteKey
        }
      };
      return current;
    }

    if (action === "review-vote") {
      requireObject(body.session, "session");
      const sessionId = requireString(body.session.id, "session.id");
      const alias = requireString(body.session.alias, "session.alias");
      const role = requireString(body.session.role, "session.role");
      const voteKey = requireString(body.voteKey, "voteKey");
      const weight = Number.isFinite(body.weight) ? Number(body.weight) : 1;
      current.reports[index] = {
        ...report,
        reviewVotes: {
          ...report.reviewVotes,
          [sessionId]: {
            alias,
            role,
            voteKey,
            weight,
            votedAt: new Date().toISOString()
          }
        }
      };
      return current;
    }

    if (action === "comments") {
      const comment = normalizeReportComment(body.comment || body);
      current.reports[index] = {
        ...report,
        communityComments: [comment, ...report.communityComments]
      };
      return current;
    }

    throw new HttpError(404, "Unknown report action");
  });

  sendJson(res, 200, getBootstrapPayload(db));
}

async function handleCreateBoardPost(res, req) {
  const body = await readJsonBody(req);
  const post = normalizeBoardPost(body.post || body);

  const db = await updateDatabase((current) => {
    if (current.boardPosts.some((item) => item.id === post.id)) {
      throw new HttpError(409, "Board post already exists");
    }
    current.boardPosts.unshift(post);
    return current;
  });

  sendJson(res, 201, getBootstrapPayload(db));
}

async function handleBoardAction(res, req, postId, action) {
  const body = await readJsonBody(req);
  const db = await updateDatabase((current) => {
    const { index, post } = getBoardPostById(current, postId);

    if (action === "reactions") {
      const verifierId = requireString(body.verifierId, "verifierId");
      const reactionKey = requireString(body.reactionKey, "reactionKey");
      current.boardPosts[index] = {
        ...post,
        reactions: {
          ...post.reactions,
          [verifierId]: reactionKey
        }
      };
      return current;
    }

    if (action === "comments") {
      const comment = normalizeBoardComment(body.comment || body);
      current.boardPosts[index] = {
        ...post,
        comments: [comment, ...post.comments]
      };
      return current;
    }

    throw new HttpError(404, "Unknown board action");
  });

  sendJson(res, 200, getBootstrapPayload(db));
}

async function handleAppendAuditLog(res, req) {
  const body = await readJsonBody(req);
  const entry = normalizeAuditEntry(body.entry || body);

  const db = await updateDatabase((current) => {
    current.auditLog.unshift(entry);
    return current;
  });

  sendJson(res, 201, getBootstrapPayload(db));
}

async function handleResourceApi(req, res, segments) {
  if (segments[1] === "reports") {
    if (segments.length === 2 && req.method === "POST") {
      await handleCreateReport(res, req);
      return true;
    }

    if (segments.length === 2 && req.method === "DELETE") {
      await handleClearReports(res);
      return true;
    }

    if (segments.length === 3 && req.method === "DELETE") {
      await handleDeleteReport(res, decodeURIComponent(segments[2]));
      return true;
    }

    if (segments.length === 4 && req.method === "POST") {
      await handleReportAction(res, req, decodeURIComponent(segments[2]), segments[3]);
      return true;
    }

    return false;
  }

  if (segments[1] === "board-posts") {
    if (segments.length === 2 && req.method === "POST") {
      await handleCreateBoardPost(res, req);
      return true;
    }

    if (segments.length === 4 && req.method === "POST") {
      await handleBoardAction(res, req, decodeURIComponent(segments[2]), segments[3]);
      return true;
    }

    return false;
  }

  if (segments[1] === "audit-log") {
    if (segments.length === 2 && req.method === "POST") {
      await handleAppendAuditLog(res, req);
      return true;
    }

    return false;
  }

  return false;
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/health") {
    sendText(res, 200, "ok\n");
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/bootstrap") {
    const db = await readDatabase();
    sendJson(res, 200, getBootstrapPayload(db));
    return true;
  }

  if (url.pathname.startsWith("/api/storage/")) {
    const bucketKey = url.pathname.replace("/api/storage/", "");
    const bucketName = STORAGE_BUCKETS[bucketKey];

    if (!bucketName) {
      throw new HttpError(404, "Unknown storage bucket");
    }

    if (req.method === "PUT") {
      await handleStorageWrite(res, bucketName, req);
      return true;
    }

    if (req.method === "DELETE") {
      await handleStorageDelete(res, bucketName);
      return true;
    }

    throw new HttpError(405, "Method not allowed");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] === "api" && segments.length >= 2) {
    const handled = await handleResourceApi(req, res, segments);
    if (handled) {
      return true;
    }
    throw new HttpError(404, "Unknown API route");
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    const handled = await handleApi(req, res, url);
    if (handled) {
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      throw new HttpError(405, "Method not allowed");
    }

    await serveStaticFile(res, url.pathname);
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    sendJson(res, statusCode, { error: error.message || "Internal server error" });
  }
});

server.listen(PORT, HOST, async () => {
  await ensureDatabase();
  console.log(`Backend server listening on http://${HOST}:${PORT}`);
});
