const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { URL } = require("node:url");
const {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} = require("@simplewebauthn/server");
const { isoBase64URL } = require("@simplewebauthn/server/helpers");
const {
  createId,
  createStateStore,
  isPlainObject,
  normalizeAlias,
  normalizeAuditEntry,
  normalizeBoardComment,
  normalizeBoardPost,
  normalizeChallenge,
  normalizeCredential,
  normalizeReport,
  normalizeReportComment,
  normalizeUser,
  requireString
} = require("./storage");

const ROOT_DIR = __dirname;
const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || path.join(ROOT_DIR, "storage"));
const DB_PATH = path.join(STORAGE_DIR, "db.json");
const INDEX_TEMPLATE_PATH = path.join(ROOT_DIR, "index.html");
const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT || 4173);
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const SESSION_COOKIE_NAME = "constitutional_watch_session";
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_HOURS || 168) * 60 * 60 * 1000;
const CHALLENGE_TTL_MS = Number(process.env.AUTH_CHALLENGE_TTL_MINUTES || 10) * 60 * 1000;
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";
const WEBAUTHN_RP_NAME = process.env.WEBAUTHN_RP_NAME || "RightOfResist";
const DATABASE_URL = process.env.DATABASE_URL || "";

const store = createStateStore({
  storageDir: STORAGE_DIR,
  dbPath: DB_PATH,
  databaseUrl: DATABASE_URL
});

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), publickey-credentials-get=(self)",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'"
};

const ROLE_LABELS = {
  reviewer: "검토자",
  operator: "운영자"
};

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function asBadRequest(factory) {
  try {
    return factory();
  } catch (error) {
    throw new HttpError(400, error.message || "Invalid request");
  }
}

function parseDelimitedValues(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getInviteCodes(role) {
  const envKey = role === "operator" ? "OPERATOR_INVITE_CODES" : "REVIEWER_INVITE_CODES";
  const configured = parseDelimitedValues(process.env[envKey]);

  if (configured.length) {
    return configured;
  }

  if (!IS_PRODUCTION) {
    return role === "operator" ? ["local-operator-passkey"] : ["local-reviewer-passkey"];
  }

  return [];
}

function isPlainArrayOfStrings(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function requireObject(value, label) {
  if (!isPlainObject(value)) {
    throw new HttpError(400, `${label} must be an object`);
  }
}

function parseCookies(header) {
  return String(header || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((result, part) => {
      const index = part.indexOf("=");
      if (index === -1) {
        return result;
      }

      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      result[key] = decodeURIComponent(value);
      return result;
    }, {});
}

function signValue(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function encodeSignedCookieValue(value) {
  return `${value}.${signValue(value)}`;
}

function decodeSignedCookieValue(value) {
  if (typeof value !== "string") {
    return "";
  }

  const lastDot = value.lastIndexOf(".");
  if (lastDot === -1) {
    return "";
  }

  const rawValue = value.slice(0, lastDot);
  const rawSignature = value.slice(lastDot + 1);
  const expectedSignature = signValue(rawValue);

  try {
    const left = Buffer.from(rawSignature);
    const right = Buffer.from(expectedSignature);
    if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
      return "";
    }
  } catch (error) {
    return "";
  }

  return rawValue;
}

function appendSetCookie(res, cookieValue) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", cookieValue);
    return;
  }

  if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, cookieValue]);
    return;
  }

  res.setHeader("Set-Cookie", [existing, cookieValue]);
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || "/"}`);
  parts.push(`SameSite=${options.sameSite || "Lax"}`);

  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function setSessionCookie(res, sessionId) {
  appendSetCookie(
    res,
    serializeCookie(SESSION_COOKIE_NAME, encodeSignedCookieValue(sessionId), {
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
      secure: IS_PRODUCTION
    })
  );
}

function clearSessionCookie(res) {
  appendSetCookie(
    res,
    serializeCookie(SESSION_COOKIE_NAME, "", {
      maxAge: 0,
      secure: IS_PRODUCTION
    })
  );
}

function getRequestProtocol(req) {
  const forwarded = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  if (forwarded) {
    return forwarded;
  }

  return IS_PRODUCTION ? "https" : "http";
}

function getRequestHost(req) {
  return String(req.headers["x-forwarded-host"] || req.headers.host || "localhost").split(",")[0].trim();
}

function getRequestHostname(req) {
  return getRequestHost(req).replace(/:\d+$/, "");
}

function getRequestOrigin(req) {
  return `${getRequestProtocol(req)}://${getRequestHost(req)}`;
}

