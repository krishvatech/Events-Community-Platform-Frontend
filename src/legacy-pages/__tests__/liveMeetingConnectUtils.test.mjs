import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptLiveMeetingConnectionRequest,
  clearLiveMeetingConnectionStatusCache,
  connectionRequestLoadingMessage,
  connectionRequestSentMessage,
  fetchLiveMeetingConnectionStatus,
  friendRequestErrorMessageFromResponse,
  getCachedLiveMeetingConnectionStatus,
  normalizeLiveMeetingConnectionStatus,
  resolveLiveMeetingParticipantUserId,
  sendLiveMeetingConnectionRequest,
} from "../liveMeetingConnectUtils.js";

test("resolves a valid Django user ID from participant metadata", () => {
  const participant = {
    id: "rtk-uuid-ignored",
    _raw: {
      metadata: JSON.stringify({ profile: { ecp_user_id: "42" } }),
    },
  };

  assert.equal(resolveLiveMeetingParticipantUserId(participant), 42);
});

test("resolves numeric custom participant fields but rejects RTK UUIDs", () => {
  assert.equal(resolveLiveMeetingParticipantUserId({
    id: "8e3939b2-8a90-4c47-ad77-f3dd25cbfb9a",
    _raw: { clientSpecificId: "99" },
  }), 99);

  assert.equal(resolveLiveMeetingParticipantUserId({
    id: "8e3939b2-8a90-4c47-ad77-f3dd25cbfb9a",
    _raw: { customParticipantId: "8e3939b2-8a90-4c47-ad77-f3dd25cbfb9a" },
  }), null);
});

test("rejects an RTK UUID when no platform user metadata exists", () => {
  const participant = {
    id: "8e3939b2-8a90-4c47-ad77-f3dd25cbfb9a",
    _raw: {},
  };

  assert.equal(resolveLiveMeetingParticipantUserId(participant), null);
});

test("formats connect loading and success messages with name and role", () => {
  const participant = { name: "John Doe", role: "Admin", _raw: { customParticipantId: "42" } };

  assert.equal(connectionRequestLoadingMessage(participant), "Connecting to John Doe...");
  assert.equal(connectionRequestSentMessage(participant), "Connection request sent to John Doe.");
});

test("parses duplicate pending request messages from backend 400 details", () => {
  const message = friendRequestErrorMessageFromResponse({
    detail: "You already sent a contact request to this user.",
  });

  assert.equal(message, "You already sent a contact request to this user.");
});

test("uses a clear fallback message for API failures without details", () => {
  const message = friendRequestErrorMessageFromResponse(null, "Network or server error while sending connection request. Please try again.");

  assert.equal(message, "Network or server error while sending connection request. Please try again.");
});

test("sends a valid friend request with a numeric Django user ID", async () => {
  const calls = [];
  const result = await sendLiveMeetingConnectionRequest({
    participant: { name: "Jane Doe", _raw: { user_id: "77" } },
    toApiUrl: (path) => `/api/${path}`,
    authHeader: () => ({ Authorization: "Bearer hidden" }),
    logger: { debug() {} },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 201,
        text: async () => JSON.stringify({ request_id: 10 }),
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.message, "Connection request sent to Jane Doe.");
  assert.equal(calls[0].url, "/api/friend-requests/");
  assert.deepEqual(JSON.parse(calls[0].options.body), { to_user: 77 });
});

test("does not call API when no Django user ID exists", async () => {
  let called = false;
  const result = await sendLiveMeetingConnectionRequest({
    participant: { name: "RTK Only", id: "8e3939b2-8a90-4c47-ad77-f3dd25cbfb9a", _raw: {} },
    toApiUrl: (path) => `/api/${path}`,
    logger: { debug() {} },
    fetchImpl: async () => {
      called = true;
      throw new Error("should not call fetch");
    },
  });

  assert.equal(called, false);
  assert.equal(result.ok, false);
  assert.equal(result.message, "This participant is not linked to a valid platform user.");
});

test("surfaces self-request backend message", async () => {
  const result = await sendLiveMeetingConnectionRequest({
    participant: { name: "Self", _raw: { user_id: 5 } },
    toApiUrl: (path) => `/api/${path}`,
    logger: { debug() {} },
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ detail: "You cannot send a request to yourself." }),
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, "You cannot send a request to yourself.");
});

test("surfaces duplicate pending request backend message", async () => {
  const result = await sendLiveMeetingConnectionRequest({
    participant: { name: "Pending User", _raw: { user_id: 6 } },
    toApiUrl: (path) => `/api/${path}`,
    logger: { debug() {} },
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ detail: "You already sent a contact request to this user." }),
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, "You already sent a contact request to this user.");
});

test("surfaces backend field failure message", async () => {
  const result = await sendLiveMeetingConnectionRequest({
    participant: { name: "Bad User", _raw: { user_id: 404 } },
    toApiUrl: (path) => `/api/${path}`,
    logger: { debug() {} },
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ to_user: ["Invalid user."] }),
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, "Invalid user.");
});

test("normalizes supported connection states", () => {
  assert.equal(normalizeLiveMeetingConnectionStatus("self"), "self");
  assert.equal(normalizeLiveMeetingConnectionStatus("none"), "none");
  assert.equal(normalizeLiveMeetingConnectionStatus("outgoing_pending"), "pending_outgoing");
  assert.equal(normalizeLiveMeetingConnectionStatus("incoming_pending"), "pending_incoming");
  assert.equal(normalizeLiveMeetingConnectionStatus("friends"), "connected");
});

