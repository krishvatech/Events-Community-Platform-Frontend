export function resolveLiveMeetingParticipantUserId(participant) {
  const parseMeta = (value) => {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return {};
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return {};
      try {
        return JSON.parse(trimmed) || {};
      } catch {
        return {};
      }
    }
    return typeof value === "object" && value ? value : {};
  };

  const collectCandidateIds = (value, results = []) => {
    const parsed = parseMeta(value);
    if (!parsed || typeof parsed !== "object") return results;

    for (const key of ["user_id", "userId", "ecp_user_id", "ecpUserId", "customParticipantId", "clientSpecificId"]) {
      if (Object.prototype.hasOwnProperty.call(parsed, key)) {
        results.push(parsed[key]);
      }
    }

    for (const key of ["metadata", "customParticipantData", "participantData", "profile", "user"]) {
      if (parsed[key] && typeof parsed[key] === "object") {
        collectCandidateIds(parsed[key], results);
      } else if (typeof parsed[key] === "string") {
        collectCandidateIds(parsed[key], results);
      }
    }

    return results;
  };

  const raw = participant?._raw || {};
  const customParticipantData = parseMeta(raw.customParticipantData);
  const metadata = parseMeta(raw.metadata);

  const candidates = [
    raw.user_id,
    raw.userId,
    raw.ecp_user_id,
    raw.ecpUserId,
    raw.customParticipantId,
    raw.clientSpecificId,
    customParticipantData.user_id,
    customParticipantData.userId,
    customParticipantData.ecp_user_id,
    customParticipantData.ecpUserId,
    customParticipantData.customParticipantId,
    customParticipantData.clientSpecificId,
    metadata.user_id,
    metadata.userId,
    metadata.ecp_user_id,
    metadata.ecpUserId,
    metadata.customParticipantId,
    metadata.clientSpecificId,
    participant?.user_id,
    participant?.userId,
    participant?.ecp_user_id,
    participant?.ecpUserId,
    participant?.customParticipantId,
    participant?.clientSpecificId,
    ...collectCandidateIds(raw),
    ...collectCandidateIds(participant?.metadata),
    ...collectCandidateIds(participant?.customParticipantData),
  ];

  for (const candidate of candidates) {
    const numeric = normalizePlatformUserId(candidate);
    if (numeric !== null) return numeric;
  }

  return null;
}