function resolveOrigins(req) {
  const configured = parseDelimitedValues(process.env.WEBAUTHN_ORIGINS).map((origin) => origin.replace(/\/+$/, ""));
  if (configured.length) {
    return configured;
  }

  return [getRequestOrigin(req)];
}

function resolveRpId(req) {
  return process.env.WEBAUTHN_RP_ID || getRequestHostname(req);
}

function getStaticFilePath(pathname) {
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  return path.resolve(ROOT_DIR, relativePath);
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

function validateRole(role) {
  if (role !== "reviewer" && role !== "operator") {
    throw new HttpError(400, "Invalid role");
  }

  return role;
}

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role;
}

function sanitizeSession(session) {
  if (!session) {
    return null;
  }

  return {
    id: session.id,
    alias: session.alias,
    role: session.role,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt
  };
}

function findUserByAlias(db, alias) {
  const aliasKey = normalizeAlias(alias);
  return db.auth.users.find((user) => user.aliasKey === aliasKey) || null;
}

function findCredentialsForUser(db, userId) {
  return db.auth.credentials.filter((credential) => credential.userId === userId);
}

function findCredentialById(db, credentialId) {
  return db.auth.credentials.find((credential) => credential.credentialId === credentialId) || null;
}

function findSessionById(db, sessionId) {
  if (!sessionId) {
    return null;
  }

  const now = Date.now();
  return (
    db.auth.sessions.find((session) => session.id === sessionId && Date.parse(session.expiresAt) > now) || null
  );
}

function findChallenge(db, kind, alias, role) {
  const aliasKey = normalizeAlias(alias);
  return (
    db.auth.challenges
      .filter((challenge) => {
        const roleMatch = role ? challenge.role === role : true;
        return challenge.kind === kind && challenge.aliasKey === aliasKey && roleMatch;
      })
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0] || null
  );
}

function appendAuditEntry(db, entry) {
  db.auditLog.unshift(normalizeAuditEntry(entry));
  db.auditLog = db.auditLog.slice(0, 200);
}

function createActor(session, fallbackAlias) {
  if (session) {
    return {
      actorAlias: session.alias,
      actorRole: session.role
    };
  }

  return {
    actorAlias: fallbackAlias || "anonymous",
    actorRole: "public"
  };
}

function createSessionRecord(user) {
  return {
    id: createId(),
    userId: user.id,
    alias: user.alias,
    role: user.role,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString()
  };
}

function createChallengeRecord({ kind, alias, role, userId, challenge, rpId, origins }) {
  return normalizeChallenge({
    id: createId(),
    kind,
    alias,
    role,
    userId,
    challenge,
    rpId,
    origins,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString()
  });
}

function buildAuthPayload(db, session) {
  const counts = db.auth.users.reduce(
    (result, user) => {
      if (user.role === "reviewer") {
        result.reviewer += 1;
      } else if (user.role === "operator") {
        result.operator += 1;
      }
      return result;
    },
    { reviewer: 0, operator: 0 }
  );

  return {
    backend: store.kind,
    mode: "passkey",
    secureContextRequired: true,
    counts,
    registration: {
      reviewer: {
        enabled: getInviteCodes("reviewer").length > 0,
        inviteRequired: true
      },
      operator: {
        enabled: getInviteCodes("operator").length > 0,
        inviteRequired: true
      }
    },
    session: sanitizeSession(session)
  };
}

function getBootstrapPayload(db, session) {
  return {
    reports: db.reports,
    boardPosts: db.boardPosts,
    auditLog: db.auditLog,
    meta: db.meta,
    mode: store.kind === "postgres" ? "backend-postgres" : "backend-file",
    auth: buildAuthPayload(db, session)
  };
}

