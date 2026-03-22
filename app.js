(function () {
  const data = window.CONSTITUTIONAL_WATCH_DATA;
  const REPORT_STORAGE_KEY = "lee-monitor-citizen-reports";
  const BOARD_STORAGE_KEY = "lee-monitor-anonymous-board";
  const SESSION_STORAGE_KEY = "lee-monitor-review-session";
  const AUDIT_STORAGE_KEY = "lee-monitor-audit-log";
  const VERIFIER_STORAGE_KEY = "lee-monitor-public-verifier";
  const TOTAL_VERIFICATION_CHECKS = 6;

  if (!data) {
    return;
  }

  const state = {
    filter: "all",
    query: "",
    shared: {
      backend: false,
      reports: [],
      boardPosts: [],
      auditLog: [],
      auth: {
        backend: "file",
        mode: "passkey",
        counts: {
          reviewer: 0,
          operator: 0
        },
        registration: {
          reviewer: { enabled: false, inviteRequired: true },
          operator: { enabled: false, inviteRequired: true }
        },
        session: null
      },
      updatedAt: "",
      pollHandle: null
    }
  };

  const deploymentContext =
    window.__DEPLOYMENT_CONTEXT__ && typeof window.__DEPLOYMENT_CONTEXT__ === "object"
      ? window.__DEPLOYMENT_CONTEXT__
      : null;

  const byId = (id) => document.getElementById(id);

  const scoreGrid = byId("score-grid");
  const trustGrid = byId("trust-grid");
  const criteriaGrid = byId("criteria-grid");
  const responseGrid = byId("response-grid");
  const prohibitedList = byId("prohibited-list");
  const indicatorGrid = byId("indicator-grid");
  const filterRow = byId("filter-row");
  const feedList = byId("feed-list");
  const sourceList = byId("source-list");
  const searchInput = byId("feed-search");

  const participationRules = byId("participation-rules");
  const participationSteps = byId("participation-steps");
  const reportCategory = byId("report-category");
  const reportExposure = byId("report-exposure");
  const reportForm = byId("citizen-report-form");
  const reportStatus = byId("report-form-status");
  const reportList = byId("citizen-report-list");
  const reportStats = byId("citizen-stats");
  const exportReportsButton = byId("export-reports");
  const clearReportsButton = byId("clear-reports");
  const publicVerificationRules = byId("public-verification-rules");
  const publicBoardStats = byId("public-board-stats");
  const publicBoardList = byId("public-board-list");
  const authRules = byId("auth-rules");
  const authSummary = byId("auth-summary");
  const authForm = byId("review-login-form");
  const authStatus = byId("auth-form-status");
  const authRoleTarget = byId("auth-role-target");
  const authLogoutButton = byId("auth-logout");
  const authDemoKeys = byId("auth-demo-keys");
  const authAliasInput = byId("auth-alias");
  const authAccessKeyInput = byId("auth-access-key");
  const auditStats = byId("audit-stats");
  const auditList = byId("audit-list");
  const anonymousBoardRules = byId("anonymous-board-rules");
  const anonymousBoardForm = byId("anonymous-board-form");
  const boardCategory = byId("board-category");
  const boardStatus = byId("board-form-status");
  const boardStats = byId("board-stats");
  const boardList = byId("board-list");
  const sectionQuickLinks = Array.from(document.querySelectorAll(".section-quick-link"));

  const fillText = (id, value) => {
    const node = byId(id);
    if (node) {
      node.textContent = value;
    }
  };

  const isBackendMode = () => state.shared.backend;

  const refreshDataStatus = () => {
    const suffix = isBackendMode()
      ? getAuthState().backend === "postgres"
        ? " / 동적 배포(Node + Postgres)"
        : deploymentContext && deploymentContext.kind === "dynamic-node"
          ? " / 동적 배포(Node)"
          : " / Node 공유 백엔드"
      : " / 로컬 프로토타입";
    fillText("data-status", `${data.meta.status}${suffix}`);
  };

  const setActiveSectionLink = (id) => {
    sectionQuickLinks.forEach((link) => {
      link.classList.toggle("active", link.dataset.sectionLink === id);
    });
  };

  const escapeHtml = (value) => {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  };

  const toDateLabel = (value) => {
    if (!value) {
      return "시각 미기재";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getVerificationScore = (checks) => {
    return Math.round((checks.length / TOTAL_VERIFICATION_CHECKS) * 100);
  };

  const getScoreTone = (score) => {
    if (score >= 67) {
      return "high";
    }
    if (score >= 34) {
      return "medium";
    }
    return "low";
  };

  const createId = () => {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  const getAuthState = () => {
    return state.shared.auth && typeof state.shared.auth === "object"
      ? state.shared.auth
      : {
          backend: "file",
          mode: "passkey",
          counts: { reviewer: 0, operator: 0 },
          registration: {
            reviewer: { enabled: false, inviteRequired: true },
            operator: { enabled: false, inviteRequired: true }
          },
          session: null
        };
  };

  const isPasskeySupported = () => {
    return Boolean(window.PublicKeyCredential && window.navigator.credentials && window.isSecureContext);
  };

  const base64UrlToArrayBuffer = (value) => {
    const base64 = String(value || "")
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(String(value || "").length / 4) * 4, "=");
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes.buffer;
  };

  const arrayBufferToBase64Url = (buffer) => {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  };

  const parseCreationOptions = (options) => {
    if (window.PublicKeyCredential && typeof window.PublicKeyCredential.parseCreationOptionsFromJSON === "function") {
      return window.PublicKeyCredential.parseCreationOptionsFromJSON(options);
    }

    return {
      ...options,
      challenge: base64UrlToArrayBuffer(options.challenge),
      user: {
        ...options.user,
        id: base64UrlToArrayBuffer(options.user.id)
      },
      excludeCredentials: Array.isArray(options.excludeCredentials)
        ? options.excludeCredentials.map((credential) => ({
            ...credential,
            id: base64UrlToArrayBuffer(credential.id)
          }))
        : []
    };
  };

  const parseRequestOptions = (options) => {
    if (window.PublicKeyCredential && typeof window.PublicKeyCredential.parseRequestOptionsFromJSON === "function") {
      return window.PublicKeyCredential.parseRequestOptionsFromJSON(options);
    }

    return {
      ...options,
      challenge: base64UrlToArrayBuffer(options.challenge),
      allowCredentials: Array.isArray(options.allowCredentials)
        ? options.allowCredentials.map((credential) => ({
            ...credential,
            id: base64UrlToArrayBuffer(credential.id)
          }))
        : []
    };
  };

  const credentialToJson = (credential) => {
    if (credential && typeof credential.toJSON === "function") {
      return credential.toJSON();
    }

    const base = {
      id: credential.id,
      rawId: arrayBufferToBase64Url(credential.rawId),
      type: credential.type,
      authenticatorAttachment: credential.authenticatorAttachment,
      clientExtensionResults: credential.getClientExtensionResults ? credential.getClientExtensionResults() : {}
    };

    if (window.AuthenticatorAttestationResponse && credential.response instanceof window.AuthenticatorAttestationResponse) {
      return {
        ...base,
        response: {
          clientDataJSON: arrayBufferToBase64Url(credential.response.clientDataJSON),
          attestationObject: arrayBufferToBase64Url(credential.response.attestationObject),
          transports: credential.response.getTransports ? credential.response.getTransports() : []
        }
      };
    }

    return {
      ...base,
      response: {
        clientDataJSON: arrayBufferToBase64Url(credential.response.clientDataJSON),
        authenticatorData: arrayBufferToBase64Url(credential.response.authenticatorData),
        signature: arrayBufferToBase64Url(credential.response.signature),
        userHandle: credential.response.userHandle ? arrayBufferToBase64Url(credential.response.userHandle) : undefined
      }
    };
  };

  const applyBootstrapPayload = (payload) => {
    if (!payload || typeof payload !== "object") {
      return false;
    }

    const nextUpdatedAt = payload.meta && typeof payload.meta.updatedAt === "string" ? payload.meta.updatedAt : "";
    const changed = nextUpdatedAt !== state.shared.updatedAt;

    state.shared.backend = typeof payload.mode === "string" && payload.mode.startsWith("backend");
    state.shared.reports = Array.isArray(payload.reports) ? payload.reports.map(normalizeReport) : [];
    state.shared.boardPosts = Array.isArray(payload.boardPosts) ? payload.boardPosts.map(normalizeBoardPost) : [];
    state.shared.auditLog = Array.isArray(payload.auditLog) ? payload.auditLog : [];
    state.shared.auth = payload.auth && typeof payload.auth === "object" ? payload.auth : getAuthState();
    state.shared.updatedAt = nextUpdatedAt;
    window.__BACKEND_SHARED__ = state.shared.backend;
    refreshDataStatus();

    return changed;
  };

  const fetchJson = async (resource, options = {}) => {
    const requestOptions = {
      cache: "no-store",
      credentials: "same-origin",
      ...options
    };

    const response = await window.fetch(resource, requestOptions);
    let payload = null;

    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok) {
      const message = payload && payload.error ? payload.error : `요청 실패 (${response.status})`;
      throw new Error(message);
    }

    return payload;
  };

  const applyApiPayload = (payload) => {
    applyBootstrapPayload(payload);
    renderAuthPanel();
    renderReportList();
    renderPublicBoard();
    renderBoardList();
    renderAuditLog();
  };

  const apiRequest = async (resource, options = {}) => {
    const headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

    const requestOptions = {
      ...options,
      headers
    };

    if (requestOptions.body !== undefined && requestOptions.body !== null && typeof requestOptions.body !== "string") {
      requestOptions.body = JSON.stringify(requestOptions.body);
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
    }

    const payload = await fetchJson(resource, requestOptions);
    applyApiPayload(payload);
    return payload;
  };

  const startBackendPolling = () => {
    if (state.shared.pollHandle || window.location.protocol === "file:") {
      return;
    }

    state.shared.pollHandle = window.setInterval(async () => {
      if (document.hidden) {
        return;
      }

      try {
        const payload = await fetchJson("/api/bootstrap", { method: "GET" });
        const changed = applyBootstrapPayload(payload);
        if (changed) {
          renderReportList();
          renderPublicBoard();
          renderBoardList();
          renderAuditLog();
        }
      } catch (error) {
        // Polling is best-effort in the prototype stage.
      }
    }, 5000);
  };

  const bootstrapBackend = async () => {
    if (window.location.protocol === "file:") {
      state.shared.backend = false;
      refreshDataStatus();
      return false;
    }

    if (window.__INITIAL_BOOTSTRAP__ && typeof window.__INITIAL_BOOTSTRAP__ === "object") {
      applyBootstrapPayload(window.__INITIAL_BOOTSTRAP__);
      startBackendPolling();
      return true;
    }

    try {
      const payload = await fetchJson("/api/bootstrap", { method: "GET" });
      applyBootstrapPayload(payload);
      startBackendPolling();
      return true;
    } catch (error) {
      state.shared.backend = false;
      window.__BACKEND_SHARED__ = false;
      refreshDataStatus();
      return false;
    }
  };

  const getStoredSession = () => {
    if (isBackendMode()) {
      return getAuthState().session || null;
    }

    try {
      const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  };

  const saveStoredSession = (session) => {
    if (isBackendMode()) {
      state.shared.auth = {
        ...getAuthState(),
        session
      };
      return;
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  };

  const clearStoredSession = () => {
    if (isBackendMode()) {
      state.shared.auth = {
        ...getAuthState(),
        session: null
      };
      return;
    }

    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  };

  const getStoredAuditLog = () => {
    if (isBackendMode()) {
      return state.shared.auditLog.slice();
    }

    try {
      const raw = window.localStorage.getItem(AUDIT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const saveStoredAuditLog = (entries) => {
    if (isBackendMode()) {
      state.shared.auditLog = Array.isArray(entries) ? entries.slice(0, 120) : [];
      return;
    }
    window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries));
  };

  const getRoleConfig = (role) => {
    return data.participation.accessControl.roles.find((item) => item.key === role) || null;
  };

  const isReviewerSession = (session) => {
    return Boolean(session && (session.role === "reviewer" || session.role === "operator"));
  };

  const isOperatorSession = (session) => {
    return Boolean(session && session.role === "operator");
  };

  const appendAuditLog = async (action, detail, actor, reportId) => {
    if (isBackendMode()) {
      return;
    }

    const session = actor || getStoredSession();
    const entry = {
      id: createId(),
      action,
      detail,
      reportId: reportId || "",
      actorAlias: session && session.alias ? session.alias : "anonymous",
      actorRole: session && session.role ? session.role : "public",
      createdAt: new Date().toISOString()
    };

    const entries = getStoredAuditLog();
    entries.unshift(entry);
    saveStoredAuditLog(entries.slice(0, 120));
  };

  const tryAppendAuditLog = async (action, detail, actor, reportId) => {
    try {
      await appendAuditLog(action, detail, actor, reportId);
    } catch (error) {
      // Audit append is best-effort at this stage.
    }
  };

  const getVerifierId = () => {
    try {
      const stored = window.localStorage.getItem(VERIFIER_STORAGE_KEY);
      if (stored) {
        return stored;
      }
      const created = createId();
      window.localStorage.setItem(VERIFIER_STORAGE_KEY, created);
      return created;
    } catch (error) {
      return "public-viewer";
    }
  };

  const redactLocation = (value) => {
    const raw = String(value || "").trim();
    if (!raw) {
      return "장소 비공개";
    }

    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts.slice(0, 2).join(" ")} 일대`;
    }
    return `${parts[0]} 인근`;
  };

  const normalizeComment = (comment) => {
    return {
      id: comment.id || createId(),
      alias: comment.alias || "",
      note: comment.note || "",
      voteKey: comment.voteKey || "",
      authorRole: comment.authorRole || "public",
      trusted: Boolean(comment.trusted),
      createdAt: comment.createdAt || new Date().toISOString()
    };
  };

  const normalizeBoardComment = (comment) => {
    return {
      id: comment.id || createId(),
      alias: comment.alias || "",
      body: comment.body || "",
      createdAt: comment.createdAt || new Date().toISOString()
    };
  };

  const normalizeBoardPost = (post) => {
    return {
      id: post.id || createId(),
      category: post.category || "자유 토론",
      alias: post.alias || "",
      title: post.title || "",
      tag: post.tag || "",
      body: post.body || "",
      reactions:
        post.reactions && typeof post.reactions === "object" && !Array.isArray(post.reactions)
          ? post.reactions
          : {},
      comments: Array.isArray(post.comments) ? post.comments.map(normalizeBoardComment) : [],
      createdAt: post.createdAt || new Date().toISOString()
    };
  };

  const normalizeReport = (report) => {
    return {
      ...report,
      checks: Array.isArray(report.checks) ? report.checks : [],
      verificationScore: typeof report.verificationScore === "number" ? report.verificationScore : 0,
      reviewed: Boolean(report.reviewed),
      publishedAt: report.publishedAt || "",
      communityVotes:
        report.communityVotes && typeof report.communityVotes === "object" && !Array.isArray(report.communityVotes)
          ? report.communityVotes
          : {},
      reviewVotes:
        report.reviewVotes && typeof report.reviewVotes === "object" && !Array.isArray(report.reviewVotes)
          ? report.reviewVotes
          : {},
      communityComments: Array.isArray(report.communityComments) ? report.communityComments.map(normalizeComment) : []
    };
  };

  const getStoredReports = () => {
    if (isBackendMode()) {
      return state.shared.reports.map(normalizeReport);
    }

    try {
      const raw = window.localStorage.getItem(REPORT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(normalizeReport) : [];
    } catch (error) {
      return [];
    }
  };

  const getStoredBoardPosts = () => {
    if (isBackendMode()) {
      return state.shared.boardPosts.map(normalizeBoardPost);
    }

    try {
      const raw = window.localStorage.getItem(BOARD_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(normalizeBoardPost) : [];
    } catch (error) {
      return [];
    }
  };

  const saveStoredReports = (reports) => {
    if (isBackendMode()) {
      state.shared.reports = Array.isArray(reports) ? reports.map(normalizeReport) : [];
      return;
    }
    window.localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports));
  };

  const saveStoredBoardPosts = (posts) => {
    if (isBackendMode()) {
      state.shared.boardPosts = Array.isArray(posts) ? posts.map(normalizeBoardPost) : [];
      return;
    }
    window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(posts));
  };

  const createReportRecord = async (report) => {
    return apiRequest("/api/reports", {
      method: "POST",
      body: { report }
    });
  };

  const publishReportRecord = async (reportId) => {
    return apiRequest(`/api/reports/${encodeURIComponent(reportId)}/publish`, {
      method: "POST"
    });
  };

  const unpublishReportRecord = async (reportId) => {
    return apiRequest(`/api/reports/${encodeURIComponent(reportId)}/unpublish`, {
      method: "POST"
    });
  };

  const toggleReviewRecord = async (reportId) => {
    return apiRequest(`/api/reports/${encodeURIComponent(reportId)}/toggle-review`, {
      method: "POST"
    });
  };

  const deleteReportRecord = async (reportId) => {
    return apiRequest(`/api/reports/${encodeURIComponent(reportId)}`, {
      method: "DELETE"
    });
  };

  const submitPublicSignal = async (reportId, verifierId, voteKey) => {
    return apiRequest(`/api/reports/${encodeURIComponent(reportId)}/public-signal`, {
      method: "POST",
      body: {
        verifierId,
        voteKey
      }
    });
  };

  const submitReviewVote = async (reportId, session, voteKey, weight) => {
    return apiRequest(`/api/reports/${encodeURIComponent(reportId)}/review-vote`, {
      method: "POST",
      body: {
        session,
        voteKey,
        weight
      }
    });
  };

  const submitReportComment = async (reportId, comment) => {
    return apiRequest(`/api/reports/${encodeURIComponent(reportId)}/comments`, {
      method: "POST",
      body: { comment }
    });
  };

  const createBoardPostRecord = async (post) => {
    return apiRequest("/api/board-posts", {
      method: "POST",
      body: { post }
    });
  };

  const submitBoardReaction = async (postId, verifierId, reactionKey) => {
    return apiRequest(`/api/board-posts/${encodeURIComponent(postId)}/reactions`, {
      method: "POST",
      body: {
        verifierId,
        reactionKey
      }
    });
  };

  const submitBoardComment = async (postId, comment) => {
    return apiRequest(`/api/board-posts/${encodeURIComponent(postId)}/comments`, {
      method: "POST",
      body: { comment }
    });
  };

  const clearReportRecords = async () => {
    return apiRequest("/api/reports", {
      method: "DELETE"
    });
  };

  const getVerdictOption = (key) => {
    return data.participation.verdictOptions.find((option) => option.key === key);
  };

  const getVoteCounts = (voteMap, weighted) => {
    const counts = data.participation.verdictOptions.reduce((result, option) => {
      result[option.key] = 0;
      return result;
    }, {});

    Object.values(voteMap || {}).forEach((voteValue) => {
      const voteKey = weighted && voteValue && typeof voteValue === "object" ? voteValue.voteKey : voteValue;
      const voteWeight = weighted && voteValue && typeof voteValue === "object" ? Number(voteValue.weight || 1) : 1;
      if (Object.prototype.hasOwnProperty.call(counts, voteKey)) {
        counts[voteKey] += voteWeight;
      }
    });

    return counts;
  };

  const getPublicSignalCounts = (report) => {
    return getVoteCounts(report.communityVotes || {}, false);
  };

  const getReviewVoteCounts = (report) => {
    return getVoteCounts(report.reviewVotes || {}, true);
  };

  const getVoteTotal = (voteMap) => {
    return Object.keys(voteMap || {}).length;
  };

  const getReviewConsensus = (report) => {
    const counts = getReviewVoteCounts(report);
    const ranked = data.participation.verdictOptions
      .map((option) => ({ ...option, count: counts[option.key] || 0 }))
      .sort((left, right) => right.count - left.count);

    const totalVotes = ranked.reduce((sum, option) => sum + option.count, 0);
    if (!totalVotes) {
      return {
        key: "needs_more",
        label: "검토자 판정 대기",
        detail: "아직 로그인된 검토자 표결이 없습니다."
      };
    }

    if (ranked.length > 1 && ranked[0].count === ranked[1].count) {
      return {
        key: "needs_more",
        label: "검토자 판정 보류",
        detail: `상위 검토표가 동률입니다. 총 ${totalVotes}표`
      };
    }

    return {
      key: ranked[0].key,
      label: ranked[0].label,
      detail: `${ranked[0].count}/${totalVotes}표 우세`
    };
  };

  const getPublicTitle = (report) => {
    if (report.exposure === "요약만 공개 가능") {
      return `${report.category} 사건 요약`;
    }
    return report.title;
  };

  const getBoardReactionCounts = (post) => {
    const counts = data.participation.anonymousBoard.reactions.reduce((result, reaction) => {
      result[reaction.key] = 0;
      return result;
    }, {});

    Object.values(post.reactions || {}).forEach((reactionKey) => {
      if (Object.prototype.hasOwnProperty.call(counts, reactionKey)) {
        counts[reactionKey] += 1;
      }
    });

    return counts;
  };

  fillText("last-updated", `기준 시각: ${data.meta.updatedAt}`);
  refreshDataStatus();
  fillText("hero-verdict", data.verdict.level);
  fillText("hero-verdict-detail", data.verdict.short);
  fillText("trigger-score", `${data.verdict.triggerScore}`);
  fillText("verdict-title", data.verdict.short);
  fillText("verdict-summary", data.verdict.summary);

  const verdictRing = byId("verdict-ring");
  if (verdictRing) {
    verdictRing.style.setProperty("--score", data.verdict.triggerScore);
  }

  const verdictPoints = byId("verdict-points");
  data.verdict.points.forEach((point) => {
    const item = document.createElement("li");
    item.textContent = point;
    verdictPoints.appendChild(item);
  });

  data.metrics.forEach((metric) => {
    const card = document.createElement("article");
    card.className = `metric-card ${metric.tone}`;
    card.innerHTML = `
      <div class="metric-label">${metric.label}</div>
      <div class="metric-value-row">
        <strong class="metric-value">${metric.value}</strong>
        <span class="metric-scale">${metric.scale}</span>
      </div>
      <div class="meter" aria-hidden="true">
        <div class="meter-fill" style="--value:${metric.value}"></div>
      </div>
      <p class="metric-note">${metric.note}</p>
    `;
    scoreGrid.appendChild(card);
  });

  data.trustWeights.forEach((criterion) => {
    const card = document.createElement("article");
    card.className = `criterion-card ${criterion.status}`;
    const checks = criterion.checks.map((check) => `<li>${check}</li>`).join("");
    const basis = criterion.basis.map((item) => `<span>${item}</span>`).join("");
    card.innerHTML = `
      <div class="criterion-top">
        <div>
          <p class="card-kicker">Trust Weight</p>
          <h3>${criterion.title}</h3>
        </div>
        <span class="criterion-badge ${criterion.status}">${criterion.badge}</span>
      </div>
      <p>${criterion.summary}</p>
      <ul class="plain-list">${checks}</ul>
      <p><strong>적용 방식:</strong> ${criterion.current}</p>
      <div class="criterion-meta">${basis}</div>
    `;
    trustGrid.appendChild(card);
  });

  data.criteria.forEach((criterion) => {
    const card = document.createElement("article");
    card.className = `criterion-card ${criterion.status}`;
    const checks = criterion.checks.map((check) => `<li>${check}</li>`).join("");
    const basis = criterion.basis.map((item) => `<span>${item}</span>`).join("");
    card.innerHTML = `
      <div class="criterion-top">
        <div>
          <p class="card-kicker">Trigger Test</p>
          <h3>${criterion.title}</h3>
        </div>
        <span class="criterion-badge ${criterion.status}">${criterion.badge}</span>
      </div>
      <p>${criterion.summary}</p>
      <ul class="plain-list">${checks}</ul>
      <p><strong>현재 판단:</strong> ${criterion.current}</p>
      <div class="criterion-meta">${basis}</div>
    `;
    criteriaGrid.appendChild(card);
  });

  data.responses.forEach((response) => {
    const card = document.createElement("article");
    card.className = "response-card";
    const links = response.links
      .map((link) => `<a href="${link.url}" target="_blank" rel="noreferrer">${link.label}</a>`)
      .join(" · ");
    card.innerHTML = `
      <p class="card-kicker">${response.step}</p>
      <h3>${response.title}</h3>
      <p>${response.summary}</p>
      <div class="response-links">${links}</div>
    `;
    responseGrid.appendChild(card);
  });

  data.prohibited.forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    prohibitedList.appendChild(item);
  });

  data.indicators.forEach((indicator) => {
    const card = document.createElement("article");
    card.className = `indicator-card ${indicator.tone}`;
    const proof = indicator.proof.map((item) => `<span>${item}</span>`).join("");
    card.innerHTML = `
      <div class="indicator-top">
        <div>
          <p class="card-kicker">Indicator</p>
          <h3>${indicator.name}</h3>
        </div>
        <div>
          <div class="indicator-score">${indicator.score}</div>
          <span class="metric-trend">${indicator.trend}</span>
        </div>
      </div>
      <p>${indicator.description}</p>
      <div class="indicator-proof">${proof}</div>
    `;
    indicatorGrid.appendChild(card);
  });

  data.filters.forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-chip${filter.key === state.filter ? " active" : ""}`;
    button.dataset.filter = filter.key;
    button.textContent = filter.label;
    button.addEventListener("click", () => {
      state.filter = filter.key;
      document.querySelectorAll(".filter-chip").forEach((chip) => {
        chip.classList.toggle("active", chip.dataset.filter === state.filter);
      });
      renderFeed();
    });
    filterRow.appendChild(button);
  });

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      state.query = event.target.value.trim().toLowerCase();
      renderFeed();
    });
  }

  data.sources.forEach((source) => {
    const card = document.createElement("article");
    card.className = "source-card";
    card.innerHTML = `
      <div class="source-type">${source.type}</div>
      <h3>${source.title}</h3>
      <span class="source-article">${source.article}</span>
      <p>${source.note}</p>
      <a href="${source.url}" target="_blank" rel="noreferrer">원문 바로가기</a>
    `;
    sourceList.appendChild(card);
  });

  function renderFeed() {
    const items = data.feed.filter((item) => {
      const matchesFilter = state.filter === "all" || item.type === state.filter;
      const haystack = `${item.title} ${item.summary} ${item.impact}`.toLowerCase();
      const matchesQuery = !state.query || haystack.includes(state.query);
      return matchesFilter && matchesQuery;
    });

    feedList.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "조건에 맞는 항목이 없습니다.";
      feedList.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = `feed-card ${item.tone}`;
      const typeMap = {
        standard: "국제표준",
        index: "국제지표",
        foreign: "외신기준",
        guide: "구제경로",
        method: "검증규칙"
      };
      card.innerHTML = `
        <div>
          <div class="feed-top">
            <div>
              <div class="feed-type">${typeMap[item.type] || item.type}</div>
              <h3>${item.title}</h3>
            </div>
            <div class="feed-date">${item.date}</div>
          </div>
          <p>${item.summary}</p>
          <span class="feed-impact ${item.effect}">${item.impact}</span>
        </div>
        <a class="feed-link" href="${item.url}" target="_blank" rel="noreferrer">출처 열기</a>
      `;
      feedList.appendChild(card);
    });
  }

  function renderParticipationIntro() {
    data.participation.rules.forEach((rule) => {
      const item = document.createElement("li");
      item.textContent = rule;
      participationRules.appendChild(item);
    });

    data.participation.steps.forEach((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      participationSteps.appendChild(item);
    });

    data.participation.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      reportCategory.appendChild(option);
    });

    data.participation.exposureLevels.forEach((level) => {
      const option = document.createElement("option");
      option.value = level;
      option.textContent = level;
      reportExposure.appendChild(option);
    });

    if (publicVerificationRules) {
      data.participation.publicRules.forEach((rule) => {
        const item = document.createElement("li");
        item.textContent = rule;
        publicVerificationRules.appendChild(item);
      });
    }

    if (authRules) {
      data.participation.accessControl.rules.forEach((rule) => {
        const item = document.createElement("li");
        item.textContent = rule;
        authRules.appendChild(item);
      });
    }

    if (authRoleTarget) {
      data.participation.accessControl.roles.forEach((role) => {
        const option = document.createElement("option");
        option.value = role.key;
        option.textContent = role.label;
        authRoleTarget.appendChild(option);
      });
    }

    if (authDemoKeys) {
      data.participation.accessControl.setupNotes.forEach((note) => {
        const item = document.createElement("div");
        item.className = "demo-key-item";
        item.innerHTML = `<span>${escapeHtml(note)}</span>`;
        authDemoKeys.appendChild(item);
      });
    }

    if (anonymousBoardRules) {
      data.participation.anonymousBoard.rules.forEach((rule) => {
        const item = document.createElement("li");
        item.textContent = rule;
        anonymousBoardRules.appendChild(item);
      });
    }

    if (boardCategory) {
      data.participation.anonymousBoard.categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        boardCategory.appendChild(option);
      });
    }
  }

  function setAuthStatus(message, isError) {
    if (!authStatus) {
      return;
    }
    authStatus.textContent = message;
    authStatus.style.color = isError ? "var(--danger)" : "var(--calm)";
  }

  function renderAuthPanel() {
    if (!authSummary) {
      return;
    }

    const authState = getAuthState();
    const session = getStoredSession();
    const roleConfig = session ? getRoleConfig(session.role) : null;
    const canOperate = isOperatorSession(session);
    const reviewerOpen = Boolean(authState.registration && authState.registration.reviewer && authState.registration.reviewer.enabled);
    const operatorOpen = Boolean(authState.registration && authState.registration.operator && authState.registration.operator.enabled);
    const passkeyReady = isPasskeySupported();
    const countSummary = `운영자 ${authState.counts && authState.counts.operator ? authState.counts.operator : 0} / 검토자 ${authState.counts && authState.counts.reviewer ? authState.counts.reviewer : 0}`;

    if (exportReportsButton) {
      exportReportsButton.disabled = !canOperate;
    }

    if (clearReportsButton) {
      clearReportsButton.disabled = !canOperate;
    }

    if (!session) {
      authSummary.innerHTML = `
        <div class="auth-role-row">
          <span class="auth-badge viewer">비로그인</span>
          <span class="auth-badge ${reviewerOpen ? "reviewer" : "viewer"}">검토자 등록 ${reviewerOpen ? "열림" : "닫힘"}</span>
          <span class="auth-badge ${operatorOpen ? "operator" : "viewer"}">운영자 등록 ${operatorOpen ? "열림" : "닫힘"}</span>
        </div>
        <div class="auth-meta-row">
          <span>${escapeHtml(countSummary)}</span>
          <span>${passkeyReady ? "패스키 사용 가능" : "이 브라우저 또는 연결에서는 패스키를 쓸 수 없습니다."}</span>
        </div>
        <p class="citizen-note">현재는 공개 열람과 익명 제보만 가능합니다. 검토표와 운영 큐 제어는 패스키 로그인 후 열립니다.</p>
      `;
      return;
    }

    authSummary.innerHTML = `
      <div class="auth-role-row">
        <span class="auth-badge ${escapeHtml(session.role)}">${escapeHtml(roleConfig ? roleConfig.label : session.role)}</span>
        <span class="auth-badge viewer">${escapeHtml(session.alias)}</span>
      </div>
      <div class="auth-meta-row">
        <span>로그인: ${escapeHtml(toDateLabel(session.createdAt))}</span>
        <span>만료: ${escapeHtml(toDateLabel(session.expiresAt))}</span>
        <span>${escapeHtml(countSummary)}</span>
      </div>
      <p class="citizen-note">${escapeHtml(roleConfig ? roleConfig.summary : "권한 설명 없음")}</p>
    `;
  }

  function renderAuditLog() {
    if (!auditList || !auditStats) {
      return;
    }

    const entries = getStoredAuditLog();
    const loginCount = entries.filter((entry) => entry.action === "login").length;
    const voteCount = entries.filter((entry) => entry.action === "review-vote").length;
    const operatorCount = entries.filter((entry) => entry.actorRole === "operator").length;

    const stats = [
      { label: "최근 로그", value: `${entries.length}` },
      { label: "로그인", value: `${loginCount}` },
      { label: "검토자 표결", value: `${voteCount}` },
      { label: "운영자 동작", value: `${operatorCount}` }
    ];

    auditStats.innerHTML = "";
    stats.forEach((stat) => {
      const card = document.createElement("div");
      card.className = "queue-stat";
      card.innerHTML = `
        <span class="queue-stat-label">${stat.label}</span>
        <strong class="queue-stat-value">${stat.value}</strong>
      `;
      auditStats.appendChild(card);
    });

    auditList.innerHTML = "";
    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "아직 감사 로그가 없습니다.";
      auditList.appendChild(empty);
      return;
    }

    entries.slice(0, 12).forEach((entry) => {
      const actorLabel = entry.actorRole === "public"
        ? "공개"
        : (getRoleConfig(entry.actorRole)?.label || entry.actorRole);
      const item = document.createElement("article");
      item.className = "audit-item";
      item.innerHTML = `
        <div class="audit-meta">
          <span class="auth-badge ${escapeHtml(entry.actorRole)}">${escapeHtml(actorLabel)}</span>
          <span>${escapeHtml(entry.actorAlias)}</span>
          <span>${escapeHtml(toDateLabel(entry.createdAt))}</span>
        </div>
        <p><strong>${escapeHtml(entry.action)}</strong> · ${escapeHtml(entry.detail)}</p>
      `;
      auditList.appendChild(item);
    });
  }

  function setBoardStatus(message, isError) {
    if (!boardStatus) {
      return;
    }
    boardStatus.textContent = message;
    boardStatus.style.color = isError ? "var(--danger)" : "var(--calm)";
  }

  function renderBoardStats(posts) {
    if (!boardStats) {
      return;
    }

    const totalComments = posts.reduce((sum, post) => sum + post.comments.length, 0);
    const totalReactions = posts.reduce((sum, post) => sum + Object.keys(post.reactions || {}).length, 0);
    const taggedCount = posts.filter((post) => post.tag).length;

    const stats = [
      { label: "총 글", value: `${posts.length}` },
      { label: "총 반응", value: `${totalReactions}` },
      { label: "총 댓글", value: `${totalComments}` },
      { label: "태그 사용", value: `${taggedCount}` }
    ];

    boardStats.innerHTML = "";
    stats.forEach((stat) => {
      const card = document.createElement("div");
      card.className = "queue-stat";
      card.innerHTML = `
        <span class="queue-stat-label">${stat.label}</span>
        <strong class="queue-stat-value">${stat.value}</strong>
      `;
      boardStats.appendChild(card);
    });
  }

  function renderBoardList() {
    if (!boardList) {
      return;
    }

    const visitorId = getVerifierId();
    const posts = getStoredBoardPosts().sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

    renderBoardStats(posts);
    boardList.innerHTML = "";

    if (!posts.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "아직 등록된 익명 게시글이 없습니다.";
      boardList.appendChild(empty);
      return;
    }

    posts.forEach((post) => {
      const card = document.createElement("article");
      card.className = "board-post-card";
      const reactionCounts = getBoardReactionCounts(post);
      const currentReaction = post.reactions[visitorId] || "";
      const comments = post.comments
        .slice()
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .map((comment) => {
          return `
            <div class="comment-item">
              <div class="comment-meta">
                <span>${escapeHtml(comment.alias || "익명")}</span>
                <span>${escapeHtml(toDateLabel(comment.createdAt))}</span>
              </div>
              <p>${escapeHtml(comment.body)}</p>
            </div>
          `;
        })
        .join("");
      const reactionButtons = data.participation.anonymousBoard.reactions
        .map((reaction) => {
          return `
            <button
              class="vote-button${currentReaction === reaction.key ? " active" : ""}"
              type="button"
              data-board-action="react"
              data-id="${escapeHtml(post.id)}"
              data-reaction="${reaction.key}"
            >
              <strong>${reaction.label} ${reactionCounts[reaction.key] || 0}</strong>
              <small>${reaction.description}</small>
            </button>
          `;
        })
        .join("");

      card.innerHTML = `
        <div class="report-top">
          <div class="report-headline">
            <div>
              <p class="card-kicker">${escapeHtml(post.category)}</p>
              <h3>${escapeHtml(post.title)}</h3>
            </div>
          </div>
          <div class="report-actions">
            <span class="board-badge">${escapeHtml(post.alias || "익명")}</span>
            <span class="board-badge">${escapeHtml(toDateLabel(post.createdAt))}</span>
          </div>
        </div>
        <div class="board-tag-row">
          ${post.tag ? `<span class="board-badge">#${escapeHtml(post.tag)}</span>` : ""}
          <span class="board-badge">댓글 ${post.comments.length}</span>
        </div>
        <p class="board-post-body">${escapeHtml(post.body)}</p>
        <div class="board-reaction-strip">
          ${data.participation.anonymousBoard.reactions
            .map((reaction) => {
              return `<span class="public-verdict ${reaction.key === "agree" ? "support" : reaction.key === "needs_evidence" ? "needs_more" : "doubt"}">${reaction.label} ${reactionCounts[reaction.key] || 0}</span>`;
            })
            .join("")}
        </div>
        <div class="public-vote-box">
          <p class="card-kicker">Board Reaction</p>
          <div class="vote-grid">${reactionButtons}</div>
        </div>
        <div class="comment-box">
          <p class="card-kicker">Anonymous Reply</p>
          <form class="comment-form" data-board-action="comment" data-id="${escapeHtml(post.id)}">
            <input name="board_comment_alias" type="text" maxlength="24" placeholder="별칭(비워두면 익명)">
            <textarea name="board_comment_body" rows="3" maxlength="400" placeholder="익명 댓글을 남겨주세요" required></textarea>
            <button class="report-button" type="submit">댓글 추가</button>
          </form>
          <div class="comment-list">
            ${comments || `<p class="report-note">아직 댓글이 없습니다.</p>`}
          </div>
        </div>
      `;

      boardList.appendChild(card);
    });
  }

  function initSectionQuickNav() {
    if (!sectionQuickLinks.length) {
      return;
    }

    const trackedSections = sectionQuickLinks
      .map((link) => {
        const id = link.dataset.sectionLink;
        const node = byId(id);
        return node ? { id, node } : null;
      })
      .filter(Boolean);

    if (!trackedSections.length) {
      return;
    }

    const updateActiveSection = () => {
      const checkpoint = window.scrollY + window.innerHeight * 0.32;
      let currentId = trackedSections[0].id;

      trackedSections.forEach((section) => {
        if (section.node.offsetTop <= checkpoint) {
          currentId = section.id;
        }
      });

      setActiveSectionLink(currentId);
    };

    sectionQuickLinks.forEach((link) => {
      link.addEventListener("click", () => {
        setActiveSectionLink(link.dataset.sectionLink);
      });
    });

    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    updateActiveSection();
  }

  function renderReportStats(reports) {
    reportStats.innerHTML = "";

    const reviewedCount = reports.filter((report) => report.reviewed).length;
    const publicCount = reports.filter((report) => report.publishedAt).length;
    const averageScore = reports.length
      ? Math.round(reports.reduce((sum, report) => sum + report.verificationScore, 0) / reports.length)
      : 0;

    const stats = [
      { label: "총 제보", value: `${reports.length}` },
      { label: "검토 완료", value: `${reviewedCount}` },
      { label: "공개 중", value: `${publicCount}` },
      { label: "평균 검증점수", value: `${averageScore}` }
    ];

    stats.forEach((stat) => {
      const card = document.createElement("div");
      card.className = "queue-stat";
      card.innerHTML = `
        <span class="queue-stat-label">${stat.label}</span>
        <strong class="queue-stat-value">${stat.value}</strong>
      `;
      reportStats.appendChild(card);
    });
  }

  function renderPublicBoardStats(reports) {
    if (!publicBoardStats) {
      return;
    }

    const publishedReports = reports.filter((report) => report.publishedAt);
    const totalSignals = publishedReports.reduce((sum, report) => sum + getVoteTotal(report.communityVotes), 0);
    const totalReviewVotes = publishedReports.reduce((sum, report) => sum + getVoteTotal(report.reviewVotes), 0);
    const totalComments = publishedReports.reduce((sum, report) => sum + report.communityComments.length, 0);
    const stats = [
      { label: "공개 제보", value: `${publishedReports.length}` },
      { label: "공개 신호", value: `${totalSignals}` },
      { label: "검토자 표결", value: `${totalReviewVotes}` },
      { label: "공개 메모", value: `${totalComments}` }
    ];

    publicBoardStats.innerHTML = "";
    stats.forEach((stat) => {
      const card = document.createElement("div");
      card.className = "queue-stat";
      card.innerHTML = `
        <span class="queue-stat-label">${stat.label}</span>
        <strong class="queue-stat-value">${stat.value}</strong>
      `;
      publicBoardStats.appendChild(card);
    });
  }

  function renderPublicBoard() {
    if (!publicBoardList) {
      return;
    }

    const session = getStoredSession();
    const verifierId = getVerifierId();
    const reports = getStoredReports()
      .filter((report) => report.publishedAt)
      .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime());

    renderPublicBoardStats(getStoredReports());
    publicBoardList.innerHTML = "";

    if (!reports.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "아직 익명 공개된 제보가 없습니다.";
      publicBoardList.appendChild(empty);
      return;
    }

    reports.forEach((report) => {
      const card = document.createElement("article");
      card.className = "report-card public-card";

      const publicSignalCounts = getPublicSignalCounts(report);
      const reviewVoteCounts = getReviewVoteCounts(report);
      const consensus = getReviewConsensus(report);
      const currentVote = report.communityVotes[verifierId] || "";
      const currentReviewVote = session && report.reviewVotes[session.id] ? report.reviewVotes[session.id].voteKey : "";
      const canReview = isReviewerSession(session);
      const proof = report.checks.length
        ? report.checks.map((item) => `<span class="report-flag">${escapeHtml(item)}</span>`).join("")
        : `<span class="report-flag">검증 단서 없음</span>`;
      const publicLinks =
        report.exposure === "익명 공개 가능"
          ? [
              report.sourceUrl
                ? `<a href="${escapeHtml(report.sourceUrl)}" target="_blank" rel="noreferrer">원본 링크</a>`
                : "",
              report.mirrorUrl
                ? `<a href="${escapeHtml(report.mirrorUrl)}" target="_blank" rel="noreferrer">미러 링크</a>`
                : ""
            ]
              .filter(Boolean)
              .join(" · ")
          : "";
      const publicNote =
        report.exposure === "요약만 공개 가능"
          ? `<p class="report-note"><strong>공개 제한:</strong> 요약만 공개되며 세부 원자료 링크는 비공개입니다.</p>`
          : report.evidenceNote
            ? `<p class="report-note"><strong>공개 검증 메모:</strong> ${escapeHtml(report.evidenceNote)}</p>`
            : "";
      const comments = report.communityComments
        .slice()
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .map((comment) => {
          const vote = getVerdictOption(comment.voteKey);
          const verdictLabel = vote ? vote.label : "메모";
          return `
            <div class="comment-item${comment.trusted ? " reviewer-comment" : ""}">
              <div class="comment-meta">
                <span>${escapeHtml(comment.alias || "익명 참여자")}</span>
                <span>${escapeHtml(toDateLabel(comment.createdAt))}</span>
                <span>${escapeHtml(comment.authorRole === "public" ? "공개 메모" : "검토자 메모")}</span>
                <span>${escapeHtml(verdictLabel)}</span>
              </div>
              <p>${escapeHtml(comment.note)}</p>
            </div>
          `;
        })
        .join("");
      const publicSignalButtons = data.participation.verdictOptions
        .map((option) => {
          return `
            <button
              class="vote-button${currentVote === option.key ? " active" : ""}"
              type="button"
              data-public-action="signal"
              data-id="${escapeHtml(report.id)}"
              data-vote="${option.key}"
            >
              <strong>${option.label} ${publicSignalCounts[option.key] || 0}</strong>
              <small>공개 참고 신호</small>
            </button>
          `;
        })
        .join("");
      const reviewerVoteButtons = data.participation.verdictOptions
        .map((option) => {
          return `
            <button
              class="vote-button${currentReviewVote === option.key ? " active" : ""}"
              type="button"
              data-public-action="review-vote"
              data-id="${escapeHtml(report.id)}"
              data-vote="${option.key}"
              ${canReview ? "" : "disabled"}
            >
              <strong>${option.label} ${reviewVoteCounts[option.key] || 0}</strong>
              <small>${option.description}</small>
            </button>
          `;
        })
        .join("");

      card.innerHTML = `
        <div class="report-top">
          <div class="report-headline">
            <div>
              <p class="card-kicker">${escapeHtml(report.category)}</p>
              <h3>${escapeHtml(getPublicTitle(report))}</h3>
            </div>
          </div>
          <div class="report-actions">
            <span class="report-chip">익명 공개</span>
            <span class="report-score ${consensus.key}">${escapeHtml(consensus.label)}</span>
          </div>
        </div>
        <div class="report-meta">
          <span>발생: ${escapeHtml(toDateLabel(report.observedAt))}</span>
          <span>공개: ${escapeHtml(toDateLabel(report.publishedAt))}</span>
          <span>장소: ${escapeHtml(redactLocation(report.location))}</span>
          <span>공개 신호: ${getVoteTotal(report.communityVotes)}</span>
          <span>검토자 표결: ${getVoteTotal(report.reviewVotes)}</span>
        </div>
        <p>${escapeHtml(report.summary)}</p>
        <div class="report-proof">${proof}</div>
        <div class="report-verdict-strip">
          ${data.participation.verdictOptions
            .map((option) => {
              return `<span class="public-verdict ${option.key}">공개 ${option.label} ${publicSignalCounts[option.key] || 0}</span>`;
            })
            .join("")}
        </div>
        <div class="report-verdict-strip">
          ${data.participation.verdictOptions
            .map((option) => {
              return `<span class="public-verdict ${option.key}">검토 ${option.label} ${reviewVoteCounts[option.key] || 0}</span>`;
            })
            .join("")}
        </div>
        <p class="report-note"><strong>현재 합의:</strong> ${escapeHtml(consensus.detail)}</p>
        ${publicLinks ? `<div class="report-links">${publicLinks}</div>` : ""}
        ${publicNote}
        <div class="board-split">
          <div class="public-vote-box">
            <p class="card-kicker">Public Signal</p>
            <div class="vote-grid">${publicSignalButtons}</div>
            <p class="signal-note">공개 신호는 참고치이며, 최종 상태를 직접 바꾸지 않습니다.</p>
          </div>
          <div class="public-vote-box${canReview ? "" : " locked"}">
            <p class="card-kicker">Reviewer Vote</p>
            <div class="vote-grid">${reviewerVoteButtons}</div>
            <p class="signal-note">${canReview ? "로그인된 검토자 표결만 카드 합의 상태에 반영됩니다." : "검토자 표결은 로그인 후에만 열립니다."}</p>
          </div>
        </div>
        <div class="comment-box">
          <p class="card-kicker">Verification Note</p>
          <form class="comment-form" data-public-action="comment" data-id="${escapeHtml(report.id)}">
            <input name="comment_alias" type="text" maxlength="30" placeholder="표시용 별칭(선택)">
            <textarea name="comment_note" rows="3" maxlength="400" placeholder="판단 근거나 추가 자료 필요 사유를 남겨주세요" required></textarea>
            <button class="report-button" type="submit">메모 추가</button>
          </form>
          <div class="comment-list">
            ${comments || `<p class="report-note">아직 공개 검증 메모가 없습니다.</p>`}
          </div>
        </div>
      `;

      publicBoardList.appendChild(card);
    });
  }

  function renderReportList() {
    const session = getStoredSession();
    const canOperate = isOperatorSession(session);
    const reports = getStoredReports().sort((left, right) => {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

    renderReportStats(reports);
    reportList.innerHTML = "";

    if (!reports.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "아직 저장된 시민 제보가 없습니다.";
      reportList.appendChild(empty);
      return;
    }

    reports.forEach((report) => {
      const card = document.createElement("article");
      card.className = "report-card";

      const proof = report.checks.length
        ? report.checks.map((item) => `<span class="report-flag">${escapeHtml(item)}</span>`).join("")
        : `<span class="report-flag">검증 단서 없음</span>`;

      const links = [
        report.sourceUrl
          ? `<a href="${escapeHtml(report.sourceUrl)}" target="_blank" rel="noreferrer">원본 링크</a>`
          : "",
        report.mirrorUrl
          ? `<a href="${escapeHtml(report.mirrorUrl)}" target="_blank" rel="noreferrer">미러 링크</a>`
          : ""
      ]
        .filter(Boolean)
        .join(" · ");

      const scoreTone = getScoreTone(report.verificationScore);
      const alias = report.alias ? escapeHtml(report.alias) : "익명";
      const location = report.location ? escapeHtml(report.location) : "장소 미기재";
      const canPublish = report.exposure !== "운영자만 검토";
      const fileNote = report.fileNote ? `<p class="report-note"><strong>원본 파일 메모:</strong> ${escapeHtml(report.fileNote)}</p>` : "";
      const evidenceNote = report.evidenceNote
        ? `<p class="report-note"><strong>검증 메모:</strong> ${escapeHtml(report.evidenceNote)}</p>`
        : "";
      const publishButton = canPublish
        ? `<button class="report-button" type="button" data-action="${report.publishedAt ? "unpublish" : "publish"}" data-id="${escapeHtml(report.id)}" ${canOperate ? "" : "disabled"}>${report.publishedAt ? "공개 해제" : "익명 공개"}</button>`
        : `<button class="report-button" type="button" disabled>비공개 전용</button>`;

      card.innerHTML = `
        <div class="report-top">
          <div class="report-headline">
            <div>
              <p class="card-kicker">${escapeHtml(report.category)}</p>
              <h3>${escapeHtml(report.title)}</h3>
            </div>
          </div>
          <div class="report-actions">
            <span class="report-chip${report.reviewed ? " reviewed" : ""}">${report.reviewed ? "검토 완료" : "검토 대기"}</span>
            <span class="report-score ${scoreTone}">검증 ${report.verificationScore}</span>
          </div>
        </div>
        <div class="report-meta">
          <span>발생: ${escapeHtml(toDateLabel(report.observedAt))}</span>
          <span>저장: ${escapeHtml(toDateLabel(report.createdAt))}</span>
          <span>장소: ${location}</span>
          <span>별칭: ${alias}</span>
          <span>공개수준: ${escapeHtml(report.exposure)}</span>
          <span>공개상태: ${report.publishedAt ? `공개 중 (${escapeHtml(toDateLabel(report.publishedAt))})` : "비공개"}</span>
        </div>
        <p>${escapeHtml(report.summary)}</p>
        <div class="report-proof">${proof}</div>
        ${links ? `<div class="report-links">${links}</div>` : ""}
        ${fileNote}
        ${evidenceNote}
        ${canOperate ? "" : `<p class="report-note"><strong>운영 제한:</strong> 공개 전환, 검토 토글, 삭제는 운영자 로그인 후에만 가능합니다.</p>`}
        <div class="report-actions">
          ${publishButton}
          <button class="report-button" type="button" data-action="toggle-review" data-id="${escapeHtml(report.id)}" ${canOperate ? "" : "disabled"}>${report.reviewed ? "검토 해제" : "검토 완료"}</button>
          <button class="report-button danger-ghost" type="button" data-action="delete" data-id="${escapeHtml(report.id)}" ${canOperate ? "" : "disabled"}>삭제</button>
        </div>
      `;

      reportList.appendChild(card);
    });
  }

  function setReportStatus(message, isError) {
    reportStatus.textContent = message;
    reportStatus.style.color = isError ? "var(--danger)" : "var(--calm)";
  }

  async function handleReportSubmit(event) {
    event.preventDefault();

    const checks = Array.from(document.querySelectorAll('input[name="verification_check"]:checked')).map((input) => input.value);
    const title = byId("report-title").value.trim();
    const observedAt = byId("report-observed-at").value;
    const summary = byId("report-summary").value.trim();
    const sourceUrl = byId("report-source-url").value.trim();
    const evidenceNote = byId("report-evidence-note").value.trim();

    if (!title || !observedAt || !summary) {
      setReportStatus("필수 항목을 모두 입력해야 합니다.", true);
      return;
    }

    if (!sourceUrl && !evidenceNote) {
      setReportStatus("원본 링크 또는 검증 메모 중 하나는 필요합니다.", true);
      return;
    }

    const report = {
      id: createId(),
      category: reportCategory.value,
      exposure: reportExposure.value,
      title,
      observedAt,
      location: byId("report-location").value.trim(),
      sourceUrl,
      mirrorUrl: byId("report-mirror-url").value.trim(),
      alias: byId("report-alias").value.trim(),
      fileNote: byId("report-file-note").value.trim(),
      summary,
      evidenceNote,
      checks,
      verificationScore: getVerificationScore(checks),
      reviewed: false,
      publishedAt: "",
      communityVotes: {},
      reviewVotes: {},
      communityComments: [],
      createdAt: new Date().toISOString()
    };

    try {
      if (isBackendMode()) {
        await createReportRecord(report);
      } else {
        const reports = getStoredReports();
        reports.unshift(report);
        saveStoredReports(reports);
      }

      reportForm.reset();
      reportCategory.selectedIndex = 0;
      reportExposure.selectedIndex = 0;
      await tryAppendAuditLog("report-submit", `${report.title} 제보 등록`, null, report.id);

      if (!isBackendMode()) {
        renderReportList();
        renderPublicBoard();
        renderAuditLog();
      }

      setReportStatus(isBackendMode() ? "제보를 공유 큐에 저장했습니다." : "제보를 로컬 큐에 저장했습니다.", false);
    } catch (error) {
      setReportStatus(isBackendMode() ? `공유 저장에 실패했습니다. ${error.message}` : "로컬 저장에 실패했습니다.", true);
    }
  }

  async function handleReportListClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const session = getStoredSession();
    if (!isOperatorSession(session)) {
      setReportStatus("운영자 로그인 후에만 큐 상태를 바꿀 수 있습니다.", true);
      return;
    }

    const action = button.dataset.action;
    const reportId = button.dataset.id;
    const reports = getStoredReports();
    const index = reports.findIndex((report) => report.id === reportId);

    if (index === -1) {
      return;
    }

    try {
      if (action === "publish") {
        if (reports[index].exposure === "운영자만 검토") {
          setReportStatus("이 제보는 비공개 전용으로 저장돼 공개할 수 없습니다.", true);
          return;
        }

        if (isBackendMode()) {
          await publishReportRecord(reportId);
        } else {
          reports[index].publishedAt = new Date().toISOString();
          saveStoredReports(reports);
        }

        await tryAppendAuditLog("publish", `${reports[index].title} 공개`, session, reports[index].id);
        if (!isBackendMode()) {
          renderReportList();
          renderPublicBoard();
          renderAuditLog();
        }
        setReportStatus("제보를 익명 공개 보드에 올렸습니다.", false);
        return;
      }

      if (action === "unpublish") {
        if (isBackendMode()) {
          await unpublishReportRecord(reportId);
        } else {
          reports[index].publishedAt = "";
          saveStoredReports(reports);
        }

        await tryAppendAuditLog("unpublish", `${reports[index].title} 공개 해제`, session, reports[index].id);
        if (!isBackendMode()) {
          renderReportList();
          renderPublicBoard();
          renderAuditLog();
        }
        setReportStatus("제보를 공개 보드에서 내렸습니다.", false);
        return;
      }

      if (action === "toggle-review") {
        if (isBackendMode()) {
          await toggleReviewRecord(reportId);
        } else {
          reports[index].reviewed = !reports[index].reviewed;
          saveStoredReports(reports);
        }

        const nextReviewed = isBackendMode() ? !reports[index].reviewed : reports[index].reviewed;
        await tryAppendAuditLog(
          "review-toggle",
          `${reports[index].title} ${nextReviewed ? "검토 완료" : "검토 해제"}`,
          session,
          reports[index].id
        );
        if (!isBackendMode()) {
          renderReportList();
          renderPublicBoard();
          renderAuditLog();
        }
        return;
      }

      if (action === "delete") {
        const shouldDelete = window.confirm(`${isBackendMode() ? "이 제보를 공유 큐에서 삭제할까요?" : "이 제보를 로컬 큐에서 삭제할까요?"}`);
        if (!shouldDelete) {
          return;
        }

        if (isBackendMode()) {
          await deleteReportRecord(reportId);
        } else {
          reports.splice(index, 1);
          saveStoredReports(reports);
        }

        await tryAppendAuditLog("delete", `${reportId} 제보 삭제`, session, reportId);
        if (!isBackendMode()) {
          renderReportList();
          renderPublicBoard();
          renderAuditLog();
        }
      }
    } catch (error) {
      setReportStatus(`큐 상태 변경에 실패했습니다. ${error.message}`, true);
    }
  }

  async function handlePublicBoardClick(event) {
    const button = event.target.closest("button[data-public-action]");
    if (!button) {
      return;
    }

    const reportId = button.dataset.id;
    const voteKey = button.dataset.vote;
    const action = button.dataset.publicAction;
    const reports = getStoredReports();
    const index = reports.findIndex((report) => report.id === reportId && report.publishedAt);

    if (index === -1 || !getVerdictOption(voteKey)) {
      return;
    }

    try {
      if (action === "signal") {
        const verifierId = getVerifierId();

        if (isBackendMode()) {
          await submitPublicSignal(reportId, verifierId, voteKey);
        } else {
          reports[index].communityVotes = {
            ...reports[index].communityVotes,
            [verifierId]: voteKey
          };
          saveStoredReports(reports);
        }

        await tryAppendAuditLog("public-signal", `${reports[index].title} 공개 신호 ${voteKey}`, null, reports[index].id);
        if (!isBackendMode()) {
          renderReportList();
          renderPublicBoard();
          renderAuditLog();
        }
        setReportStatus("공개 신호를 반영했습니다.", false);
        return;
      }

      if (action === "review-vote") {
        const session = getStoredSession();
        if (!isReviewerSession(session)) {
          setReportStatus("검토자 또는 운영자 로그인 후에만 최종 검토표를 행사할 수 있습니다.", true);
          return;
        }

        const roleConfig = getRoleConfig(session.role);
        if (isBackendMode()) {
          await submitReviewVote(reportId, session, voteKey, roleConfig ? roleConfig.weight : 1);
        } else {
          reports[index].reviewVotes = {
            ...reports[index].reviewVotes,
            [session.id]: {
              alias: session.alias,
              role: session.role,
              voteKey,
              weight: roleConfig ? roleConfig.weight : 1,
              votedAt: new Date().toISOString()
            }
          };
          saveStoredReports(reports);
        }

        await tryAppendAuditLog("review-vote", `${reports[index].title} 검토표 ${voteKey}`, session, reports[index].id);
        if (!isBackendMode()) {
          renderReportList();
          renderPublicBoard();
          renderAuditLog();
        }
        setReportStatus("검토자 표결을 반영했습니다.", false);
      }
    } catch (error) {
      setReportStatus(`공개 보드 반영에 실패했습니다. ${error.message}`, true);
    }
  }

  async function handlePublicBoardSubmit(event) {
    const form = event.target.closest('form[data-public-action="comment"]');
    if (!form) {
      return;
    }

    event.preventDefault();

    const reportId = form.dataset.id;
    const reports = getStoredReports();
    const index = reports.findIndex((report) => report.id === reportId && report.publishedAt);

    if (index === -1) {
      setReportStatus("공개된 제보를 찾지 못했습니다.", true);
      return;
    }

    const noteField = form.elements.namedItem("comment_note");
    const aliasField = form.elements.namedItem("comment_alias");
    const note = noteField ? String(noteField.value || "").trim() : "";
    const typedAlias = aliasField ? String(aliasField.value || "").trim() : "";

    if (!note) {
      setReportStatus("공개 검증 메모 내용을 입력해야 합니다.", true);
      return;
    }

    const session = getStoredSession();
    const verifierId = getVerifierId();
    const voteKey = isReviewerSession(session)
      ? reports[index].reviewVotes[session.id]?.voteKey || ""
      : reports[index].communityVotes[verifierId] || "";
    const alias = isReviewerSession(session) ? session.alias : typedAlias;

    const comment = {
      id: createId(),
      alias,
      note,
      voteKey,
      authorRole: session && session.role ? session.role : "public",
      trusted: isReviewerSession(session),
      createdAt: new Date().toISOString()
    };

    try {
      if (isBackendMode()) {
        await submitReportComment(reportId, comment);
      } else {
        reports[index].communityComments.unshift(comment);
        saveStoredReports(reports);
      }

      await tryAppendAuditLog(
        "comment",
        `${reports[index].title} 메모 추가`,
        session && session.role ? session : null,
        reports[index].id
      );

      if (!isBackendMode()) {
        renderPublicBoard();
        renderAuditLog();
      }

      setReportStatus("공개 검증 메모를 추가했습니다.", false);
      form.reset();
    } catch (error) {
      setReportStatus(`메모 추가에 실패했습니다. ${error.message}`, true);
    }
  }

  async function handleBoardPostSubmit(event) {
    event.preventDefault();

    const title = byId("board-title") ? byId("board-title").value.trim() : "";
    const body = byId("board-body") ? byId("board-body").value.trim() : "";

    if (!title || !body) {
      setBoardStatus("제목과 본문을 모두 입력해야 합니다.", true);
      return;
    }

    const post = {
      id: createId(),
      category: boardCategory ? boardCategory.value : "자유 토론",
      alias: byId("board-alias") ? byId("board-alias").value.trim() : "",
      title,
      tag: byId("board-tag") ? byId("board-tag").value.trim() : "",
      body,
      reactions: {},
      comments: [],
      createdAt: new Date().toISOString()
    };

    try {
      if (isBackendMode()) {
        await createBoardPostRecord(post);
      } else {
        const posts = getStoredBoardPosts();
        posts.unshift(post);
        saveStoredBoardPosts(posts);
      }

      await tryAppendAuditLog("board-post", `${post.title} 익명 게시글 등록`, null, post.id);
      if (!isBackendMode()) {
        renderBoardList();
        renderAuditLog();
      }
      setBoardStatus("익명 게시글을 등록했습니다.", false);
      anonymousBoardForm.reset();
      if (boardCategory) {
        boardCategory.selectedIndex = 0;
      }
    } catch (error) {
      setBoardStatus(`게시글 등록에 실패했습니다. ${error.message}`, true);
    }
  }

  async function handleBoardClick(event) {
    const button = event.target.closest('button[data-board-action="react"]');
    if (!button) {
      return;
    }

    const postId = button.dataset.id;
    const reactionKey = button.dataset.reaction;
    const posts = getStoredBoardPosts();
    const index = posts.findIndex((post) => post.id === postId);

    if (index === -1) {
      return;
    }

    const allowed = data.participation.anonymousBoard.reactions.some((reaction) => reaction.key === reactionKey);
    if (!allowed) {
      return;
    }

    const visitorId = getVerifierId();
    try {
      if (isBackendMode()) {
        await submitBoardReaction(postId, visitorId, reactionKey);
      } else {
        posts[index].reactions = {
          ...posts[index].reactions,
          [visitorId]: reactionKey
        };
        saveStoredBoardPosts(posts);
      }

      await tryAppendAuditLog("board-react", `${posts[index].title} 반응 ${reactionKey}`, null, posts[index].id);
      if (!isBackendMode()) {
        renderBoardList();
        renderAuditLog();
      }
      setBoardStatus("익명 게시판 반응을 반영했습니다.", false);
    } catch (error) {
      setBoardStatus(`반응 반영에 실패했습니다. ${error.message}`, true);
    }
  }

  async function handleBoardSubmit(event) {
    const form = event.target.closest('form[data-board-action="comment"]');
    if (!form) {
      return;
    }

    event.preventDefault();

    const postId = form.dataset.id;
    const posts = getStoredBoardPosts();
    const index = posts.findIndex((post) => post.id === postId);

    if (index === -1) {
      setBoardStatus("게시글을 찾지 못했습니다.", true);
      return;
    }

    const bodyField = form.elements.namedItem("board_comment_body");
    const aliasField = form.elements.namedItem("board_comment_alias");
    const body = bodyField ? String(bodyField.value || "").trim() : "";
    const alias = aliasField ? String(aliasField.value || "").trim() : "";

    if (!body) {
      setBoardStatus("댓글 내용을 입력해야 합니다.", true);
      return;
    }

    const comment = {
      id: createId(),
      alias,
      body,
      createdAt: new Date().toISOString()
    };

    try {
      if (isBackendMode()) {
        await submitBoardComment(postId, comment);
      } else {
        posts[index].comments.unshift(comment);
        saveStoredBoardPosts(posts);
      }

      await tryAppendAuditLog("board-comment", `${posts[index].title} 댓글 추가`, null, posts[index].id);
      if (!isBackendMode()) {
        renderBoardList();
        renderAuditLog();
      }
      setBoardStatus("익명 댓글을 추가했습니다.", false);
      form.reset();
    } catch (error) {
      setBoardStatus(`댓글 추가에 실패했습니다. ${error.message}`, true);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (!isBackendMode()) {
      setAuthStatus("패스키 로그인은 동적 배포 서버에서만 동작합니다.", true);
      return;
    }

    if (!isPasskeySupported()) {
      setAuthStatus("이 브라우저 또는 연결에서는 패스키를 사용할 수 없습니다. HTTPS와 최신 브라우저를 확인하세요.", true);
      return;
    }

    const submitter = event.submitter;
    const action = submitter && submitter.dataset.authAction ? submitter.dataset.authAction : "login";
    const alias = authAliasInput ? authAliasInput.value.trim() : "";
    const role = authRoleTarget ? authRoleTarget.value : "";
    const inviteCode = authAccessKeyInput ? authAccessKeyInput.value.trim() : "";

    if (!alias) {
      setAuthStatus("표시 이름을 입력해야 합니다.", true);
      return;
    }

    try {
      if (action === "register") {
        if (!role || !inviteCode) {
          setAuthStatus("등록할 권한과 초대코드를 모두 입력해야 합니다.", true);
          return;
        }

        setAuthStatus("패스키 등록 옵션을 불러오는 중입니다.", false);
        const registerOptionsPayload = await fetchJson("/api/auth/register/options", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            alias,
            role,
            inviteCode
          })
        });
        const credential = await window.navigator.credentials.create({
          publicKey: parseCreationOptions(registerOptionsPayload.options)
        });

        if (!credential) {
          throw new Error("패스키 등록이 취소되었습니다.");
        }

        await apiRequest("/api/auth/register/verify", {
          method: "POST",
          body: {
            alias,
            role,
            response: credentialToJson(credential)
          }
        });

        setAuthStatus("패스키 등록과 로그인을 완료했습니다.", false);
      } else {
        setAuthStatus("패스키 로그인 옵션을 불러오는 중입니다.", false);
        const loginOptionsPayload = await fetchJson("/api/auth/login/options", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({ alias })
        });
        const credential = await window.navigator.credentials.get({
          publicKey: parseRequestOptions(loginOptionsPayload.options)
        });

        if (!credential) {
          throw new Error("패스키 로그인이 취소되었습니다.");
        }

        await apiRequest("/api/auth/login/verify", {
          method: "POST",
          body: {
            alias,
            response: credentialToJson(credential)
          }
        });

        setAuthStatus("패스키 로그인을 완료했습니다.", false);
      }

      renderAuthPanel();
      renderReportList();
      renderPublicBoard();
      renderAuditLog();
      authForm.reset();
      if (authRoleTarget) {
        authRoleTarget.selectedIndex = 0;
      }
    } catch (error) {
      setAuthStatus(error.message || "패스키 처리 중 오류가 발생했습니다.", true);
    }
  }

  async function handleLogout() {
    try {
      if (isBackendMode()) {
        await apiRequest("/api/auth/logout", {
          method: "POST"
        });
      } else {
        clearStoredSession();
      }

      renderAuthPanel();
      renderReportList();
      renderPublicBoard();
      renderAuditLog();
      setAuthStatus("세션을 종료했습니다.", false);
    } catch (error) {
      setAuthStatus(`로그아웃에 실패했습니다. ${error.message}`, true);
    }
  }

  async function exportReports() {
    if (!isOperatorSession(getStoredSession())) {
      setReportStatus("운영자 로그인 후에만 제보 큐를 내보낼 수 있습니다.", true);
      return;
    }

    const reports = getStoredReports();
    if (!reports.length) {
      setReportStatus("내보낼 제보가 없습니다.", true);
      return;
    }

    const blob = new Blob([JSON.stringify(reports, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `citizen-reports-${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    await tryAppendAuditLog("export", "제보 큐 JSON 내보내기", getStoredSession(), "");
    if (!isBackendMode()) {
      renderAuditLog();
    }
    setReportStatus("제보 큐를 JSON으로 내보냈습니다.", false);
  }

  async function clearReports() {
    if (!isOperatorSession(getStoredSession())) {
      setReportStatus("운영자 로그인 후에만 큐를 비울 수 있습니다.", true);
      return;
    }

    const reports = getStoredReports();
    if (!reports.length) {
      setReportStatus(`${isBackendMode() ? "비울 공유 큐가 없습니다." : "비울 로컬 큐가 없습니다."}`, true);
      return;
    }

    const shouldClear = window.confirm(`${isBackendMode() ? "공유 큐의 모든 제보를 삭제할까요?" : "로컬 큐의 모든 제보를 삭제할까요?"}`);
    if (!shouldClear) {
      return;
    }

    try {
      if (isBackendMode()) {
        await clearReportRecords();
      } else {
        window.localStorage.removeItem(REPORT_STORAGE_KEY);
      }

      await tryAppendAuditLog("clear", `${isBackendMode() ? "공유" : "로컬"} 제보 큐 비우기`, getStoredSession(), "");
      if (!isBackendMode()) {
        renderReportList();
        renderPublicBoard();
        renderAuditLog();
      }
      setReportStatus(`${isBackendMode() ? "공유" : "로컬"} 큐를 비웠습니다.`, false);
    } catch (error) {
      setReportStatus(`큐 비우기에 실패했습니다. ${error.message}`, true);
    }
  }

  if (window.__INITIAL_BOOTSTRAP__ && typeof window.__INITIAL_BOOTSTRAP__ === "object") {
    applyBootstrapPayload(window.__INITIAL_BOOTSTRAP__);
  } else {
    refreshDataStatus();
  }

  renderFeed();
  renderParticipationIntro();
  renderAuthPanel();
  renderReportList();
  renderPublicBoard();
  renderBoardList();
  renderAuditLog();
  initSectionQuickNav();

  if (reportForm) {
    reportForm.addEventListener("submit", handleReportSubmit);
  }

  if (authForm) {
    authForm.addEventListener("submit", handleAuthSubmit);
  }

  if (authLogoutButton) {
    authLogoutButton.addEventListener("click", handleLogout);
  }

  if (reportList) {
    reportList.addEventListener("click", handleReportListClick);
  }

  if (publicBoardList) {
    publicBoardList.addEventListener("click", handlePublicBoardClick);
    publicBoardList.addEventListener("submit", handlePublicBoardSubmit);
  }

  if (anonymousBoardForm) {
    anonymousBoardForm.addEventListener("submit", handleBoardPostSubmit);
  }

  if (boardList) {
    boardList.addEventListener("click", handleBoardClick);
    boardList.addEventListener("submit", handleBoardSubmit);
  }

  if (exportReportsButton) {
    exportReportsButton.addEventListener("click", exportReports);
  }

  if (clearReportsButton) {
    clearReportsButton.addEventListener("click", clearReports);
  }

  void bootstrapBackend().then((connected) => {
    if (connected) {
      renderAuthPanel();
      renderReportList();
      renderPublicBoard();
      renderBoardList();
      renderAuditLog();
    }
  });
})();