export function normalizePlatformUserId(candidate) {
  if (candidate === null || candidate === undefined || candidate === "") return null;
  const value = typeof candidate === "string" ? candidate.trim() : candidate;
  if (typeof value === "string" && !/^\d+$/.test(value)) return null;
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

export function parseFriendRequestResponseBody(rawBody) {
  if (!rawBody) return {};
  if (typeof rawBody !== "string") return rawBody;
  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
}

const liveMeetingConnectionStatusCache = new Map();

export function clearLiveMeetingConnectionStatusCache() {
  liveMeetingConnectionStatusCache.clear();
}

export function normalizeLiveMeetingConnectionStatus(status) {
  const value = String(status || "none").toLowerCase();
  if (value === "friends" || value === "friend" || value === "connected" || value === "accepted") return "connected";
  if (value === "outgoing_pending" || value === "pending_outgoing") return "pending_outgoing";
  if (value === "incoming_pending" || value === "pending_incoming") return "pending_incoming";
  if (value === "self") return "self";
  return "none";
}

export function cacheLiveMeetingConnectionStatus(userId, statusData) {
  const numericUserId = normalizePlatformUserId(userId);
  if (!numericUserId) return null;
  const normalized = {
    status: normalizeLiveMeetingConnectionStatus(statusData?.status),
    requestId: statusData?.requestId ?? statusData?.request_id ?? statusData?.friend_request_id ?? null,
    userId: numericUserId,
  };
  liveMeetingConnectionStatusCache.set(numericUserId, normalized);
  return normalized;
}

export function getCachedLiveMeetingConnectionStatus(userId) {
  const numericUserId = normalizePlatformUserId(userId);
  return numericUserId ? liveMeetingConnectionStatusCache.get(numericUserId) || null : null;
}

export async function fetchLiveMeetingConnectionStatus({
  participant,
  userId,
  fetchImpl = fetch,
  toApiUrl,
  authHeader = () => ({}),
  logger = console,
  force = false,
}) {
  const validDjangoUserId = normalizePlatformUserId(userId) || resolveLiveMeetingParticipantUserId(participant);

  if (!Number.isInteger(validDjangoUserId) || validDjangoUserId <= 0) {
    return {
      ok: false,
      status: "none",
      requestId: null,
      userId: null,
      invalidTarget: true,
      message: "This participant is not linked to a valid platform user.",
    };
  }

  const cached = getCachedLiveMeetingConnectionStatus(validDjangoUserId);
  if (cached && !force) {
    return { ok: true, cached: true, ...cached };
  }

  const res = await fetchImpl(toApiUrl(`friends/status/?user_id=${validDjangoUserId}`), {
    headers: { accept: "application/json", ...authHeader() },
  });
  const rawBody = await res.text().catch(() => "");
  const data = parseFriendRequestResponseBody(rawBody);

  logger?.debug?.("[LiveMeetingConnect] friendship status response", {
    userId: validDjangoUserId,
    status: res.status,
    ok: res.ok,
    body: data,
  });

  if (!res.ok) {
    return {
      ok: false,
      status: cached?.status || "none",
      requestId: cached?.requestId || null,
      userId: validDjangoUserId,
      data,
      message: friendRequestErrorMessageFromResponse(data, "Failed to load connection status."),
    };
  }

  const normalized = cacheLiveMeetingConnectionStatus(validDjangoUserId, data);
  return { ok: true, data, ...normalized };
}

export function liveMeetingParticipantDisplayName(participant) {
  return participant?.name || participant?.display_name || participant?.user_name || "this participant";
}

export function connectionRequestLoadingMessage(participant) {
  return `Connecting to ${liveMeetingParticipantDisplayName(participant)}...`;
}

export function connectionRequestSentMessage(participant) {
  return `Connection request sent to ${liveMeetingParticipantDisplayName(participant)}.`;
}

export function friendRequestErrorMessageFromResponse(data, fallback = "Failed to send connection request.") {
  if (!data) return fallback;
  if (typeof data === "string") return data || fallback;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) return data.detail.filter(Boolean).join(" ") || fallback;
  if (typeof data.message === "string") return data.message;

  const firstField = Object.values(data).find((value) => (
    typeof value === "string" ||
    (Array.isArray(value) && value.length) ||
    (value && typeof value === "object")
  ));

  if (Array.isArray(firstField)) return firstField.map(String).join(" ");
  if (typeof firstField === "string") return firstField;
  if (firstField && typeof firstField === "object") {
    return friendRequestErrorMessageFromResponse(firstField, fallback);
  }
  return fallback;
}