async function getRequestSession(req, dbOverride) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = decodeSignedCookieValue(cookies[SESSION_COOKIE_NAME] || "");
  if (!sessionId) {
    return null;
  }

  const db = dbOverride || (await store.read());
  return findSessionById(db, sessionId);
}

async function requireRole(req, allowedRoles) {
  const db = await store.read();
  const session = await getRequestSession(req, db);

  if (!session) {
    throw new HttpError(401, "Login required");
  }

  if (!allowedRoles.includes(session.role)) {
    throw new HttpError(403, "Insufficient privileges");
  }

  return { db, session };
}

function assertInviteCode(role, inviteCode) {
  const codes = getInviteCodes(role);
  if (!codes.length) {
    throw new HttpError(403, `${getRoleLabel(role)} 등록이 현재 닫혀 있습니다. 서버 초대코드를 먼저 설정하세요.`);
  }

  if (!codes.includes(inviteCode)) {
    throw new HttpError(403, "초대코드가 맞지 않습니다.");
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

async function renderIndexHtml(req) {
  const [template, db] = await Promise.all([fs.readFile(INDEX_TEMPLATE_PATH, "utf8"), store.read()]);
  const session = await getRequestSession(req, db);
  const bootstrapPayload = getBootstrapPayload(db, session);
  const deploymentContext = {
    kind: "dynamic-node",
    renderedAt: new Date().toISOString(),
    mode: "server-rendered-html",
    port: PORT,
    storage: store.kind
  };

  return template.replace(
    "<!-- SERVER_BOOTSTRAP -->",
    `<script>window.__INITIAL_BOOTSTRAP__=${toInlineJson(bootstrapPayload)};window.__DEPLOYMENT_CONTEXT__=${toInlineJson(deploymentContext)};</script>`
  );
}

async function serveStaticFile(req, res, pathname) {
  if (pathname === "/" || pathname === "/index.html") {
    const html = await renderIndexHtml(req);
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

async function handleCreateReport(req, res) {
  const body = await readJsonBody(req);
  const session = await getRequestSession(req);
  const report = asBadRequest(() => normalizeReport(body.report || body));

  const db = await store.mutate((current) => {
    if (current.reports.some((item) => item.id === report.id)) {
      throw new HttpError(409, "Report already exists");
    }

    current.reports.unshift(report);
    appendAuditEntry(current, {
      id: createId(),
      action: "report-submit",
      detail: `${report.title} 제보 등록`,
      reportId: report.id,
      createdAt: new Date().toISOString(),
      ...createActor(session, report.alias || "citizen-report")
    });
    return current;
  });

  sendJson(res, 201, getBootstrapPayload(db, session));
}

async function handleClearReports(req, res) {
  const { session } = await requireRole(req, ["operator"]);
  const db = await store.mutate((current) => {
    current.reports = [];
    appendAuditEntry(current, {
      id: createId(),
      action: "clear",
      detail: "공유 제보 큐 비우기",
      createdAt: new Date().toISOString(),
      ...createActor(session)
    });
    return current;
  });

  sendJson(res, 200, getBootstrapPayload(db, session));
}

async function handleDeleteReport(req, res, reportId) {
  const { session } = await requireRole(req, ["operator"]);
  const db = await store.mutate((current) => {
    const nextReports = current.reports.filter((report) => report.id !== reportId);
    if (nextReports.length === current.reports.length) {
      throw new HttpError(404, "Report not found");
    }

    current.reports = nextReports;
    appendAuditEntry(current, {
      id: createId(),
      action: "delete",
      detail: `${reportId} 제보 삭제`,
      reportId,
      createdAt: new Date().toISOString(),
      ...createActor(session)
    });
    return current;
  });

  sendJson(res, 200, getBootstrapPayload(db, session));
}

async function handleReportAction(req, res, reportId, action) {
  const body = await readJsonBody(req);
  const requesterSession = await getRequestSession(req);

  if (action === "review-vote" && !requesterSession) {
    throw new HttpError(401, "검토자 로그인이 필요합니다.");
  }

  if (["publish", "unpublish", "toggle-review"].includes(action)) {
    if (!requesterSession || requesterSession.role !== "operator") {
      throw new HttpError(403, "운영자 권한이 필요합니다.");
    }
  }

  if (action === "review-vote" && !["reviewer", "operator"].includes(requesterSession.role)) {
    throw new HttpError(403, "검토자 권한이 필요합니다.");
  }

  const db = await store.mutate((current) => {
    const { index, report } = getReportById(current, reportId);

    if (action === "publish") {
      if (report.exposure === "운영자만 검토") {
        throw new HttpError(400, "이 제보는 비공개 전용입니다.");
      }

      current.reports[index] = {
        ...report,
        publishedAt: new Date().toISOString()
      };
      appendAuditEntry(current, {
        id: createId(),
        action: "publish",
        detail: `${report.title} 공개`,
        reportId,
        createdAt: new Date().toISOString(),
        ...createActor(requesterSession)
      });
      return current;
    }

    if (action === "unpublish") {
      current.reports[index] = {
        ...report,
        publishedAt: ""
      };
      appendAuditEntry(current, {
        id: createId(),
        action: "unpublish",
        detail: `${report.title} 공개 해제`,
        reportId,
        createdAt: new Date().toISOString(),
        ...createActor(requesterSession)
      });
      return current;
    }

    if (action === "toggle-review") {
      const reviewed = !report.reviewed;
      current.reports[index] = {
        ...report,
        reviewed
      };
      appendAuditEntry(current, {
        id: createId(),
        action: "review-toggle",
        detail: `${report.title} ${reviewed ? "검토 완료" : "검토 해제"}`,
        reportId,
        createdAt: new Date().toISOString(),
        ...createActor(requesterSession)
      });
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
      appendAuditEntry(current, {
        id: createId(),
        action: "public-signal",
        detail: `${report.title} 공개 신호 ${voteKey}`,
        reportId,
        createdAt: new Date().toISOString(),
        ...createActor(requesterSession, `signal:${verifierId.slice(0, 8)}`)
      });
      return current;
    }

    if (action === "review-vote") {
      const voteKey = requireString(body.voteKey, "voteKey");
      current.reports[index] = {
        ...report,
        reviewVotes: {
          ...report.reviewVotes,
          [requesterSession.id]: {
            alias: requesterSession.alias,
            role: requesterSession.role,
            voteKey,
            weight: 1,
            votedAt: new Date().toISOString()
          }
        }
      };
      appendAuditEntry(current, {
        id: createId(),
        action: "review-vote",
        detail: `${report.title} 검토표 ${voteKey}`,
        reportId,
        createdAt: new Date().toISOString(),
        ...createActor(requesterSession)
      });
      return current;
    }

    if (action === "comments") {
      const rawComment = isPlainObject(body.comment) ? body.comment : body;
      const trusted = Boolean(requesterSession && ["reviewer", "operator"].includes(requesterSession.role));
      const comment = asBadRequest(() => normalizeReportComment({
        id: rawComment.id,
        alias: trusted ? requesterSession.alias : rawComment.alias,
        note: rawComment.note,
        voteKey: typeof rawComment.voteKey === "string" ? rawComment.voteKey : "",
        authorRole: trusted ? requesterSession.role : "public",
        trusted,
        createdAt: rawComment.createdAt
      }));

      current.reports[index] = {
        ...report,
        communityComments: [comment, ...report.communityComments]
      };
      appendAuditEntry(current, {
        id: createId(),
        action: "comment",
        detail: `${report.title} 검증 메모 추가`,
        reportId,
        createdAt: new Date().toISOString(),
        ...createActor(requesterSession, comment.alias || "public-comment")
      });
      return current;
    }

    throw new HttpError(404, "Unknown report action");
  });

  sendJson(res, 200, getBootstrapPayload(db, requesterSession));
}

async function handleCreateBoardPost(req, res) {
  const body = await readJsonBody(req);
  const session = await getRequestSession(req);
  const post = asBadRequest(() => normalizeBoardPost(body.post || body));

  const db = await store.mutate((current) => {
    if (current.boardPosts.some((item) => item.id === post.id)) {
      throw new HttpError(409, "Board post already exists");
    }

    current.boardPosts.unshift(post);
    appendAuditEntry(current, {
      id: createId(),
      action: "board-post",
      detail: `${post.title} 익명 글 등록`,
      reportId: post.id,
      createdAt: new Date().toISOString(),
      ...createActor(session, post.alias || "anonymous-board")
    });
    return current;
  });

  sendJson(res, 201, getBootstrapPayload(db, session));
}

async function handleBoardAction(req, res, postId, action) {
  const body = await readJsonBody(req);
  const session = await getRequestSession(req);

  const db = await store.mutate((current) => {
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
      appendAuditEntry(current, {
        id: createId(),
        action: "board-reaction",
        detail: `${post.title} 반응 ${reactionKey}`,
        reportId: postId,
        createdAt: new Date().toISOString(),
        ...createActor(session, `board:${verifierId.slice(0, 8)}`)
      });
      return current;
    }

    if (action === "comments") {
      const rawComment = isPlainObject(body.comment) ? body.comment : body;
      const comment = asBadRequest(() => normalizeBoardComment({
        id: rawComment.id,
        alias: typeof rawComment.alias === "string" ? rawComment.alias : "",
        body: rawComment.body,
        createdAt: rawComment.createdAt
      }));

      current.boardPosts[index] = {
        ...post,
        comments: [comment, ...post.comments]
      };
      appendAuditEntry(current, {
        id: createId(),
        action: "board-comment",
        detail: `${post.title} 댓글 추가`,
        reportId: postId,
        createdAt: new Date().toISOString(),
        ...createActor(session, comment.alias || "anonymous-reply")
      });
      return current;
    }

    throw new HttpError(404, "Unknown board action");
  });

  sendJson(res, 200, getBootstrapPayload(db, session));
}

async function handleAuthSession(req, res) {
  const db = await store.read();
  const session = await getRequestSession(req, db);
  sendJson(res, 200, { auth: buildAuthPayload(db, session) });
}

async function handleRegisterOptions(req, res) {
  const body = await readJsonBody(req);
  const alias = requireString(body.alias, "alias");
  const role = validateRole(requireString(body.role, "role"));
  const inviteCode = requireString(body.inviteCode, "inviteCode");

  assertInviteCode(role, inviteCode);

  const db = await store.read();
  if (findUserByAlias(db, alias)) {
    throw new HttpError(409, "이미 등록된 별칭입니다. 로그인으로 진행하세요.");
  }

  const options = await generateRegistrationOptions({
    rpName: WEBAUTHN_RP_NAME,
    rpID: resolveRpId(req),
    userName: alias,
    userDisplayName: alias,
    userID: Buffer.from(createId(), "utf8"),
    timeout: 60000,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred"
    },
    preferredAuthenticatorType: "localDevice"
  });

  await store.mutate((current) => {
    current.auth.challenges = current.auth.challenges.filter((challenge) => {
      return !(challenge.kind === "register" && challenge.aliasKey === normalizeAlias(alias));
    });
    current.auth.challenges.unshift(
      createChallengeRecord({
        kind: "register",
        alias,
        role,
        userId: "",
        challenge: options.challenge,
        rpId: resolveRpId(req),
        origins: resolveOrigins(req)
      })
    );
    return current;
  });

  sendJson(res, 200, { options });
}

async function handleRegisterVerify(req, res) {
  const body = await readJsonBody(req);
  const alias = requireString(body.alias, "alias");
  const role = validateRole(requireString(body.role, "role"));
  const response = body.response;
  requireObject(response, "response");

  const current = await store.read();
  if (findUserByAlias(current, alias)) {
    throw new HttpError(409, "이미 등록된 별칭입니다. 로그인으로 진행하세요.");
  }

  const challenge = findChallenge(current, "register", alias, role);
  if (!challenge) {
    throw new HttpError(400, "만료되었거나 찾을 수 없는 등록 요청입니다. 다시 시도하세요.");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: isPlainArrayOfStrings(challenge.origins) && challenge.origins.length ? challenge.origins : [getRequestOrigin(req)],
    expectedRPID: challenge.rpId,
    requireUserVerification: true
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new HttpError(400, "패스키 등록 검증에 실패했습니다.");
  }

  const credentialInfo = verification.registrationInfo.credential;
  const user = normalizeUser({
    alias,
    displayName: alias,
    role
  });
  const credential = normalizeCredential({
    userId: user.id,
    credentialId: credentialInfo.id,
    publicKey: isoBase64URL.fromBuffer(credentialInfo.publicKey),
    counter: credentialInfo.counter,
    transports: Array.isArray(response.response && response.response.transports) ? response.response.transports : [],
    deviceType: verification.registrationInfo.credentialDeviceType,
    backedUp: verification.registrationInfo.credentialBackedUp
  });
  const session = createSessionRecord(user);

  const db = await store.mutate((next) => {
    if (findUserByAlias(next, alias)) {
      throw new HttpError(409, "이미 등록된 별칭입니다. 로그인으로 진행하세요.");
    }

    if (findCredentialById(next, credential.credentialId)) {
      throw new HttpError(409, "이미 등록된 패스키입니다.");
    }

    next.auth.users.unshift(user);
    next.auth.credentials.unshift(credential);
    next.auth.sessions = next.auth.sessions.filter((item) => item.userId !== user.id);
    next.auth.sessions.unshift(session);
    next.auth.challenges = next.auth.challenges.filter((item) => item.id !== challenge.id);
    appendAuditEntry(next, {
      id: createId(),
      action: "register",
      detail: `${user.alias} ${getRoleLabel(user.role)} 패스키 등록`,
      createdAt: new Date().toISOString(),
      ...createActor(session)
    });
    appendAuditEntry(next, {
      id: createId(),
      action: "login",
      detail: `${user.alias} ${getRoleLabel(user.role)} 로그인`,
      createdAt: new Date().toISOString(),
      ...createActor(session)
    });
    return next;
  });

  setSessionCookie(res, session.id);
  sendJson(res, 200, getBootstrapPayload(db, session));
}

async function handleLoginOptions(req, res) {
  const body = await readJsonBody(req);
  const alias = requireString(body.alias, "alias");
  const db = await store.read();
  const user = findUserByAlias(db, alias);

  if (!user) {
    throw new HttpError(404, "등록된 별칭을 찾지 못했습니다.");
  }

  const credentials = findCredentialsForUser(db, user.id);
  if (!credentials.length) {
    throw new HttpError(404, "등록된 패스키가 없습니다.");
  }

  const options = await generateAuthenticationOptions({
    rpID: resolveRpId(req),
    allowCredentials: credentials.map((credential) => ({
      id: credential.credentialId,
      transports: credential.transports
    })),
    userVerification: "preferred",
    timeout: 60000
  });

  await store.mutate((current) => {
    current.auth.challenges = current.auth.challenges.filter((challenge) => {
      return !(challenge.kind === "authenticate" && challenge.aliasKey === user.aliasKey);
    });
    current.auth.challenges.unshift(
      createChallengeRecord({
        kind: "authenticate",
        alias: user.alias,
        role: user.role,
        userId: user.id,
        challenge: options.challenge,
        rpId: resolveRpId(req),
        origins: resolveOrigins(req)
      })
    );
    return current;
  });

  sendJson(res, 200, { options });
}

async function handleLoginVerify(req, res) {
  const body = await readJsonBody(req);
  const alias = requireString(body.alias, "alias");
  const response = body.response;
  requireObject(response, "response");

  const current = await store.read();
  const user = findUserByAlias(current, alias);
  if (!user) {
    throw new HttpError(404, "등록된 별칭을 찾지 못했습니다.");
  }

  const challenge = findChallenge(current, "authenticate", alias, "");
  if (!challenge) {
    throw new HttpError(400, "만료되었거나 찾을 수 없는 로그인 요청입니다. 다시 시도하세요.");
  }

  const credential = findCredentialById(current, requireString(response.id, "response.id"));
  if (!credential || credential.userId !== user.id) {
    throw new HttpError(404, "등록된 패스키를 찾지 못했습니다.");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: isPlainArrayOfStrings(challenge.origins) && challenge.origins.length ? challenge.origins : [getRequestOrigin(req)],
    expectedRPID: challenge.rpId,
    credential: {
      id: credential.credentialId,
      publicKey: isoBase64URL.toBuffer(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports
    },
    requireUserVerification: true
  });

  if (!verification.verified) {
    throw new HttpError(400, "패스키 로그인 검증에 실패했습니다.");
  }

  const session = createSessionRecord(user);

  const db = await store.mutate((next) => {
    const credentialIndex = next.auth.credentials.findIndex((item) => item.credentialId === credential.credentialId);
    if (credentialIndex === -1) {
      throw new HttpError(404, "등록된 패스키를 찾지 못했습니다.");
    }

    next.auth.credentials[credentialIndex] = {
      ...next.auth.credentials[credentialIndex],
      counter: verification.authenticationInfo.newCounter,
      lastUsedAt: new Date().toISOString()
    };
    next.auth.sessions = next.auth.sessions.filter((item) => item.userId !== user.id);
    next.auth.sessions.unshift(session);
    next.auth.challenges = next.auth.challenges.filter((item) => item.id !== challenge.id);
    appendAuditEntry(next, {
      id: createId(),
      action: "login",
      detail: `${user.alias} ${getRoleLabel(user.role)} 로그인`,
      createdAt: new Date().toISOString(),
      ...createActor(session)
    });
    return next;
  });

  setSessionCookie(res, session.id);
  sendJson(res, 200, getBootstrapPayload(db, session));
}

async function handleLogout(req, res) {
  const db = await store.read();
  const session = await getRequestSession(req, db);

  if (!session) {
    clearSessionCookie(res);
    sendJson(res, 200, getBootstrapPayload(db, null));
    return;
  }

  const next = await store.mutate((current) => {
    current.auth.sessions = current.auth.sessions.filter((item) => item.id !== session.id);
    appendAuditEntry(current, {
      id: createId(),
      action: "logout",
      detail: `${session.alias} 로그아웃`,
      createdAt: new Date().toISOString(),
      ...createActor(session)
    });
    return current;
  });

  clearSessionCookie(res);
  sendJson(res, 200, getBootstrapPayload(next, null));
}

async function handleResourceApi(req, res, segments) {
  if (segments[1] === "reports") {
    if (segments.length === 2 && req.method === "POST") {
      await handleCreateReport(req, res);
      return true;
    }

    if (segments.length === 2 && req.method === "DELETE") {
      await handleClearReports(req, res);
      return true;
    }

    if (segments.length === 3 && req.method === "DELETE") {
      await handleDeleteReport(req, res, decodeURIComponent(segments[2]));
      return true;
    }

    if (segments.length === 4 && req.method === "POST") {
      await handleReportAction(req, res, decodeURIComponent(segments[2]), segments[3]);
      return true;
    }

    return false;
  }

  if (segments[1] === "board-posts") {
    if (segments.length === 2 && req.method === "POST") {
      await handleCreateBoardPost(req, res);
      return true;
    }

    if (segments.length === 4 && req.method === "POST") {
      await handleBoardAction(req, res, decodeURIComponent(segments[2]), segments[3]);
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
    const db = await store.read();
    const session = await getRequestSession(req, db);
    sendJson(res, 200, getBootstrapPayload(db, session));
    return true;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/session") {
    await handleAuthSession(req, res);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/register/options") {
    await handleRegisterOptions(req, res);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/register/verify") {
    await handleRegisterVerify(req, res);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login/options") {
    await handleLoginOptions(req, res);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login/verify") {
    await handleLoginVerify(req, res);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    await handleLogout(req, res);
    return true;
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

    await serveStaticFile(req, res, url.pathname);
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    sendJson(res, statusCode, { error: error.message || "Internal server error" });
  }
});

server.listen(PORT, HOST, async () => {
  await store.init();
  console.log(`Backend server listening on http://${HOST}:${PORT} (${store.kind})`);
});

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, async () => {
    try {
      await store.close();
    } catch (error) {
      // Ignore shutdown errors.
    } finally {
      process.exit(0);
    }
  });
});