test("fetches self user relationship status from backend", async () => {
  clearLiveMeetingConnectionStatusCache();
  const result = await fetchLiveMeetingConnectionStatus({
    participant: { name: "Self", _raw: { user_id: 5 } },
    toApiUrl: (path) => `/api/${path}`,
    logger: { debug() {} },
    fetchImpl: async (url) => {
      assert.equal(url, "/api/friends/status/?user_id=5");
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: "self" }),
      };
    },
  });

  assert.equal(result.status, "self");
});

test("fetches outgoing pending request status with request ID", async () => {
  clearLiveMeetingConnectionStatusCache();
  const result = await fetchLiveMeetingConnectionStatus({
    participant: { name: "Pending", _raw: { user_id: 6 } },
    toApiUrl: (path) => `/api/${path}`,
    logger: { debug() {} },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: "outgoing_pending", request_id: 12 }),
    }),
  });

  assert.equal(result.status, "pending_outgoing");
  assert.equal(result.requestId, 12);
});

test("fetches incoming pending request status with request ID", async () => {
  clearLiveMeetingConnectionStatusCache();
  const result = await fetchLiveMeetingConnectionStatus({
    participant: { name: "Incoming", _raw: { user_id: 7 } },
    toApiUrl: (path) => `/api/${path}`,
    logger: { debug() {} },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: "incoming_pending", request_id: 13 }),
    }),
  });

  assert.equal(result.status, "pending_incoming");
  assert.equal(result.requestId, 13);
});

test("fetches already connected user status", async () => {
  clearLiveMeetingConnectionStatusCache();
  const result = await fetchLiveMeetingConnectionStatus({
    participant: { name: "Connected", _raw: { user_id: 8 } },
    toApiUrl: (path) => `/api/${path}`,
    logger: { debug() {} },
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ status: "friends" }),
    }),
  });

  assert.equal(result.status, "connected");
});

test("sends new connection request and refreshes backend status", async () => {
  clearLiveMeetingConnectionStatusCache();
  const calls = [];
  const result = await sendLiveMeetingConnectionRequest({
    participant: { name: "New User", _raw: { user_id: 9 } },
    toApiUrl: (path) => `/api/${path}`,
    logger: { debug() {} },
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, method: options.method || "GET" });
      if (options.method === "POST") {
        return {
          ok: true,
          status: 201,
          text: async () => JSON.stringify({ id: 20 }),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: "outgoing_pending", request_id: 20 }),
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.connectionStatus, "pending_outgoing");
  assert.deepEqual(calls.map((call) => call.url), ["/api/friend-requests/", "/api/friends/status/?user_id=9"]);
});

test("accepts incoming request and refreshes connected status", async () => {
  clearLiveMeetingConnectionStatusCache();
  const calls = [];
  const result = await acceptLiveMeetingConnectionRequest({
    participant: { name: "Incoming", _raw: { user_id: 10 } },
    requestId: 30,
    toApiUrl: (path) => `/api/${path}`,
    logger: { debug() {} },
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, method: options.method || "GET" });
      if (url.includes("/accept/")) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ id: 30, status: "accepted" }),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: "friends" }),
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.connectionStatus, "connected");
  assert.deepEqual(calls.map((call) => call.url), ["/api/friend-requests/30/accept/", "/api/friends/status/?user_id=10"]);
});

test("uses Django user ID cache when reopening participant status without force", async () => {
  clearLiveMeetingConnectionStatusCache();
  let calls = 0;
  await fetchLiveMeetingConnectionStatus({
    participant: { name: "Cached", id: "rtk-id", _raw: { user_id: 11 } },
    toApiUrl: (path) => `/api/${path}`,
    logger: { debug() {} },
    fetchImpl: async () => {
      calls += 1;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: "friends" }),
      };
    },
  });

  const cached = await fetchLiveMeetingConnectionStatus({
    participant: { name: "Cached Again", id: "different-rtk-id", _raw: { user_id: 11 } },
    toApiUrl: (path) => `/api/${path}`,
    logger: { debug() {} },
    fetchImpl: async () => {
      calls += 1;
      throw new Error("should use cache");
    },
  });

  assert.equal(calls, 1);
  assert.equal(cached.cached, true);
  assert.equal(cached.status, "connected");
  assert.equal(getCachedLiveMeetingConnectionStatus(11).status, "connected");
});

test("reconciles backend 400 duplicate request by fetching latest status", async () => {
  clearLiveMeetingConnectionStatusCache();
  const result = await sendLiveMeetingConnectionRequest({
    participant: { name: "Duplicate", _raw: { user_id: 12 } },
    toApiUrl: (path) => `/api/${path}`,
    logger: { debug() {} },
    fetchImpl: async (url, options = {}) => {
      if (options.method === "POST") {
        return {
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ detail: "You already sent a contact request to this user." }),
        };
      }
      assert.equal(url, "/api/friends/status/?user_id=12");
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: "outgoing_pending", request_id: 40 }),
      };
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, "You already sent a contact request to this user.");
  assert.equal(result.connectionStatus, "pending_outgoing");
  assert.equal(result.requestId, 40);
  assert.equal(result.reconciled, true);
});