export async function sendLiveMeetingConnectionRequest({
  participant,
  fetchImpl = fetch,
  toApiUrl,
  authHeader = () => ({}),
  logger = console,
}) {
  const validDjangoUserId = resolveLiveMeetingParticipantUserId(participant);
  const displayName = liveMeetingParticipantDisplayName(participant);

  logger?.debug?.("[LiveMeetingConnect] resolved user id", {
    participantName: displayName,
    resolvedUserId: validDjangoUserId,
  });

  if (!Number.isInteger(validDjangoUserId) || validDjangoUserId <= 0) {
    return {
      ok: false,
      status: null,
      invalidTarget: true,
      message: "This participant is not linked to a valid platform user.",
      userId: null,
    };
  }

  const payload = { to_user: validDjangoUserId };
  logger?.debug?.("[LiveMeetingConnect] sending friend request payload", payload);

  const res = await fetchImpl(toApiUrl("friend-requests/"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  });

  const rawBody = await res.text().catch(() => "");
  const data = parseFriendRequestResponseBody(rawBody);

  logger?.debug?.("[LiveMeetingConnect] friend request response", {
    status: res.status,
    ok: res.ok,
    body: data,
  });

  if (res.ok) {
    const refreshed = await fetchLiveMeetingConnectionStatus({
      participant,
      userId: validDjangoUserId,
      fetchImpl,
      toApiUrl,
      authHeader,
      logger,
      force: true,
    }).catch(() => null);
    return {
      ok: true,
      status: res.status,
      data,
      message: connectionRequestSentMessage(participant),
      userId: validDjangoUserId,
      connectionStatus: refreshed?.status || "pending_outgoing",
      requestId: refreshed?.requestId ?? data?.request_id ?? data?.id ?? null,
    };
  }

  const refreshed = res.status === 400
    ? await fetchLiveMeetingConnectionStatus({
      participant,
      userId: validDjangoUserId,
      fetchImpl,
      toApiUrl,
      authHeader,
      logger,
      force: true,
    }).catch(() => null)
    : null;

  return {
    ok: false,
    status: res.status,
    data,
    message: friendRequestErrorMessageFromResponse(data),
    userId: validDjangoUserId,
    connectionStatus: refreshed?.status || null,
    requestId: refreshed?.requestId ?? null,
    reconciled: Boolean(refreshed?.ok),
  };
}

export async function acceptLiveMeetingConnectionRequest({
  participant,
  userId,
  requestId,
  fetchImpl = fetch,
  toApiUrl,
  authHeader = () => ({}),
  logger = console,
}) {
  const validDjangoUserId = normalizePlatformUserId(userId) || resolveLiveMeetingParticipantUserId(participant);
  let validRequestId = normalizePlatformUserId(requestId);

  if (!Number.isInteger(validDjangoUserId) || validDjangoUserId <= 0) {
    return {
      ok: false,
      status: null,
      invalidTarget: true,
      message: "This participant is not linked to a valid platform user.",
      userId: null,
    };
  }

  if (!validRequestId) {
    const latest = await fetchLiveMeetingConnectionStatus({
      participant,
      userId: validDjangoUserId,
      fetchImpl,
      toApiUrl,
      authHeader,
      logger,
      force: true,
    });
    validRequestId = normalizePlatformUserId(latest?.requestId);
  }

  if (!validRequestId) {
    return {
      ok: false,
      status: null,
      message: "No incoming connection request was found.",
      userId: validDjangoUserId,
      connectionStatus: getCachedLiveMeetingConnectionStatus(validDjangoUserId)?.status || "none",
    };
  }

  const res = await fetchImpl(toApiUrl(`friend-requests/${validRequestId}/accept/`), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
  });
  const rawBody = await res.text().catch(() => "");
  const data = parseFriendRequestResponseBody(rawBody);

  logger?.debug?.("[LiveMeetingConnect] accept request response", {
    userId: validDjangoUserId,
    requestId: validRequestId,
    status: res.status,
    ok: res.ok,
    body: data,
  });

  const refreshed = await fetchLiveMeetingConnectionStatus({
    participant,
    userId: validDjangoUserId,
    fetchImpl,
    toApiUrl,
    authHeader,
    logger,
    force: true,
  }).catch(() => null);

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      data,
      message: "Connection request accepted.",
      userId: validDjangoUserId,
      connectionStatus: refreshed?.status || "connected",
      requestId: refreshed?.requestId ?? null,
    };
  }

  return {
    ok: false,
    status: res.status,
    data,
    message: friendRequestErrorMessageFromResponse(data, "Failed to accept connection request."),
    userId: validDjangoUserId,
    connectionStatus: refreshed?.status || null,
    requestId: refreshed?.requestId ?? validRequestId,
    reconciled: Boolean(refreshed?.ok),
  };
}
