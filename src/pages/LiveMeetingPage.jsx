// src/pages/LiveMeetingPage.jsx
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  MonitorUp,
  MessageCircle,
  MessageSquare,
  Users2,
  ChevronLeft,
  Dot,
  Video,
  PhoneOff,
  ArrowUpRight,
} from "lucide-react";
import AgoraRTC from "agora-rtc-sdk-ng";

/* =========================
   Helpers & API (kept from your old file)
   ========================= */

// Elapsed time formatter (from old)
const fmtTime = (ms) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${h ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const qs = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
const ROLE = (qs.get("role") || "audience").toLowerCase();
const toId = (x) => {
  if (x == null) return null;
  if (typeof x === "number") return x;
  const s = String(x);
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? s : n;   // ← if not a number, keep the string
};

const COHOST = qs.get("cohost") === "1";

// --- NEW: single place to decide token role used by backend
const ROLE_FOR_TOKEN = (ROLE === "publisher") ? "publisher" : "audience";

// API base, e.g. VITE_API_URL=http://localhost:8000/api  (kept)
const RAW_API = (import.meta.env?.VITE_API_BASE_URL || "http://localhost:8000").toString().replace(/\/+$/, "");
const API = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;

// user APIs to try (kept)
const USERS_URL_TPLS = [];

const getAccessToken = () => {
  if (typeof localStorage === "undefined") return "";
  const pick = (...keys) => {
    for (const k of keys) {
      const v = localStorage.getItem(k) || sessionStorage.getItem(k);
      if (v) return v;
    }
    return "";
  };

  // simple strings first
  let tok = pick("token", "access", "access_token", "authToken", "jwt", "Authorization");
  if (tok) return tok.replace(/^Bearer\s+/i, "");

  // JSON containers (e.g. {"access": "..."} or {"token": "..."} etc.)
  try {
    for (const key of ["auth", "user", "profile"]) {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!raw) continue;
      const o = JSON.parse(raw);
      tok = o?.access || o?.token || o?.jwt || o?.user?.access || "";
      if (tok) return String(tok);
    }
  } catch { }

  return "";
};

const _backoff = { poll: 0, send: 0, mark: 0, other: 0 };
const canPollNow = (key = "poll") => Date.now() >= (_backoff[key] || 0);
const _inflight = { group: false, dm: false, dmdir: false, dminbox: false };

const apiFetch = async (url, init = {}, opt = {}) => {
  const method = (init.method || "GET").toUpperCase();
  const key = opt.key || (method === "GET" ? "poll" : method === "POST" ? "send" : "other");
  const now = Date.now();
  if (now < (_backoff[key] || 0)) {
    const err = new Error("Too Many Requests");
    err.code = 429; err.key = key; err.isThrottle = true;
    throw err; // ← normalize client backoff as 429
  }

  const token = getAccessToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers || {}),
  };

  const res = await fetch(url, { ...init, headers, credentials: "include", cache: "no-store" });

  if (res.status === 429) {
    // honor server hint if present; else 6s
    const retryAfter = parseInt(res.headers.get("Retry-After") || "6", 10);
    _backoff[key] = Date.now() + Math.max(3, retryAfter) * 1000;
    const err = new Error("Too Many Requests");
    err.code = 429; err.key = key; err.isThrottle = true; err.retryAfter = retryAfter;
    throw err;
    // throw new Error("Too Many Requests");
  }

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const err = await res.json();
      msg = err?.detail || JSON.stringify(err);
    } catch { }
    throw new Error(msg);
  }

  try {
    return await res.json();
  } catch {
    return null;
  }
};
const userIdFromRemoteUid = (uid) => {
  const n = Number(uid);
  return Number.isFinite(n) ? n : null;
};

const fetchUserById = async (id) => {
  for (const tpl of USERS_URL_TPLS) {
    try {
      const data = await apiFetch(tpl.replace(":id", String(id)));
      if (data) return data;
    } catch { }
  }
  return null;
};

// ---- token helpers (kept) ----
const tokenUrls = (eventId) => [
  `${API}/rtc/events/${eventId}/token/`,
  `${API}/events/${eventId}/token/`,
  `${API}/realtime/events/${eventId}/token/`,
];

const fetchRtcToken = async (
  eventId,
  accessToken,
  uid,
  role = (ROLE === "publisher" ? "publisher" : "audience")
) => {
  let lastErr;
  for (const url of tokenUrls(eventId)) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ role, uid }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;
      lastErr = new Error(`Token endpoint failed (${res.status}) at ${url}: ${JSON.stringify(data)}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("No token endpoints responded.");
};

// stable local uid (kept, with myUserId preferred if present)
const colorForSenderId = (id) => {
  const palette = ["#6366f1", "#f59e0b", "#ef4444", "#14b8a6", "#8b5cf6", "#10b981", "#06b6d4"];
  const n = Number(id) || 0;
  return palette[Math.abs(n) % palette.length];
};

const _first = (...vals) => vals.find(v => v != null && v !== "");
const _ts = (x) => {
  const s = _first(
    x?.created_at,
    x?.timestamp,
    x?.sent_at,
    x?.created,
    x?.updated_at
  );
  const t = Date.parse(s || 0);
  return Number.isFinite(t) ? t : 0;
};
const _cmpMsg = (a, b) => {
  const ta = _ts(a), tb = _ts(b);
  if (ta !== tb) return ta - tb;
  const ida = Number(a?.id), idb = Number(b?.id);
  if (Number.isFinite(ida) && Number.isFinite(idb)) return ida - idb;
  // stable fallback so equal-second messages don’t jump
  const ka = String(a?.id ?? `${a?.created_at}|${a?.sender_id}|${a?.body ?? ""}`);
  const kb = String(b?.id ?? `${b?.created_at}|${b?.sender_id}|${b?.body ?? ""}`);
  return ka.localeCompare(kb);
};
const sortByCreatedAtAsc = (arr) => [...(arr || [])].sort(_cmpMsg);

const _msgKey = (m) => {
  const conv =
    m?.conversation_id ??
    m?.conversation?.id ??
    m?.conv_id ??
    m?.room_key ?? "";
  const stamp = _first(m?.created_at, m?.timestamp, m?.sent_at, m?.created, m?.updated_at, "");
  return String(
    m?.id ?? `${conv}|${stamp}|${m?.sender_id}|${(m?.body ?? "").slice(0,64)}`
  );
};

const dedupeById = (arr) => {
  const seen = new Set();
  const out = [];
  for (const m of arr || []) {
    const k = _msgKey(m);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(m);
  }
  return sortByCreatedAtAsc(out);
};

/* =========================
   Small UI helper (new front)
   ========================= */
const Pill = ({ children, className = "" }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{children}</span>
);

const VideoTile = ({ id, name, you = false, muted = false, camOff = false, videoTrack = null }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (videoTrack && ref.current && !camOff) {
      try { videoTrack.play(ref.current); } catch { }
      return () => { try { videoTrack.stop(); } catch { } };
    }
  }, [videoTrack, camOff]);

  const initial =
    (name || "").trim().charAt(0)?.toUpperCase() || "?";
  const avatarBg = colorForSenderId(id || name || 0); // stable nice color

  return (
    <div className="relative aspect-[16/10] w-full rounded-2xl border border-gray-200 bg-black overflow-hidden">
      <div className="absolute inset-0 grid place-items-center">
        {(videoTrack && !camOff) ? (
          <div ref={ref} className="h-full w-full bg-black" />
        ) : (
          // Avatar with first letter (when camera is off or no track)
          <div className="flex h-full w-full items-center justify-center bg-zinc-800">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-md"
              style={{ background: avatarBg }}
            >
              <span className="text-5xl font-bold text-white leading-none">{initial}</span>
            </div>
          </div>
        )}
      </div>

      {/* Top-left mic icon when muted */}
      {muted && (
        <div className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded bg-black/60 text-white">
          <MicOff className="h-3.5 w-3.5" />
        </div>
      )}

      {/* Bottom-left name label */}
      <div className="absolute left-3 bottom-3">
        <Pill className="bg-black/60 text-white border border-white/20">
          {muted && <MicOff className="h-3.5 w-3.5 opacity-80" />}
          <span className="font-semibold">{name || "User"}</span>
          {you && <span className="opacity-80">(You)</span>}
        </Pill>
      </div>
    </div>
  );
};
/* =========================
   Page
   ========================= */
export default function LiveMeetingPage() {
  const { slug } = useParams();
  const startedRef = useRef(false);
  const leavingRef = useRef(false);
  const endedRef = useRef(false);
  const [activeSpeakerId, setActiveSpeakerId] = useState(null);
  const pendingDMRef = useRef({});   // { [convId]: Message[] }
  const pendingGroupRef = useRef([]); // Message[]
  const autoOpenDMRef = useRef({})
  const outboxRef = useRef([]);        // [{ type: 'group'|'dm', convId, body, tempId }]
  const sendingRef = useRef(false);
  let _tmpId = 0;
  const qnaWsRef = useRef(null);
  const [qnaConnected, setQnaConnected] = useState(false);
  const [hoveredQuestion, setHoveredQuestion] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingData, setRecordingData] = useState(null); // Stores { resourceId, sid, channel }
  // Event header (kept)
  const event = useMemo(() => {
    try {
      const mine = JSON.parse(localStorage.getItem("my_events") || "[]");
      return (
        mine.find((e) => e.slug === slug) || {
          id: undefined,
          title: slug,
          category: "Live",
          location: "Virtual",
        }
      );
    } catch {
      return { id: undefined, title: slug, category: "Live", location: "Virtual" };
    }
  }, [slug]);

  // My user id (kept)
  const myUserId = useMemo(() => {
    try {
      const rawUser =
        localStorage.getItem("user") || localStorage.getItem("auth") || localStorage.getItem("profile");
      if (rawUser) {
        const j = JSON.parse(rawUser);
        return j?.id || j?.user?.id || j?.pk || null;
      }
    } catch { }
    try {
      const tok = getAccessToken();
      if (tok && tok.split(".").length === 3) {
        const payload = JSON.parse(atob(tok.split(".")[1]));
        return payload?.user_id ?? payload?.id ?? payload?.sub ?? null;
      }
    } catch { }
    return null;
  }, []);

  const handleSendQuestion = () => {
  console.log('🔵 handleSendQuestion called');
  console.log('🔵 chatInput:', chatInput);
  console.log('🔵 qnaWsRef.current:', qnaWsRef.current);
  console.log('🔵 WebSocket readyState:', qnaWsRef.current?.readyState);
  
  const trimmed = chatInput.trim();
  if (!trimmed) {
    console.log('❌ No trimmed input');
    return;
  }
  
  if (!qnaWsRef.current) {
    console.log('❌ qnaWsRef.current is null');
    return;
  }
  
  if (qnaWsRef.current.readyState !== WebSocket.OPEN) {
    console.log('❌ WebSocket not OPEN. State:', qnaWsRef.current.readyState);
    return;
  }
  
  console.log('✅ Sending question via WebSocket');
  // Send via WebSocket
  qnaWsRef.current.send(JSON.stringify({
    content: trimmed,
  }));
  
  setChatInput('');
  setAskAsQuestion(false);
  console.log('✅ Question sent successfully');
};
  // track in-flight upvotes per question to prevent double-toggles
  const upvoteBusyRef = useRef(new Set());
  const handleUpvote = async (questionId) => {
    // prevent rapid double-clicks / races
   if (upvoteBusyRef.current.has(questionId)) return;
   upvoteBusyRef.current.add(questionId);
    // Optimistic (local) bump for the clicker
  setQna(prev => prev.map(item =>
   item.id === questionId
     ? { ...item, votes: Math.max(0, (item.votes || 0) + (item.voters?.includes('You') ? -1 : 1)),
         voters: item.voters?.includes('You')
           ? item.voters.filter(v => v !== 'You')
           : [...(item.voters || []), 'You'] }
     : item
 ));
  try {
     // Prefer WebSocket (and SKIP REST to avoid double-toggle)
     if (qnaWsRef.current && qnaWsRef.current.readyState === WebSocket.OPEN) {
       qnaWsRef.current.send(
         JSON.stringify({ action: 'upvote', question_id: questionId })
       );
     } else {
       // Fallback: REST (server will broadcast to all via WS anyway)
       const data = await apiFetch(
         `${API}/interactions/questions/${questionId}/upvote/`,
         { method: 'POST' }
       );
       // Normalize any server shape: upvote_count / upvotes_count / votes
       const votes =
         data?.upvote_count ?? data?.upvotes_count ?? data?.votes ?? 0;
       const meVoted = !!data?.upvoted;
       setQna(prev =>
         prev.map(item =>
           item.id === questionId
             ? {
                 ...item,
                 votes,
                 voters: meVoted
                   ? [...(item.voters || []).filter(v => v !== 'You'), 'You']
                   : (item.voters || []).filter(v => v !== 'You'),
               }
             : item
         )
       );
     }
   } catch (err) {
     console.error('Failed to upvote:', err);
     // optional: revert optimistic on hard failure
     setQna(prev =>
       prev.map(item =>
         item.id === questionId
           ? {
               ...item,
               votes: Math.max(
                 0,
                 (item.votes || 0) + (item.voters?.includes('You') ? 1 : -1)
               ),
               voters: item.voters?.includes('You')
                 ? item.voters.filter(v => v !== 'You')
                 : [...(item.voters || []), 'You'],
             }
           : item
       )
     );
   } finally {
     // release debounce after a short window
     setTimeout(() => {
       upvoteBusyRef.current.delete(questionId);
     }, 1000);
   }
};

  // ===== UI state (new front style) =====
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [rightOpen, setRightOpen] = useState(false); // mobile drawer toggle
  const [rightTab, setRightTab] = useState("participants"); // participants | chat
  const [elapsed, setElapsed] = useState(0);
  const exitUrl = ROLE === "publisher" ? "/dashboard" : "/myevents";
  const [finalizing, setFinalizing] = useState(false);
  const [finalizingText, setFinalizingText] = useState("");


  const [serverAttending, setServerAttending] = useState(null);
  const [attendees, setAttendees] = useState([]);

  const [qna, setQna] = useState([]);
  const [askAsQuestion, setAskAsQuestion] = useState(false);

  // ===== Chat (kept backend logic) =====
  const [chatSubTab, setChatSubTab] = useState(0); // 0 = Group, 1 = Direct
  const [conversationId, setConversationId] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]); // direct
  const [chatLoading, setChatLoading] = useState(false);
  const [chatErr, setChatErr] = useState("");

  const [groupConversationId, setGroupConversationId] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupErr, setGroupErr] = useState("");

  const chatPollRef = useRef(null);
  const groupPollRef = useRef(null);
  const chatListRef = useRef(null);
  const scrollChatToBottom = useCallback(() => {
    const el = chatListRef.current;
    if (!el) return;
    // jump to bottom (fast and reliable)
    el.scrollTop = el.scrollHeight;
  }, []);
  const [hostDMId, setHostDMId] = useState(null)
  const dmInboxPollRef = useRef(null);

  const [pinnedId, setPinnedId] = useState(null);

  const [screenAudioTrack, setScreenAudioTrack] = useState(null);
 const screenShareRef = useRef({ track: null, onEnded: null });

  const queueSend = (type, convId, body) => {
  const tempId = `tmp-${Date.now()}-${++_tmpId}`;
  const me = Number(myUserId);
  const optimistic = {
    id: tempId, conversation_id: convId, sender_id: me, body,
    is_read: true, created_at: new Date().toISOString(),
  };

  if (type === "group") {
    setGroupMessages(prev => dedupeById([...prev, optimistic]));
    (pendingGroupRef.current ||= []).push(optimistic);
  } else {
    setChatMessages(prev => dedupeById([...prev, optimistic]));
    (pendingDMRef.current[convId] ||= []).push(optimistic);
    setDirectChats(prev => {
      const cur = prev[convId] || [];
      return { ...prev, [convId]: dedupeById([...cur, optimistic]) };
    });
  }

  outboxRef.current.push({ type, convId, body, tempId });
  requestAnimationFrame(scrollChatToBottom);
};

  

  

  useEffect(() => {
  let timer;
  const tick = async () => {
    if (sendingRef.current) return schedule();
    const job = outboxRef.current[0];
    if (!job) return schedule();

    // respect 'send' backoff window
    if (!canPollNow("send")) return schedule();

    sendingRef.current = true;
    try {
      const data = await apiFetch(
        `${API}/messaging/conversations/${job.convId}/messages/`,
        { method: "POST", body: JSON.stringify({ body: job.body }) },
        { key: "send" }
      );

      const swap = (arr) =>
        arr.map(m => String(m.id) === job.tempId ? { ...data, created_at: m.created_at || data.created_at } : m);

      if (job.type === "group") {
        setGroupMessages(swap);
        pendingGroupRef.current = (pendingGroupRef.current || []).map(m =>
          String(m.id) === job.tempId ? data : m
        );
      } else {
        setChatMessages(swap);
        const cid = job.convId;
        pendingDMRef.current[cid] = (pendingDMRef.current[cid] || []).map(m =>
          String(m.id) === job.tempId ? data : m
        );
        setDirectChats(prev => ({ ...prev, [cid]: swap(prev[cid] || []) }));
      }

      outboxRef.current.shift(); // done
    } catch (e) {
      // If 429, apiFetch has already set _backoff.send → just try again later.
      if (!String(e?.message || "").includes("Too Many Requests")) {
        // hard error → drop this job but keep the optimistic bubble (or mark failed if you want)
        outboxRef.current.shift();
      }
    } finally {
      sendingRef.current = false;
      schedule();
    }
  };

  const schedule = () => {
    clearTimeout(timer);
    const delay = canPollNow("send")
      ? 200 // ~5 msgs/sec when allowed
      : Math.max(800, (_backoff.send || Date.now()) - Date.now());
    timer = setTimeout(tick, delay);
  };

  schedule();
  return () => clearTimeout(timer);
}, [API, myUserId]);


  useEffect(() => {
    scrollChatToBottom();
  }, [rightTab, chatSubTab, conversationId, groupConversationId, rightOpen, scrollChatToBottom]);

  useEffect(() => {
    return () => {
      try { screenAudioTrack?.stop?.(); screenAudioTrack?.close?.(); } catch { }
    };
  }, [screenAudioTrack]);

  const [userCache, setUserCache] = useState({});

  // ✅ add this line
  const [hostIds, setHostIds] = useState([]);

  const hostIdsRef = useRef([]);
  useEffect(() => { hostIdsRef.current = hostIds; }, [hostIds]);
  const [directChats, setDirectChats] = useState({});
  useEffect(() => {
    const cid = toId(conversationId);
    if (!cid) return;
    const cache = directChats[cid];
    if (cache) {
      setChatMessages(cache);
    }
  }, [conversationId, directChats]);
  const [unreadGroupCount, setUnreadGroupCount] = useState(0);
  const [unreadDMCounts, setUnreadDMCounts] = useState({}); // { [convId]: number }
  const [dmUnreadByPeer, setDmUnreadByPeer] = useState({});
  const markedReadIdsRef = useRef(new Set());

  const currentDMUnread = useMemo(
    () => unreadDMCounts[toId(conversationId)] || 0,
    [unreadDMCounts, conversationId]
  );

  // NEW: sum of all DM unread, not just the active DM
  const dmBadgeTotal = useMemo(
    () => Object.values(unreadDMCounts).reduce((a, b) => a + b, 0),
    [unreadDMCounts]
  );

  // Chat tab badge should reflect only GROUP unread
  const chatTabBadgeCount = unreadGroupCount;


  


  const markDMVisibleAsRead = async (cid, msgs) => {
    if (!isDMVisible(cid)) return;

    const unread = countUnreadForMe(msgs);
    if (unread <= 0) {
      // still keep pane in sync
      setChatMessages(msgs);
      return;
    }

    await markMessagesRead(msgs); // POST /messaging/messages/:id/read/
    // flip is_read locally so UI/badges update immediately
    const cleared = msgs.map(m =>
      (!m.is_read && Number(m.sender_id) !== Number(myUserId)) ? { ...m, is_read: true } : m
    );

    setDirectChats(prev => ({ ...prev, [cid]: cleared }));
    setChatMessages(cleared);
    setUnreadDMCounts(prev => ({ ...prev, [cid]: 0 }));
  };




  // Only mark-as-read when the view is actually visible
  function isGroupVisible() {
    return (
      rightTab === "chat" &&
      chatSubTab === 0 &&
      (typeof window === "undefined" ? true : (window.innerWidth >= 1024 ? true : rightOpen))
    );
  }

  function isDMVisible(convId) {
    return (
      rightTab === "chat" &&
      chatSubTab === 1 &&
      toId(conversationId) === toId(convId) &&
      (typeof window === "undefined" ? true : (window.innerWidth >= 1024 ? true : rightOpen))
    );
  }



  const startChatPolling = (convId) => {
  const cid = toId(convId);
  if (chatPollRef.current) clearInterval(chatPollRef.current);

  let pausedUntil = 0;

  chatPollRef.current = setInterval(async () => {
    const now = Date.now();
    if (now < pausedUntil || !canPollNow() || _inflight.dm) return;
    _inflight.dm = true;

    try {
      const server = await fetchMessages(cid);

      const pending = pendingDMRef.current[cid] || [];
      const notYet = pending.filter(p => !server.some(s => s.id === p.id));
      const merged = dedupeById([...server, ...notYet]);

      setDirectChats(prev => ({ ...prev, [cid]: merged }));

      const unread = countUnreadForMe(merged);
      setUnreadDMCounts(prev => ({ ...prev, [cid]: unread }));

      await markDMVisibleAsRead(cid, merged);

      pendingDMRef.current[cid] = pending.filter(p => !server.some(s => s.id === p.id));
    } catch (e) {
      setChatErr(e?.message || "Failed to fetch direct messages.");
      if (String(e.message || "").includes("Too Many Requests")) {
        pausedUntil = Date.now() + 10_000;
      }
    } finally {
      _inflight.dm = false;
    }
  }, 5000); // was 4000ms → 5000ms
};
  const stopChatPolling = () => {
    if (chatPollRef.current) {
      clearInterval(chatPollRef.current);
      chatPollRef.current = null;
    }
  };


  const startDMInboxPolling = useCallback((convId) => {
  if (!convId) return;
  if (dmInboxPollRef.current) clearInterval(dmInboxPollRef.current);
  let pausedUntil = 0;

  dmInboxPollRef.current = setInterval(async () => {
    if (document.hidden) return;
    if (Date.now() < pausedUntil) return;
    if (!canPollNow() || _inflight.dminbox) return;
    _inflight.dminbox = true;
    try {
      const cid = toId(convId);
      const server = await fetchMessages(cid);

      setDirectChats(prev => ({ ...prev, [cid]: server }));

      const unread = countUnreadForMe(server);
      setUnreadDMCounts(prev => ({ ...prev, [cid]: unread }));

      await markDMVisibleAsRead(cid, server);
    } catch (e) {
      // swallow
      if (String(e?.message||"").includes("Too Many Requests")) {
        pausedUntil = Date.now() + 10000;
       }
    } finally {
      _inflight.dminbox = false;
    }
  }, 8000); // was 2000ms → 5000ms
}, [rightTab, chatSubTab, conversationId, rightOpen, myUserId]);


  const stopDMInboxPolling = useCallback(() => {
    if (dmInboxPollRef.current) {
      clearInterval(dmInboxPollRef.current);
      dmInboxPollRef.current = null;
    }
  }, []);



  const mountDM = React.useCallback((cidRaw) => {
  const cid = Number(cidRaw) || null;
  if (!cid) return;

  setConversationId(cid);     // visible chat panel
  setHostDMId(cid);           // inbox poller
  stopChatPolling();
  stopDMInboxPolling();
  startChatPolling(cid);      // foreground messages
  startDMInboxPolling(cid);   // badges/unreads
}, [startChatPolling, stopChatPolling, startDMInboxPolling, stopDMInboxPolling]);

  const fetchAllPagesLatest = async (baseUrl, desired = 50) => {
  if (!canPollNow()) throw new Error("Too Many Requests (skip-init)");
  // Probe WITHOUT page_size/limit so we see the server's real paginator & page size.
  const probe = await apiFetch(`${baseUrl}?ordering=created_at,id`);
  const isPaginated = typeof probe?.count === "number";
  const results = Array.isArray(probe) ? probe : (probe?.results || []);
  const total = isPaginated ? (probe?.count || 0) : results.length;

  // Case A: DRF PageNumberPagination (has count + next/previous with ?page=…)
  const usesPageParam =
    isPaginated && (/[?&]page=/.test(probe?.next || "") || /[?&]page=/.test(probe?.previous || ""));

  if (usesPageParam) {
    // Server page size = what we actually got back on this page.
    const serverPageSize = results.length > 0 ? results.length : 20;
    const lastPage = Math.max(1, Math.ceil(total / serverPageSize));
    const pagesToFetch = Math.max(1, Math.ceil(Math.min(desired, total) / serverPageSize));

    const out = [];
    const start = Math.max(1, lastPage - pagesToFetch + 1);
    for (let p = start; p <= lastPage; p++) {
      const page = await apiFetch(`${baseUrl}?ordering=created_at,id&page=${p}`);
      out.push(...(page?.results || []));
    }
    return sortByCreatedAtAsc(out).slice(-desired);
  }

  // Case B: DRF LimitOffsetPagination (count + limit/offset)
  if (isPaginated) {
    const offset = Math.max(0, total - desired);
    const last = await apiFetch(`${baseUrl}?ordering=created_at,id&limit=${desired}&offset=${offset}`);
    const items = Array.isArray(last) ? last : (last?.results || []);
    return sortByCreatedAtAsc(items).slice(-desired);
  }

  // Case C: Not paginated at all
  return sortByCreatedAtAsc(results).slice(-desired);
};

  

  const nameFromMsg = (m, myId) => {
    const id = Number(m?.sender_id);
    let name =
      id === Number(myId)
        ? "You"
        : userCache[id]?.name ||
        m?.sender_name ||
        m?.sender?.name ||
        m?.sender?.username ||
        (Number.isInteger(id) ? `User ${id}` : "User");
    const isHost = Number.isInteger(id) && hostIds.includes(id);
    if (isHost && name === "You") return "You (Host)";
    if (isHost) return `${name} (Host)`;
    return name;
  };

  const prefetchUsers = useCallback(
    async (msgs) => {
      const ids = Array.from(
        new Set(
          (msgs || [])
            .map((m) => m?.sender_id)
            .filter((id) => Number.isInteger(id) && !userCache[id] && Number(id) !== Number(myUserId))
        )
      );
      if (!ids.length) return;

      const updates = {};
      for (const id of ids) {
        try {
          const u = await fetchUserLite(id, myUserId);
          if (!u) continue;
          const nm =
            u.name ||
            u.username ||
            u.full_name ||
            `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() ||
            `User ${id}`;
          updates[id] = { name: nm };
        } catch { }
      }
      if (Object.keys(updates).length) setUserCache((prev) => ({ ...prev, ...updates }));
    },
    [userCache, myUserId]
  );

  const getCurrentEventId = () => {
    const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const val = p.get("id");
    if (!val) return event?.id ?? null;
    return /^\d+$/.test(val) ? parseInt(val, 10) : val;
  };

  const getNumericEventId = async () => {
  try {
    const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const raw = p.get("id");
    if (raw && /^\d+$/.test(raw)) return parseInt(raw, 10);
    if (Number.isInteger(Number(event?.id))) return Number(event.id);
    if (raw || slug) {
      const ev = await apiFetch(`${API}/events/${raw || slug}/`);
      const n = Number(ev?.id);
      if (Number.isFinite(n)) return n;
    }
  } catch {}
  return null;
};

  const getEventRoomKey = async () => {
  const n = await getNumericEventId();
  if (!Number.isInteger(n)) {
    console.warn("[GROUP] missing numeric event id; cannot start group chat", {
      urlId: new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("id"),
      eventPropId: event?.id,
      slug
    });
    throw new Error("Numeric event id required for group room_key");
  }
  const rk = `event:${n}`;
  console.log("[GROUP] getEventRoomKey →", rk);
  return rk;
};


    const ensureGroupConversation = async (title = "") => {
  const room_key = await getEventRoomKey();  // ← same key for audience & publisher
  const data = await apiFetch(`${API}/messaging/conversations/ensure-group/`, {
    method: "POST",
    body: JSON.stringify({ room_key, title }),
  });
  return data?.id;
};
const findGroupByRoomKey = async () => {
  const rk = await getEventRoomKey();
  const list = await listMyConversations(true);
  const matches = (list || []).filter(
    (c) => !isDirectConv(c) &&
      String(c?.room_key || "").trim().toLowerCase() === String(rk).trim().toLowerCase()
  );
  if (!matches.length) return null;
  matches.sort((a, b) => Number(a?.id) - Number(b?.id));
  return toId(matches[0]?.id);
};

// Ensure we have the canonical group (re-check after create, in case duplicate existed)
const ensureGroupByRoomKey = async (title = "") => {
  const rk = await getEventRoomKey();
  console.log("[GROUP] ensureGroupByRoomKey start", { rk, title });

  // 1) try to find existing
  const list = await listMyConversations(true);
  const matches = (list || []).filter(
    (c) => !isDirectConv(c) &&
      String(c?.room_key || "").trim().toLowerCase() === String(rk).trim().toLowerCase()
  );

  const existing = matches.length ? toId(matches.sort((a, b) => Number(a.id) - Number(b.id))[0].id) : null;
  if (existing) {
    console.log("[GROUP] existing conversation found", { rk, convId: existing, count: matches.length });
    return existing;
  }

  // 2) create if missing
  const data = await apiFetch(`${API}/messaging/conversations/ensure-group/`, {
    method: "POST",
    body: JSON.stringify({ room_key: rk, title })
  });
  const createdId = toId(data?.id);
  console.log("[GROUP] created conversation", { rk, createdId });

  // 3) re-resolve canonically
  const list2 = await listMyConversations(true);
  const matches2 = (list2 || []).filter(c => !isDirectConv(c) && String(c?.room_key || "") === String(rk));
  const finalId = matches2.length ? toId(matches2.sort((a, b) => Number(a.id) - Number(b.id))[0].id) : createdId;
  console.log("[GROUP] ensureGroupByRoomKey final", { rk, finalId });

  return finalId;
};



  const DESIRED_GROUP_WINDOW = 100; // change to how many messages you want visible

const fetchGroupMessages = async (convId) => {
  const cid  = toId(convId);
  const base = `${API}/messaging/conversations/${cid}/messages/`;
  const items = await fetchAllPagesLatest(base, DESIRED_GROUP_WINDOW);
  const hydrated = (items || []).map(m => ({
    ...m,
    conversation_id: m?.conversation_id ?? cid,
    created_at:
      _first(m?.created_at, m?.timestamp, m?.sent_at, m?.created, m?.updated_at) ||
      new Date().toISOString(),
  }));
  return sortByCreatedAtAsc(hydrated);
};



  const ensureConversation = async (recipientId) => {
    const me = Number(myUserId);
    const other = Number(recipientId);

    if (!Number.isFinite(me)) throw new Error("DM setup: my user id is missing.");
    if (!Number.isFinite(other)) throw new Error("DM setup: recipient id not found.");
    if (me === other) throw new Error("DM setup: cannot DM yourself.");

    const payload = { recipient_id: other };
    // Debug once; helps catch issues quickly in your console/network tab.
    console.debug("[DM] creating conversation with payload:", payload);

    const data = await apiFetch(`${API}/messaging/conversations/`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data?.id ?? null;
  };

  const fetchMessages = async (convId) => {
  const base = `${API}/messaging/conversations/${convId}/messages/`;
  const items = await fetchAllPagesLatest(base, 100); // or 50
  const hydrated = (items || []).map(m => ({
    ...m,
    conversation_id: m?.conversation_id ?? convId,
    created_at:
      _first(m?.created_at, m?.timestamp, m?.sent_at, m?.created, m?.updated_at) ||
      new Date().toISOString(),
  }));
  return sortByCreatedAtAsc(hydrated);
};
  const countUnreadForMe = (msgs) =>
    (msgs || []).filter(m => !m.is_read && Number(m?.sender_id) !== Number(myUserId)).length;

  // Mark unread messages as read (per-message endpoint)
  const markMessagesRead = async (msgs) => {
  if (!canPollNow("mark") || _inflight.mark) return;
  _inflight.mark = true;
  const ids = (msgs || [])
    .filter(m => !m.is_read && Number(m?.sender_id) !== Number(myUserId))
    .map(m => m.id)
    .filter(id => id && !markedReadIdsRef.current.has(id));

  if (!ids.length) { 
    _inflight.mark = false;
     return; 
   }

  const MAX_PER_RUN = 3; // ⟵ cap per poll/run
  const slice = ids.slice(0, MAX_PER_RUN);

  const succeeded = [];
  for (const id of slice) {
    try {
      await apiFetch(`${API}/messaging/messages/${id}/read/`, { method: "POST" }, { key: "mark" });
      succeeded.push(id);
    } catch (e) {
      console.warn("mark-read failed", id, e?.message || e);
      // stop early if server is unhappy
      break;
    }
  }
  succeeded.forEach(id => markedReadIdsRef.current.add(id));
  _inflight.mark = false;
};

  // Fetch only the newest page (tail) — 1 request.
const fetchGroupMessagesLight = async (convId, desired = 50) => {
  const cid  = toId(convId);
  const base = `${API}/messaging/conversations/${cid}/messages/`;

  // Probe pagination style (page-number vs limit/offset)
  const probe = await apiFetch(`${base}?page_size=1`);
  const results = Array.isArray(probe) ? probe : (probe?.results || []);
  const total   = typeof probe?.count === "number" ? probe.count : results.length;

  // PageNumberPagination
  if (typeof probe?.count === "number" && (probe?.next || probe?.previous || "").includes("page=")) {
    const serverPageSize = results.length || 20;
    const lastPage = Math.max(1, Math.ceil(total / serverPageSize));
    const page = await apiFetch(`${base}?ordering=created_at,id&page=${lastPage}&page_size=${Math.min(desired, 50)}`);
    const items = Array.isArray(page) ? page : (page?.results || []);
    return sortByCreatedAtAsc(items);
  }

  // LimitOffsetPagination or array
  const offset = Math.max(0, total - desired);
  const page   = await apiFetch(`${base}?ordering=created_at,id&limit=${desired}&offset=${offset}`);
  const items  = Array.isArray(page) ? page : (page?.results || []);
  return sortByCreatedAtAsc(items);
};



    const startGroupPolling = (convId) => {
  const cid = toId(convId);
  if (!cid) return;
  if (groupPollRef.current) clearInterval(groupPollRef.current);

  let tick = 0;
  let pausedUntil = 0;        // local pause for 429
  let backoffMs = 0;          // exponential (max 60s)

  groupPollRef.current = setInterval(async () => {
    tick += 1;
    const now = Date.now();
    if (now < pausedUntil) return;
    if (document.hidden) return;               // don’t hammer when tab is hidden
    if (!canPollNow() || _inflight.group) return;
    _inflight.group = true;

    try {
      // 🔹 light tail-only fetch (1 request)
      const server  = await fetchGroupMessagesLight(cid, 50);
      const pending = pendingGroupRef.current || [];

      // tolerant id compare (string vs number)
      const idsEqual = (a,b) => (a==null||b==null) ? false :
        (Number.isFinite(Number(a)) && Number.isFinite(Number(b)))
          ? Number(a) === Number(b)
          : String(a) === String(b);

      const notYet  = pending.filter(p => !server.some(s => idsEqual(s.id, p.id)));
      const merged  = dedupeById([...server, ...notYet]);
      const unread  = countUnreadForMe(server);

      setUnreadGroupCount(unread);
      if (isGroupVisible() && unread > 0) {
        await markMessagesRead(server);
        const cleared = merged.map(m =>
          (!m.is_read && Number(m.sender_id) !== Number(myUserId)) ? { ...m, is_read: true } : m
        );
        setGroupMessages(cleared);
        setUnreadGroupCount(0);
      } else {
        setGroupMessages(merged);
      }

      pendingGroupRef.current = pending.filter(p => !server.some(s => idsEqual(s.id, p.id)));
      // success → reset backoff
      backoffMs = 0;
    } catch (e) {
      // 429 or client backoff → pause politely
      const msg = String(e?.message || "");
      if (msg.includes("Too Many Requests")) {
        backoffMs = backoffMs ? Math.min(backoffMs * 2, 60_000) : 8_000; // start 8s, cap 60s
        pausedUntil = Date.now() + backoffMs;
      }
      // don’t spam the UI with errors
    } finally {
      _inflight.group = false;
    }
  }, 5000); // was 3000 → 5000 to reduce pressure
};


  const stopGroupPolling = () => {
    if (groupPollRef.current) {
      clearInterval(groupPollRef.current);
      groupPollRef.current = null;
    }
  };

  

  const resolveRecipientUserId = async () => {
    // 1) Last explicitly chosen peer (from the DM button)
    try {
      const saved = sessionStorage.getItem("last_dm_peer_id");
      if (saved && /^\d+$/.test(saved)) {
        const n = parseInt(saved, 10);
        if (Number.isFinite(n) && n !== Number(myUserId)) return n;
      }
    } catch { }

    // 2) URL param ?to=<userId>
    {
      const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const toParam = p.get("to");
      if (toParam && /^\d+$/.test(toParam)) {
        const to = parseInt(toParam, 10);
        if (Number.isFinite(to) && to !== Number(myUserId)) return to;
      }
    }

    // 3) Known host ids (seeded from the event earlier)
    if (hostIdsRef.current && hostIdsRef.current.length) {
      const candidate = hostIdsRef.current.find((id) => Number(id) !== Number(myUserId));
      if (Number.isFinite(candidate)) return Number(candidate);
    }

    // 4) Any currently connected remote user (Agora)
    //    Prefer the first real numeric uid that isn't me.
    {
      const list = Object.keys(remoteUsers || {})
        .map((k) => userIdFromRemoteUid(k))
        .filter((n) => Number.isFinite(n) && n !== Number(myUserId));
      if (list.length) return list[0];
    }

    // 5) Fallback: fetch event and try organizer/owner/host like before
    const eid = await getNumericEventId();
    if (!eid) throw new Error("DM setup: missing event id.");

    const ev = await apiFetch(`${API}/events/${eid}/`);
    const candidates = [
      ev?.host_user_id,
      ev?.organizer_id, ev?.organizer?.id,
      ev?.owner_id, ev?.owner?.id,
      ev?.created_by_id, ev?.created_by?.id,
      ev?.user_id, ev?.user?.id,
    ]
      .map((v) => (v == null ? null : parseInt(String(v), 10)))
      .filter((v) => Number.isFinite(v) && v !== Number(myUserId));

    if (candidates.length) return candidates[0];

    // Nothing worked → ask the user to pick someone
    throw new Error("Select someone to chat with (click DM on a participant).");
  };

  const initChat = useCallback(async () => {
    if (conversationId) return;
    setChatErr("");
    setChatLoading(true);
    try {
      // 1) decide the peer (audience→host, publisher→last clicked/host)
      let peer = await resolveRecipientUserId();
      if (!Number.isFinite(Number(peer)) || Number(peer) === Number(myUserId)) {
        const saved = sessionStorage.getItem("last_dm_peer_id");
        if (saved && Number.isFinite(Number(saved)) && Number(saved) !== Number(myUserId)) {
          peer = Number(saved);
        }
      }
      if (!Number.isFinite(Number(peer)) || Number(peer) === Number(myUserId)) {
        throw new Error("Select someone to chat with.");
      }

      // 2) resolve/create and then canonicalize by listing (so both sides land on same id)
      const convId = await findOrCreateDM(peer);
      const cid = toId(convId);
      setConversationId(cid);

      let msgs = await fetchMessages(cid);
      setDirectChats((prev) => ({ ...prev, [cid]: msgs }));
      setChatMessages(msgs);
      await markMessagesRead(msgs);
      setUnreadDMCounts((prev) => ({ ...prev, [cid]: 0 }));

      startChatPolling(cid);
    } catch (e) {
      setChatErr(e.message || "Failed to initialize chat.");
    } finally {
      setChatLoading(false);
    }
  }, [conversationId, myUserId]);

  // =============== GROUP SEND =================
const handleSendMessageGroup = () => {
  console.log('📤 handleSendMessageGroup called');
  console.log('📤 askAsQuestion:', askAsQuestion);
  const trimmed = chatInput.trim();
  const cid = toId(groupConversationId);
  if (!trimmed) {
    console.log('❌ No trimmed input in group');
    return;
  }

  if (askAsQuestion) {
    console.log('✅ Redirecting to handleSendQuestion');
    handleSendQuestion();
    return;
  }

  if (!cid) return;

  // 1) Optimistic add
  const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const me = Number(myUserId);
  const optimistic = {
    id: tempId,
    conversation_id: cid,
    sender_id: me,
    body: trimmed,
    is_read: true,
    created_at: new Date().toISOString(),
  };

  setGroupMessages(prev => dedupeById([...prev, optimistic]));
  (pendingGroupRef.current ||= []).push(optimistic);

  // optional: if you add to QnA on send
  if (askAsQuestion) {
    setQna(items => [...items, { id: items.length + 1, q: trimmed, votes: 0, by: "You", voters: [] }]);
  }

  setChatInput("");
  requestAnimationFrame(scrollChatToBottom);

  // 2) Background send with retry on 429 + canonicalize convo id if server pivots it
  let backoff = 1500;
  const maxBackoff = 30000;

  const replaceTempWithServer = (data) => {
    const swap = (arr) =>
      (arr || []).map(m => (String(m.id) === tempId ? { ...data, created_at: m.created_at || data.created_at } : m));

    setGroupMessages(swap);
    const curPend = pendingGroupRef.current || [];
    pendingGroupRef.current = curPend.map(m => (String(m.id) === tempId ? data : m));
  };

  const attempt = async () => {
    try {
      const data = await apiFetch(
        `${API}/messaging/conversations/${cid}/messages/`,
        { method: "POST", body: JSON.stringify({ body: trimmed }) }
      );

      // If backend returns a canonical conversation id, pivot the UI
      const serverCid = toId(data?.conversation_id || data?.conversation?.id);
      if (serverCid && serverCid !== cid) {
        setGroupConversationId(serverCid);
        stopGroupPolling();
        startGroupPolling(serverCid);
      }

      if (!data.created_at) data.created_at = new Date().toISOString();
      if (data.sender_id == null) data.sender_id = myUserId;

      replaceTempWithServer(data);
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("Too Many Requests")) {
        setTimeout(attempt, backoff);
        backoff = Math.min(backoff * 2, maxBackoff);
      } else {
        setGroupErr(msg || "Failed to send group message (kept locally).");
      }
    }
  };

  attempt();
};

// ================= DM SEND (optimistic + queued) =================
const handleSendMessageDM = () => {
  const trimmed = chatInput.trim();
  const cid = toId(conversationId);
  if (!trimmed || !cid) return;

  // Use the outbox/queue you already wired up
  queueSend("dm", cid, trimmed);

  // Clear composer; queueSend() already scrolls to bottom
  setChatInput("");
};


  // ===== Agora state (kept) =====
  const clientRef = useRef(null);
  const [localAudioTrack, setLocalAudioTrack] = useState(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState({});
  const groupSendRef = useRef({ busy: false, last: 0 });
  const dmSendRef    = useRef({ busy: false, last: 0 });
  const MIN_SEND_GAP_MS = 1200; // 1.2s between sends
  const remoteUsersRef = useRef({});
  useEffect(() => {
    remoteUsersRef.current = remoteUsers;
  }, [remoteUsers]);
  const [permission, setPermission] = useState("pending");
  const [joinErr, setJoinErr] = useState("");
  const [joined, setJoined] = useState(false);  
  const groupConvIdRef = useRef(null);
  useEffect(() => { groupConvIdRef.current = toId(groupConversationId); }, [groupConversationId]);



  const pinnedRef = useRef(null);

  // stable uid
  const localUidRef = useRef(null);
  if (localUidRef.current === null) {
    try {
      const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const eid = params.get("id") || "default";
      const key = `agora.local.uid.${eid}`;
      const prefer = Number(myUserId);
      let uid = Number.isInteger(prefer) && prefer > 0 ? prefer : Number(sessionStorage.getItem(key));
      if (!Number.isInteger(uid) || uid <= 0) {
        uid = Math.floor(1 + Math.random() * 2147483646);
      }
      sessionStorage.setItem(key, String(uid));
      localUidRef.current = uid;
    } catch {
      localUidRef.current = Number(myUserId) || Math.floor(1 + Math.random() * 2147483646);
    }
  }

  useEffect(() => {
  console.log('🔵 === Q&A WEBSOCKET EFFECT RUNNING ===');
  console.log('🔵 joined:', joined);
  console.log('🔵 qnaWsRef:', qnaWsRef);
  console.log('🔵 qnaWsRef.current:', qnaWsRef.current);
  
  if (!joined) {
    console.log('❌ Not joined yet, skipping WebSocket');
    return;
  }
  
  console.log('✅ joined is true, connecting WebSocket...');
  
  const connectQnA = async () => {
    try {
      console.log('🟢 Starting Q&A WebSocket connection...');
      const eid = await getNumericEventId();
      if (!eid) {
        console.log('❌ No numeric event ID');
        return;
      }
      
      console.log('✅ Event ID:', eid);
      
      // Fix: Build WebSocket URL properly
      let baseUrl = API;
      
      // Remove /api suffix if present
      if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.slice(0, -4);
      }
      
      // Replace protocol: http:// -> ws://, https:// -> wss://
      if (baseUrl.startsWith('https://')) {
        baseUrl = 'wss://' + baseUrl.slice(8);
      } else if (baseUrl.startsWith('http://')) {
        baseUrl = 'ws://' + baseUrl.slice(7);
      } 
      const token = getAccessToken();              
      
      const wsUrl = `${baseUrl}/ws/events/${eid}/qna/?token=${encodeURIComponent(token)}`;
      
      console.log('🟢 Q&A WebSocket URL:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      qnaWsRef.current = ws;
      
      console.log('✅ WebSocket object created, assigned to qnaWsRef');
      
      ws.onopen = () => {
        console.log('✅✅✅ Q&A WebSocket connected successfully!');
        setQnaConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("QA message received:", data);

          if (data.type === "qna.question") {
            setQna((prev) => [
              ...prev,
              {
                id: data.question_id,
                q: data.content,
                votes: data.upvote_count || 0,
                by: data.user || `User ${data.user_id}`,
                voters: [],
                upvoters: data.upvoters || [],  // NEW
                user_id: data.user_id,
                created_at: data.created_at,
              },
            ]);
          } else if (data.type === "qna.upvote") {
            setQna((prev) =>
              prev.map((item) => {
                if (item.id !== data.question_id) return item;

                let voters = [...(item.voters || [])];
                if (Number(data.user_id) === Number(myUserId)) {
                  if (data.upvoted) {
                    if (!voters.includes("You")) voters.push("You");
                  } else {
                    voters = voters.filter((v) => v !== "You");
                  }
                }

                return {
                  ...item,
                  votes: data.upvote_count,
                  voters,
                  upvoters: data.upvoters || item.upvoters || [],  // NEW
                };
              })
            );
          }
        } catch (err) {
          console.error("Failed to parse QA message:", err);
        }
      };
      
      ws.onerror = (err) => {
        console.error('❌ Q&A WebSocket error:', err);
      };
      
      ws.onclose = (e) => {
        console.log('🔴 Q&A WebSocket closed', 'Code:', e.code, 'Reason:', e.reason);
        setQnaConnected(false);
        qnaWsRef.current = null;
      };
    } catch (err) {
      console.error('❌ Failed to connect Q&A WebSocket:', err);
    }
  };
  
  connectQnA();
  
  return () => {
    if (qnaWsRef.current) {
      console.log('🧹 Cleaning up Q&A WebSocket');
      qnaWsRef.current.close();
      qnaWsRef.current = null;
    }
  };
}, [joined]);  


  // === LOGGED: boot the group chat once per event ===
useEffect(() => {
  let cancelled = false;
  (async () => {
    console.log("[GROUP:init] starting…");

    try {
      const rk = await getEventRoomKey();
      if (cancelled) return;
      console.log("[GROUP:init] room_key =", rk);

      // resolve / create the conversation
      const convId = await ensureGroupByRoomKey(event?.title || "");
      if (cancelled) return;
      console.log("[GROUP:init] conversation id =", convId);

      setGroupConversationId(convId);

      // initial fetch
      const msgs = await fetchGroupMessages(convId);
      if (cancelled) return;
      console.log("[GROUP:init] initial messages fetched =", msgs.length);

      setGroupMessages(msgs);

      // mark read if visible
      if (isGroupVisible() && msgs?.length) {
        await markMessagesRead(msgs);
        setGroupMessages(prev =>
          prev.map(m =>
            (!m.is_read && Number(m.sender_id) !== Number(myUserId)) ? { ...m, is_read: true } : m
          )
        );
        setUnreadGroupCount(0);
        console.log("[GROUP:init] marked initial messages read");
      }

      startGroupPolling(convId);
      console.log("[GROUP:init] polling started");
    } catch (e) {
      console.error("[GROUP:init] error", e?.message || e);
      if (!cancelled) setGroupErr(e?.message || "Failed to initialize group chat.");
    } finally {
      if (!cancelled) setGroupLoading(false);
    }
  })();

  return () => { cancelled = true; stopGroupPolling(); console.log("[GROUP:init] cleanup"); };
}, [event?.id]);

// === 5) Periodically reconcile in case the server later merges/renames threads ===
useEffect(() => {
  let lastSwitched = 0;
  const MIN_SWITCH_GAP = 15000; // 15s – avoid restart storms

  const reconcileGroup = async () => {
    try {
      const rk = await getEventRoomKey();
      const list = await listMyConversations(true);
      const groups = (list || []).filter(
        (c) =>
          !isDirectConv(c) &&
          String(c?.room_key || "").trim().toLowerCase() === String(rk).trim().toLowerCase()
      );
      if (!groups.length) return;

      // canonical = smallest id (or your scoring if you prefer)
      groups.sort((a, b) => Number(a.id) - Number(b.id));
      const best = toId(groups[0]?.id);
      const current = toId(groupConvIdRef.current);

      if (best && best !== current && Date.now() - lastSwitched > MIN_SWITCH_GAP) {
        lastSwitched = Date.now();
        setGroupConversationId(best);
        stopGroupPolling();
        startGroupPolling(best);
        try {
          const msgs = await fetchGroupMessages(best);
          if (msgs && msgs.length) setGroupMessages(msgs); // keep old messages on backoff/empty
        } catch (e) {
          // keep existing messages
        }
      }
    } catch {}
  };

  const t = setInterval(reconcileGroup, 8000);
  reconcileGroup();
  return () => clearInterval(t);
}, [event?.title, groupConversationId]);
  useEffect(() => {
    if (activeSpeakerId) {
      sessionStorage.setItem("active_speaker_id", String(activeSpeakerId));
    }
  }, [activeSpeakerId]);

  // 2) If something clears it (e.g., on leave/cleanup), immediately restore last known
  useEffect(() => {
    if (activeSpeakerId == null) {
      const saved = sessionStorage.getItem("active_speaker_id");
      if (saved) setActiveSpeakerId(saved);
    }
  }, [activeSpeakerId]);

  useEffect(() => {
    const cid = toId(conversationId);
    if (!cid) return;
    const cache = directChats[cid];
    if (cache && cache.length) {
      setChatMessages(cache);
    }
  }, [conversationId, directChats]);


  useEffect(() => {
    if (rightTab === "chat" && chatSubTab === 1 && conversationId) {
      const cid = toId(conversationId);
      const cache = directChats[cid] || [];
      markDMVisibleAsRead(cid, cache);
    }
  }, [rightTab, chatSubTab, conversationId, directChats]);

  useEffect(() => {
    let alive = true;
    (async () => {
      let rid = null;

      // 1) If Publisher, prefer the last DM peer
      if (ROLE === "publisher") {
        try {
          const saved = sessionStorage.getItem("last_dm_peer_id");
          const n = saved ? parseInt(saved, 10) : null;
          if (Number.isInteger(n) && n !== Number(myUserId)) rid = n;
        } catch { }
      }

      // 2) Otherwise (or if nothing saved), try resolver but DO NOT throw
      if (!rid) {
        try {
          rid = await resolveRecipientUserId();
        } catch {
          rid = null;             // ← swallow; don’t crash the page
        }
      }
      if (!Number.isFinite(rid)) return;

      const cid = await findOrCreateDM(rid);
      if (!alive) return;

      const c = toId(cid);
      setHostDMId(c);
      startDMInboxPolling(c);
    })();
    return () => { alive = false; stopDMInboxPolling(); };
  }, [slug, myUserId]);
 useEffect(() => {
  let alive = true;

  const pollOnce = async () => {
    if (!canPollNow()) return;
    const eid = await getNumericEventId();
    if (!eid) return;
    try {
      const ev = await apiFetch(`${API}/events/${eid}/`);
      const n = Number(ev?.attending_count);
      if (alive && Number.isFinite(n)) setServerAttending(n);
    } catch {
      // ignore
    }
  };

  const t = setInterval(pollOnce, 10000); // was 2000ms → 5000ms
  pollOnce();
  return () => { alive = false; clearInterval(t); };
}, [slug]);

  // Elapsed header timer
  useEffect(() => {
    const t0 = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - t0), 1000);
    return () => clearInterval(t);
  }, []);

  // Join flow (kept; minor tweaks)
  useEffect(() => {
    (async () => {
      try {
        if (startedRef.current) return;
        startedRef.current = true;

        const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
        const rawId = searchParams.get("id");
        const parseId = (val) => {
          if (!val) return null;
          return /^\d+$/.test(val) ? parseInt(val, 10) : val;
        };
        const queryId = parseId(rawId);
        const eventId = event?.id ?? queryId;
        if (!eventId) {
          throw new Error("Missing event id. Use Host Now or open with ?id=<eventId>.");
        }

        const ACCESS = getAccessToken();

        const toEpochSeconds = (val) => {
          if (typeof val === "number") return val;
          if (typeof val === "string") {
            if (/^\d+$/.test(val)) return parseInt(val, 10);
            const t = Date.parse(val);
            if (!Number.isNaN(t)) return Math.floor(t / 1000);
          }
          return undefined;
        };
        const toInt = (val) => (typeof val === "number" ? val : parseInt(String(val ?? ""), 10));
        if (Number.isFinite(Number(myUserId)) && Number(myUserId) > 0) {
          localUidRef.current = Number(myUserId);
          try { sessionStorage.setItem(`agora.local.uid.${eventId}`, String(localUidRef.current)); } catch { }
        }
        const tokenResp = await fetchRtcToken(eventId, ACCESS, localUidRef.current, ROLE_FOR_TOKEN);
        const appId = tokenResp?.app_id;
        const rtcToken = tokenResp?.token;
        const rtcChannel = tokenResp?.channel;
        const signedUid = toInt(tokenResp?.uid);
        const expiresAt = toEpochSeconds(tokenResp?.expires_at);
        const serverTime = toEpochSeconds(tokenResp?.server_time) ?? Math.floor(Date.now() / 1000);

        if (
          !tokenResp ||
          typeof rtcToken !== "string" ||
          typeof appId !== "string" ||
          typeof rtcChannel !== "string" ||
          !Number.isInteger(signedUid) ||
          !Number.isInteger(expiresAt) ||
          !Number.isInteger(serverTime)
        ) {
          throw new Error("Token API missing fields. Expected {app_id, token, channel, uid, expires_at, server_time}.");
        }
        if (signedUid !== localUidRef.current) {
          throw new Error(`Token UID ${signedUid} does not match local UID ${localUidRef.current}.`);
        }
        if (expiresAt - serverTime <= 15) {
          throw new Error("Token already expired (or about to). Check server clock/TTL.");
        }

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;


        // Default host as active speaker until VAD updates it
        if (ROLE === "publisher") {
          setActiveSpeakerId("you");
        }
       if (ROLE === "publisher") {
          try {
            console.log('🎥 Starting recording for event:', eventId);
            
            const response = await apiFetch(`${API}/event-recordings/${eventId}/start/`, {
              method: 'POST',
            });
            
            console.log('🎥 Full recording start response:', JSON.stringify(response, null, 2));
            console.log('🎥 resourceId:', response.resourceId);
            console.log('🎥 sid:', response.sid);
            console.log('🎥 channel:', response.channel || response.cname);
            
            if (!response || !response.resourceId || !response.sid) {
              throw new Error(`Invalid recording response: ${JSON.stringify(response)}`);
            }
            
            setRecordingData({
              resourceId: response.resourceId,
              sid: response.sid,
              channel: response.channel || response.cname,
            });
            setIsRecording(true);
            console.log('✅ Recording data stored:', {
              resourceId: response.resourceId,
              sid: response.sid,
              channel: response.channel || response.cname
            });
          } catch (e) {
            console.error('❌ Failed to start recording:', e);
            console.error('Error message:', e.message);
          }
        }
        client.on("user-joined", (user) => {
          setRemoteUsers((prev) => ({ ...prev, [user.uid]: { uid: user.uid } }));
          const rid = userIdFromRemoteUid(user.uid);
          if (Number.isInteger(rid)) {
            (async () => {
              try {
                const u = await fetchUserLite(rid, myUserId);
                if (!u) return;
                const nm =
                  u.name ||
                  u.username ||
                  u.full_name ||
                  `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() ||
                  `User ${rid}`;
                // don’t overwrite if we already have it
                setUserCache((prev) => (prev[rid] ? prev : { ...prev, [rid]: { name: nm } }));
              } catch { }
            })();
          }
          // ACTIVE SPEAKER — for audience, focus host if none chosen yet
          if (ROLE !== "publisher") {
            setActiveSpeakerId((prev) => {
              if (prev) return prev;
              const isHost = hostIdsRef.current.includes(Number(user.uid));
              return isHost ? String(user.uid) : prev;
            });
          }
        });
        client.on("user-left", (user) => {
          setRemoteUsers((prev) => {
            const copy = { ...prev };
            delete copy[user.uid];
            return copy;
          });
        });
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          setRemoteUsers((prev) => {
            const cur = prev[user.uid] || { uid: user.uid };
            const updated = { ...cur };
            if (mediaType === "video") updated.videoTrack = user.videoTrack;
            if (mediaType === "audio") {
              updated.audioTrack = user.audioTrack;
              try { user.audioTrack?.play?.(); } catch { }
            }
            return { ...prev, [user.uid]: updated };
          });
        });

        client.on("user-unpublished", (user, mediaType) => {
          setRemoteUsers(prev => {
            const cur = prev[user.uid] || { uid: user.uid };
            const next = { ...cur };
            if (mediaType === "video" && next.videoTrack) { try { next.videoTrack.stop(); } catch { } delete next.videoTrack; }
            if (mediaType === "audio" && next.audioTrack) { try { next.audioTrack.stop(); } catch { } delete next.audioTrack; }
            return { ...prev, [user.uid]: next };
          });
        });
        if (ROLE === "publisher") setActiveSpeakerId("you");

        // ACTIVE SPEAKER — volume-based detection
        client.enableAudioVolumeIndicator?.();
        client.on("volume-indicator", (vols = []) => {
          let top = null;
          for (const v of vols) if (!top || v.level > top.level) top = v;
          if (top && top.level > 10) {
            const id = (top.uid === localUidRef.current || top.uid === 0) ? "you" : String(top.uid);
            setActiveSpeakerId(id);
          }
        });

        client.on("token-privilege-will-expire", async () => {
          try {
            const fresh = await fetchRtcToken(eventId, ACCESS, localUidRef.current, ROLE_FOR_TOKEN);
            const freshToken = fresh?.token;
            if (typeof freshToken !== "string") throw new Error("Bad renew token payload.");
            await client.renewToken(freshToken);
          } catch (e) {
            console.warn("Failed to renew token (will-expire):", e);
          }
        });
        client.on("token-privilege-did-expire", async () => {
          try {
            const fresh = await fetchRtcToken(eventId, ACCESS, localUidRef.current, ROLE_FOR_TOKEN);
            await client.leave();
            await client.join(fresh?.app_id, fresh?.channel, fresh?.token, localUidRef.current);
            if (ROLE === "publisher") {
              try {
                await apiFetch(`${API}/events/${eventId}/live-status/`, {
                  method: "POST",
                  body: JSON.stringify({ action: "start" }),
                });
              } catch (e) {
                console.warn("Failed to mark event live:", e);
              }
            }
          } catch (e) {
            console.error("Failed to rejoin after token expiry:", e);
            setJoinErr("Connection lost. Please reload the page to rejoin.");
          }
        });
        if (ROLE === "publisher") {
          try {
            await apiFetch(`${API}/events/${eventId}/live-status/`, {
              method: "POST",
              body: JSON.stringify({ action: "start" }),
            });
          } catch (e) {
            console.warn("Failed to mark event live:", e);
          }
        }

        await client.join(appId, rtcChannel, rtcToken, localUidRef.current);
        if (ROLE === "publisher") {
          try {
            await apiFetch(`${API}/events/${eventId}/attending/`, {
              method: "POST",
              body: JSON.stringify({ op: "join" }),
            });
            try {
              const latest = await apiFetch(`${API}/events/${eventId}/`);
              setServerAttending(Number(latest?.attending_count ?? 0));
            } catch { }
          } catch (_) { }
        } else {
          const maybeJoinWhenLive = async () => {
            try {
              const ev = await apiFetch(`${API}/events/${eventId}/`);
              if (ev?.is_live) {
                await apiFetch(`${API}/events/${eventId}/attending/`, {
                  method: "POST",
                  body: JSON.stringify({ op: "join" }),
                });
                try {
                  const latest = await apiFetch(`${API}/events/${eventId}/`);
                  setServerAttending(Number(latest?.attending_count ?? 0));
                } catch { }
                return true;
              }
            } catch { }
            return false;
          };
          if (!(await maybeJoinWhenLive())) {
            const timer = setInterval(async () => {
              if (await maybeJoinWhenLive()) clearInterval(timer);
            }, 2000);
          }
        }

        try {
          const existingUsers = client.remoteUsers || [];
          existingUsers.forEach((u) => {
            setRemoteUsers((prev) => {
              const cur = prev[u.uid] || { uid: u.uid };
              const copy = { ...cur };
              if (u.videoTrack) copy.videoTrack = u.videoTrack;
              if (u.audioTrack) copy.audioTrack = u.audioTrack;
              return { ...prev, [u.uid]: copy };
            });
          });
        } catch { }

        // Tracks
        setPermission("pending");
        try {
          if (localAudioTrack) {
            await client.unpublish(localAudioTrack);
            try { localAudioTrack.stop(); localAudioTrack.close(); } catch {}
          }

          const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
            { echoCancellation: true, noiseSuppression: true },
            { encoderConfig: "720p" }
          );
          await micTrack.setEnabled(micOn);

          setLocalAudioTrack(micTrack);
          setLocalVideoTrack(camTrack);

          // publish first so remotes get a fresh "user-published:video"
          await client.publish([micTrack, camTrack]);

          // now reflect the UI toggle for the camera
          await camTrack.setEnabled(camOn);
          setPermission("granted");
        } catch (err) {
          setPermission("denied");
          console.warn("Failed to access camera/microphone:", err);
        }
        setJoined(true);
      } catch (err) {
        console.error("❌ Join failed:", err);
        setJoinErr(err?.message || "Failed to join meeting.");
      }
    })();

    return () => {
      (async () => {
        try {
          localAudioTrack?.stop?.();
          localAudioTrack?.close?.();
          localVideoTrack?.stop?.();
          localVideoTrack?.close?.();
          try { screenAudioTrack?.stop?.(); screenAudioTrack?.close?.(); } catch { }
        } catch { }
        try {
          await clientRef.current?.leave?.();
        } catch { }
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  
  useEffect(() => {
  const fetchQuestions = async () => {
    try {
      const eid = await getNumericEventId();
      if (!eid) return;
      const data = await apiFetch(`${API}/interactions/questions?event_id=${eid}`);
      if (Array.isArray(data)) {
        setQna(
          data.map((q) => ({
            id: q.id,
            q: q.content,
            votes: q.upvote_count ?? q.upvotes_count ?? q.votes ?? 0,
            by: q.username || `User ${q.user_id}`,
            voters: q.user_upvoted ? ["You"] : [],
            upvoters: q.upvoters || [],  // NEW: Include full upvoters list
            user_id: q.user_id,
            created_at: q.created_at,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch QA questions:", err);
    }
  };

  if (joined) fetchQuestions();
}, [joined, event?.id]);



  useEffect(() => {
  const handler = async () => {
    if (endedRef.current) return;
    const eid = await getNumericEventId();
    if (!eid) return;

    // 🆕 ADD THIS: Stop recording if host closes browser
    if (ROLE === "publisher") {
      const stopBlob = new Blob([JSON.stringify({ action: "end" })], {
        type: "application/json",
      });
      navigator.sendBeacon?.(`${API}/events/${eid}/live-status/`, stopBlob);
    }

    // Existing attendance beacon
    const attendBlob = new Blob([JSON.stringify({ op: "leave" })], {
      type: "application/json",
    });
    navigator.sendBeacon?.(`${API}/events/${eid}/attending/`, attendBlob);
  };

  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, []);

  // Reflect toggles to tracks
  useEffect(() => {
    if (!localAudioTrack) return;
    localAudioTrack.setEnabled(micOn).catch(() => { });
  }, [micOn, localAudioTrack]);
  useEffect(() => {
    if (!localVideoTrack) return;

    // While screen sharing, don't try to toggle the screen track with the "Camera" button.
    // Also guard in case the track doesn’t expose setEnabled.
    if (sharing) return;
    if (typeof localVideoTrack.setEnabled === "function") {
      localVideoTrack.setEnabled(camOn).catch(() => { });
    }
    // 🔧 If turning camera ON after a share, make sure the video track is published.
    if (camOn) {
      try { clientRef.current?.publish?.(localVideoTrack); } catch { /* already published */ }
    }
  }, [camOn, localVideoTrack, sharing]);
  // Screen share toggle (new front, wired to Agora)
  const toggleShare = useCallback(async () => {
  const client = clientRef.current;
  if (!client) return;

  // START SCREEN SHARE
  if (!sharing) {
    try {
      // May return LocalVideoTrack OR [LocalVideoTrack, LocalAudioTrack]
      const screen = await AgoraRTC.createScreenVideoTrack(
        { encoderConfig: "1080p_1" },
        "auto"
      );

      let screenVideoTrack, screenMicTrack;
      if (Array.isArray(screen)) {
        [screenVideoTrack, screenMicTrack] = screen;
      } else {
        screenVideoTrack = screen;
      }

      // Stop/close current camera video before switching
      if (localVideoTrack) {
        await client.unpublish(localVideoTrack);
        try { localVideoTrack.stop(); localVideoTrack.close(); } catch {}
      }

      // Hint to the browser this is detailed content (text/IDE/slides)
      try { screenVideoTrack.setContentHint?.("detail"); } catch {}

      // Point local video to the screen and flip UI
      setLocalVideoTrack(screenVideoTrack);
      if (screenMicTrack) setScreenAudioTrack(screenMicTrack);
      setSharing(true);
      setPinnedId("you");
      setActiveSpeakerId("you");

      // Publish screen (and its audio if present)
      const pub = screenMicTrack ? [screenVideoTrack, screenMicTrack] : screenVideoTrack;
      await client.publish(pub);

      // If user stops sharing from the browser UI, auto-restore camera
      const onEnded = async () => {
        try {
          await client.unpublish(screenVideoTrack);
          try { screenVideoTrack.stop(); screenVideoTrack.close(); } catch {}

          if (screenMicTrack) {
            await client.unpublish(screenMicTrack);
            try { screenMicTrack.stop(); screenMicTrack.close(); } catch {}
          }
          setScreenAudioTrack(null);

          // If any old mic exists, unpublish/close before creating new
          if (localAudioTrack) {
            await client.unpublish(localAudioTrack);
            try { localAudioTrack.stop(); localAudioTrack.close(); } catch {}
          }

          // Create mic+cam again
          const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
            { echoCancellation: true, noiseSuppression: true },
            { encoderConfig: "720p" }
          );
          await micTrack.setEnabled(micOn);

          setLocalAudioTrack(micTrack);
          setLocalVideoTrack(camTrack);

          // 🔧 PRIME one frame so remotes reliably receive `user-published:video`
          try { await camTrack.setEnabled(true); } catch {}
          await client.publish([micTrack, camTrack]);
          // Now reflect the actual UI state
          try { await camTrack.setEnabled(camOn); } catch {}

          setPinnedId(null);
          setSharing(false);
        } catch (e) {
          console.warn("Failed to auto-restore camera after screen end:", e);
          setSharing(false);
        }
      };

      screenVideoTrack.on("track-ended", onEnded);
      screenShareRef.current = { track: screenVideoTrack, onEnded };
    } catch (err) {
      setSharing(false);
      console.warn("Failed to share screen:", err);
    }
    return;
  }

  // STOP SCREEN SHARE
  try {
    setSharing(false);

    // Detach the auto-restore handler to avoid double-restore/forcing cam on
    try {
      const { track, onEnded } = screenShareRef.current || {};
      if (track?.off && onEnded) track.off("track-ended", onEnded);
    } catch {}
    screenShareRef.current = { track: null, onEnded: null };

    // Unpublish & close the current (screen) video track
    if (localVideoTrack) {
      await client.unpublish(localVideoTrack);
      try { localVideoTrack.stop(); localVideoTrack.close(); } catch {}
    }

    // Unpublish & close screen audio if present
    if (screenAudioTrack) {
      await client.unpublish(screenAudioTrack);
      try { screenAudioTrack.stop(); screenAudioTrack.close(); } catch {}
      setScreenAudioTrack(null);
    }

    // Make sure a previous mic isn't still published
    if (localAudioTrack) {
      await client.unpublish(localAudioTrack);
      try { localAudioTrack.stop(); localAudioTrack.close(); } catch {}
    }

    // Avoid keeping a dead screen track in state
    setLocalVideoTrack(null);

    setPinnedId(null);

    // Recreate mic + camera
    const [micTrack, camTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
      { echoCancellation: true, noiseSuppression: true },
      { encoderConfig: "720p" }
    );
    await micTrack.setEnabled(micOn);

    setLocalAudioTrack(micTrack);
    setLocalVideoTrack(camTrack);

    // Publish first so audience receives a fresh user-published: "video"
    await client.publish([micTrack, camTrack]);

    // Then apply the Camera toggle
    await camTrack.setEnabled(camOn);
  } catch (err) {
    console.warn("Failed to stop screen share:", err);
  } finally {
    setSharing(false);
  }
}, [
  sharing,
  localVideoTrack,
  localAudioTrack,   // <-- include this so the cleanup in both branches sees latest
  screenAudioTrack,
  micOn,
  camOn
]);

  // Participants/tiles
  const visibleTiles = useMemo(() => {
    const list = [];
    list.push({
      id: "you",
      name: "You",
      you: true,
      videoTrack: localVideoTrack,
      muted: !micOn,
      camOff: sharing ? false : !camOn,
    });
    Object.values(remoteUsers).forEach((u) => {
      const rid = userIdFromRemoteUid(u.uid);
      const displayName = (Number.isInteger(rid) && userCache[rid]?.name) ? userCache[rid].name : `User ${u.uid}`;
      list.push({
        id: String(u.uid),
        name: displayName,
        you: false,
        videoTrack: u.videoTrack || null,
        muted: false,
        camOff: !u.videoTrack,
      });
    });
    return list;
  }, [remoteUsers, userCache, localVideoTrack, micOn, camOn, sharing]);

  const isPublisher = useMemo(
    () => /(^|&)role=publisher(&|$)/.test(window.location.search),
    []
  );

  // ✅ Show exactly what backend says (0 until first poll lands)
  const participantCount = useMemo(() => {
    return (joined ? 1 : 0) + Object.keys(remoteUsers).length;
  }, [joined, remoteUsers]);


  // --- add below your other API helpers ---
  const normalizeResults = (data) => (Array.isArray(data) ? data : (data?.results || []));

const looksLikeGroupType = (t) => {
  const s = String(t || "").toLowerCase();
  return ["group", "channel", "room", "space", "broadcast"].some(k => s.includes(k));
};

const normalizeConv = (c, meId) => {
  const out = { ...c };
  const rk = String(c?.room_key || c?.room || c?.key || "");
  const partsCount = participantsOf(c).length;
  const t = String(c?.type || "").toLowerCase();

  if (rk.startsWith("event:")) out.is_group = true;
  if (rk.startsWith("dm:")) out.is_group = false;
  if (["direct","dm","private","one_to_one","one-to-one","one2one"].includes(t)) out.is_group = false;
  if (["group","channel","room","space","broadcast"].some(k => t.includes(k))) out.is_group = true;

  // OVERRIDE: 1–2 participants → DM
  if (!rk.startsWith("event:") && partsCount > 0 && partsCount <= 2) {
    out.is_group = false;
  }
  if (typeof out.is_group !== "boolean") out.is_group = partsCount >= 3;
  return out;
};


  let _convCache = { items: [], ts: 0 };
const CONV_TTL = 10_000; // 10s cache

const listMyConversations = async (force = false) => {
  const now = Date.now();
  if (!force && now - _convCache.ts < CONV_TTL && _convCache.items.length) {
    return _convCache.items;
  }
  if (!canPollNow()) return _convCache.items;

  const data = await apiFetch(`${API}/messaging/conversations/?limit=100&ordering=-updated_at`);
  const raw = normalizeResults(data);
  const me = Number(myUserId);
  const items = raw.map(c => normalizeConv(c, me));
  _convCache = { items, ts: now };
  return items;
};

  const fetchRecentMessages = async (convId, limit = 25) => {
    const url = `${API}/messaging/conversations/${convId}/messages/?ordering=-created_at,-id&limit=${limit}`;
    const data = await apiFetch(url);
    const items = Array.isArray(data) ? data : (data?.results || []);
    // your UI wants oldest→newest
    return sortByCreatedAtAsc(items);
  };

  // Infer a user's display name (no /users/:id endpoint needed)
  const fetchUserLite = async (userId, meId) => {
    const idNum = Number(userId);
    if (!Number.isFinite(idNum)) return { id: userId, name: `User ${userId}` };

    try {
      // 1) Try the conversations directory (often includes participant objects with names)
      const convs = await listMyConversations();
      for (const c of convs) {
        const parts = participantsOf(c);
        if (!parts.includes(idNum)) continue;

        // Look for a participant object that matches this id and has a name/username
        const buckets = [
          c?.participants, c?.members, c?.users, c?.other_users,
          c?.participants_set, c?.members_set, c?.user_set, c?.people
        ].filter(Boolean).flat();

        for (const x of buckets) {
          const candId = Number(
            x?.id ?? x?.user?.id ?? x?.member?.id ?? x?.owner?.id ?? x?.participant?.id
          );
          if (candId === idNum) {
            const nm =
              x?.name || x?.username ||
              x?.user?.name || x?.user?.username ||
              x?.member?.name || x?.member?.username;
            if (nm) return { id: idNum, name: nm };
          }
        }
      }

      // 2) If we have (or can find) a DM with this user, peek recent messages for sender_name
      const dmId = await tryFindDMWith(meId, idNum);
      if (dmId) {
        const page = await fetchRecentMessages(dmId, 25);
        const m = (page || []).find(msg => Number(msg?.sender_id) === idNum);
        const nm = m?.sender_name || m?.sender?.name || m?.sender?.username;
        if (nm) return { id: idNum, name: nm };
      }
    } catch {
      // swallow – fall back below
    }

    return { id: idNum, name: `User ${idNum}` };
  };

  
  const dmDirPollRef = useRef(null);

  const startDMDirectoryPolling = useCallback(() => {
  if (dmDirPollRef.current) clearInterval(dmDirPollRef.current);

  dmDirPollRef.current = setInterval(async () => {
    if (!canPollNow() || _inflight.dmdir) return;
    _inflight.dmdir = true;
    try {
      const me = Number(myUserId);
      if (!Number.isFinite(me)) return;

      // Use cached list unless TTL expired
      const list = await listMyConversations(false);
      const allDirect = list.filter(isDirectConv);

      const activePeerIds = Object.keys(remoteUsersRef.current)
        .map((k) => userIdFromRemoteUid(k))
        .filter((n) => Number.isFinite(n) && n !== me);

      const priority = allDirect.filter((c) => {
        const parts = participantsOf(c);
        return parts.includes(me) && parts.some((p) => activePeerIds.includes(p));
      });

      const top = allDirect.slice(0, 10);
      const selected = [];
      const seen = new Set();
      for (const c of [...priority, ...top]) {
        const cid = toId(c?.id);
        if (!cid || seen.has(cid)) continue;
        seen.add(cid);
        selected.push(c);
      }

      const nextCountsByCid = {};
      const nextCountsByPeer = {};

      for (const c of selected) {
        const cid = toId(c?.id);
        if (!cid) continue;

        let unread = 0;
        if (typeof c?.unread_count === "number") {
          unread = c.unread_count;
        } else {
          const page = await fetchRecentMessages(cid, 25);
          unread = (page || []).filter((m) => !m.is_read && Number(m?.sender_id) !== me).length;
          if (!Number.isFinite(getPeerIdFromConv(c, me))) {
            const last = (page || [])[page.length - 1];
            const sid = Number(last?.sender_id);
            if (Number.isFinite(sid) && sid !== me) {
              nextCountsByPeer[sid] = (nextCountsByPeer[sid] || 0) + unread;
            }
          }
        }
        nextCountsByCid[cid] = unread;

        const peer = getPeerIdFromConv(c, me);
        if (Number.isFinite(peer)) {
          nextCountsByPeer[peer] = (nextCountsByPeer[peer] || 0) + unread;
        }
      }

      setUnreadDMCounts((prev) => ({ ...prev, ...nextCountsByCid }));
      setDmUnreadByPeer((prev) => ({ ...prev, ...nextCountsByPeer }));
    } finally {
      _inflight.dmdir = false;
    }
  }, 10000); // was 5000ms → 10000ms
}, [myUserId, listMyConversations]);
  const stopDMDirectoryPolling = useCallback(() => {
    if (dmDirPollRef.current) {
      clearInterval(dmDirPollRef.current);
      dmDirPollRef.current = null;
    }
  }, []);


  useEffect(() => {
    if (!Number.isFinite(Number(myUserId))) return;
    startDMDirectoryPolling();
    return () => stopDMDirectoryPolling();
  }, [myUserId, startDMDirectoryPolling, stopDMDirectoryPolling]);


  useEffect(() => {
    if (rightTab === "chat") {
      const el = chatListRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [rightTab, chatSubTab, conversationId]);


  const participantsOf = (c) => {
    if (!c) return [];
    const out = new Set();

    // Flat arrays of ids (strings or numbers)
    [
      "participant_ids", "participants_ids", "members_ids", "users_ids", "user_ids",
      "member_ids", "participant_pks", "participants_pks"
    ].forEach(k => {
      const arr = c?.[k];
      if (Array.isArray(arr)) {
        arr.forEach(v => { const n = Number(v); if (Number.isFinite(n)) out.add(n); });
      }
    });

    // Common single-id fields you see in DM serializers
    ["sender_id", "recipient_id", "other_user_id", "user1_id", "user2_id",
      "user_a_id", "user_b_id", "owner_id", "creator_id", "partner_id"].forEach(k => {
        const n = Number(c?.[k]);
        if (Number.isFinite(n)) out.add(n);
      });

    // Nested participant objects in various keys
    const buckets = [
      c?.participants, c?.members, c?.users, c?.participants_set, c?.members_set,
      c?.user_set, c?.other_users, c?.membership, c?.people
    ].filter(Boolean).flat();

    for (const x of buckets) {
      if (!x) continue;
      if (typeof x === "object") {
        const cand = [
          x?.id, x?.pk,
          x?.user?.id, x?.user?.pk,
          x?.member?.id, x?.member?.pk,
          x?.owner?.id, x?.owner?.pk,
          x?.participant?.id, x?.participant?.pk,
        ];
        for (const v of cand) {
          const n = Number(v);
          if (Number.isFinite(n)) { out.add(n); break; }
        }
      } else {
        const n = Number(x);
        if (Number.isFinite(n)) out.add(n);
      }
    }

    return Array.from(out);
  };


  const getPeerIdFromConv = (c, meId) => {
   if (!c) return null;
   // 1) Preferred: participants array(s)
   const parts = participantsOf(c).map(Number).filter(Number.isFinite);
   if (parts.length) {
     const peer = parts.find((p) => Number(p) !== Number(meId));
     if (Number.isFinite(peer)) return Number(peer);
   }
   // 2) Common flat fields
   const candidates = [c?.recipient_id, c?.other_user_id, c?.user1_id, c?.user2_id, c?.sender_id]
     .map(Number)
     .filter((x) => Number.isFinite(x) && x !== Number(meId));
   if (candidates.length) return candidates[0];
   // 3) Fallback: some serializers include last/latest message inline
   const lm = c?.last_message || c?.latest_message || c?.recent_message;
   const sid = Number(lm?.sender_id);
   if (Number.isFinite(sid) && sid !== Number(meId)) return sid;
   return null;
 };
  const isDirectConv = (c) => {
    if (!c) return false;
    const rk = String(c?.room_key || c?.room || c?.key || "");
    if (rk.startsWith("event:")) return false;        // groups
    if (rk.startsWith("dm:")) return true;            // canonical DMs

    const parts = participantsOf(c);
    if (parts.length > 0 && parts.length <= 2) return true; // member count wins

    const t = String(c?.type || "").toLowerCase();
    if (["direct","dm","private","one_to_one","one-to-one","one2one"].includes(t)) return true;
    if (["group","channel","room","space","broadcast"].some(k => t.includes(k))) return false;

    // fallback only if nothing else decided it
    return typeof c.is_group === "boolean" ? !c.is_group : parts.length <= 2;
  };

  const tryFindDMWith = async (meId, peerId) => {
  const a = Number(meId), b = Number(peerId);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  // ✅ Add at top of reconcileGroup()
const rk = await getEventRoomKey();
console.debug("[CHAT] reconcile: roomKey=", rk);

// IMPORTANT: filter only this event's group
const list = await listMyConversations(true);
const groups = (list || []).filter(
  c => !isDirectConv(c) && String(c?.room_key || "") === String(rk)
);
console.debug("[CHAT] candidates for rk", rk, groups.map(g => ({ id: g.id, room_key: g.room_key }))); // or your cache-aware loader
  const matches = list.filter((c) => {
    if (String(c?.room_key || "").startsWith("event:")) return false;
    const parts = participantsOf(c);
    return parts.includes(a) && parts.includes(b) && parts.length <= 2; // ignore is_group
  });

  if (!matches.length) return null;
  matches.sort((x, y) => Number(x?.id) - Number(y?.id));
  return matches[0]?.id ?? null;
};


  const findOrCreateDM = async (recipientId) => {
    const me = Number(myUserId);
    const other = Number(recipientId);
    if (!Number.isFinite(me) || !Number.isFinite(other) || me === other) {
      throw new Error("Cannot start DM: invalid users.");
    }

    // 1) Try to re-use an existing thread (created by either side)
    const existing = await tryFindDMWith(me, other);
    if (existing) return toId(existing);

    // 2) Create (your existing endpoint)
    const created = await ensureConversation(other); // POST /messaging/conversations/ { recipient_id }

    // 3) IMPORTANT: re-resolve canonically in case the server already had one
    const canonical = await tryFindDMWith(me, other);
    if (canonical) return toId(canonical);

    // 4) Fallback to the id we just got back
    if (created) return toId(created);

    throw new Error("DM: couldn’t find or create a single shared conversation.");
  };
  // Stage tile: prefer first remote with video; then local
  const stageTile = useMemo(() => {

  if (sharing) {
    const me = visibleTiles.find(t => t.you && t.videoTrack && !t.camOff);
    if (me) return me;
  }
  // 1) Pinned beats everything
  if (pinnedId) {
    const pinned = visibleTiles.find(t => t.id === pinnedId);
    if (pinned) return pinned;
  }

  // 2) Anyone currently sending video (screen or cam)
  const withVideo = visibleTiles.filter(t => t.videoTrack && !t.camOff);

  // Audience: prefer host's video if present
  if (ROLE !== "publisher") {
    const hostVideo = withVideo.find(t => hostIds.includes(Number(t.id)));
    if (hostVideo) return hostVideo;
  }

  // Publisher: prefer my own video if present
  if (ROLE === "publisher") {
    const meVideo = withVideo.find(t => t.you);
    if (meVideo) return meVideo;
  }

  // Otherwise: first video tile, then old fallbacks
  if (withVideo.length) return withVideo[0];
  if (ROLE === "publisher") return visibleTiles.find(t => t.you) || visibleTiles[0] || null;
  const hostFallback = visibleTiles.find(t => hostIds.includes(Number(t.id)));
  return hostFallback || visibleTiles.find(t => t.you) || visibleTiles[0] || null;
}, [visibleTiles, pinnedId, hostIds, sharing]);
  // Stage video ref play/stop
  const stageRef = useRef(null);
  useEffect(() => {
  const track = stageTile?.videoTrack;
  if (track && !stageTile?.camOff && stageRef.current) {
    try { track.play(stageRef.current); } catch {}
    return () => { try { track.stop(); } catch {} };
  }
}, [stageTile?.id, stageTile?.camOff, stageTile?.videoTrack]);

  // Chat: sub-tab polling control (kept)
  useEffect(() => {
    if (rightTab === "chat" && chatSubTab === 1 && conversationId) {
      startChatPolling(conversationId);
      setChatErr("");
      return () => stopChatPolling();
    }
    stopChatPolling();
  }, [rightTab, chatSubTab, conversationId]);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = Number(myUserId);
        if (!Number.isFinite(me)) return;

        // Pull a (cached) list of my conversations
        // ✅ Add at top of reconcileGroup()
const rk = await getEventRoomKey();
console.debug("[CHAT] reconcile: roomKey=", rk);

// IMPORTANT: filter only this event's group
const list = await listMyConversations(true);
const groups = (list || []).filter(
  c => !isDirectConv(c) && String(c?.room_key || "") === String(rk)
);
console.debug("[CHAT] candidates for rk", rk, groups.map(g => ({ id: g.id, room_key: g.room_key })));

        // Build userId -> unread count map from convId -> unreadDMCounts
        const map = {};
        for (const c of list) {
          if (!isDirectConv(c)) continue;
          const cid = toId(c?.id);
          const peer = getPeerIdFromConv(c, me);
          const unread = unreadDMCounts[cid] || 0;
          if (Number.isFinite(peer) && unread > 0) {
            map[peer] = (map[peer] || 0) + unread;
          }
        }
        if (!cancelled) setDmUnreadByPeer(map);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [unreadDMCounts, myUserId]);

  useEffect(() => {
  let cancelled = false;

  const sweep = async () => {
    try {
      const me = Number(myUserId);
      if (!Number.isFinite(me)) return;
      if (!canPollNow() || document.hidden) return;
      const all = await listMyConversations(false);// force fresh when sweeping

      // 1) If the user explicitly picked a peer, prefer that canonical thread
      let targetCid = null;
      let peer = null;
      try {
        const s = sessionStorage.getItem("last_dm_peer_id");
        const n = Number(s);
        peer = Number.isFinite(n) && n !== me ? n : null;
      } catch {}

      if (peer) {
        const good = all.filter((c) => !c?.is_group && participantsOf(c).includes(me) && participantsOf(c).includes(peer));
        if (good.length) {
          good.sort((x, y) => Number(x.id) - Number(y.id));
          targetCid = toId(good[0]?.id);
        }
      }

      // 2) Fallback: attach to the most recently updated DM with UNREAD>0 (someone messaged me)
      if (!targetCid) {
        const dms = all.filter((c) => !c?.is_group && participantsOf(c).includes(me));
        // sort by updated_at desc, then id asc
        dms.sort((x, y) => {
          const tx = Date.parse(x?.updated_at || 0) || 0;
          const ty = Date.parse(y?.updated_at || 0) || 0;
          if (ty !== tx) return ty - tx;
          return Number(x?.id) - Number(y?.id);
        });
        const unreadFirst = dms.find((c) => Number(c?.unread_count) > 0);
        if (unreadFirst) targetCid = toId(unreadFirst.id);
      }

      if (targetCid && !cancelled && targetCid !== toId(hostDMId)) {
        mountDM(targetCid);
      }
    } catch {}
  };

  const t = setInterval(sweep, 15000);
  sweep();
  return () => { cancelled = true; clearInterval(t); };
}, [myUserId]);

  

  useEffect(() => {
  let cancelled = false;

  const reconcileGroup = async () => {
  try {
    const rk = await getEventRoomKey();
    console.debug("[CHAT] reconcile: roomKey=", rk);
    if (document.hidden || !canPollNow()) return;
    const list = await listMyConversations(false);
    const groups = (list || []).filter(
      (c) => !isDirectConv(c) && String(c?.room_key || "").trim().toLowerCase() === String(rk).trim().toLowerCase()
    );
    console.debug(
      "[CHAT] candidates for rk",
      rk,
      groups.map((g) => ({ id: g.id, room_key: g.room_key }))
    );

    if (!groups.length) return;

    // score/pick “best”
    const titleLC = String(event?.title || "").toLowerCase();
    const scored = groups
      .map((c) => {
        const id = toId(c?.id);
        if (!id) return null;
        const nm = String(c?.title || c?.name || "").toLowerCase();
        const parts = participantsOf(c).length;
        const updated = Date.parse(c?.updated_at || 0) || 0;
        let score = 0;
        if (titleLC && nm.includes(titleLC)) score += 10;
        score += Math.min(5, parts);
        return { id, score, updated };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || b.updated - a.updated || (a.id - b.id));

    const best = scored[0]?.id;
    if (best && best !== toId(groupConversationId)) {
      setGroupConversationId(best);
      stopGroupPolling();
      startGroupPolling(best);
      try {
        const msgs = await fetchGroupMessages(best);
        if (msgs && msgs.length) setGroupMessages(msgs); // keep old messages on backoff/empty
      } catch (e) {
        // keep existing messages
      }
    }
  } catch {}
};

  const t = setInterval(reconcileGroup, 8000);
  reconcileGroup();
  return () => { cancelled = true; clearInterval(t); };
}, [event?.title]);


  // Auto-scroll chat lists
  useEffect(() => {
    const el = chatListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chatMessages.length, groupMessages.length]);

  useEffect(() => {
    if (rightTab === "chat" && chatSubTab === 0 && groupMessages.length) {
      (async () => {
        await markMessagesRead(groupMessages);
        setGroupMessages(prev => prev.map(m =>
          (!m.is_read && Number(m.sender_id) !== Number(myUserId))
            ? { ...m, is_read: true }
            : m
        ));
        setUnreadGroupCount(0);
      })();
    }
  }, [rightTab, chatSubTab, groupMessages.length]);

  // Seed event → hostIds + userCache (kept, light tweak)
  useEffect(() => {
    (async () => {
      const eid = await getNumericEventId();
      if (!eid) return;
      try {
        const ev = await apiFetch(`${API}/events/${eid}/`);
        const ids = [ev?.organizer_id, ev?.owner_id, ev?.host_user_id, ev?.created_by_id, ev?.user_id].filter((x) =>
          Number.isInteger(x)
        );
        if (ids.length) setHostIds(ids);
        if (ROLE !== "publisher" && Number.isInteger(ev?.host_user_id)) {
          setActiveSpeakerId(String(ev.host_user_id));
        }

        const seed = {};
        const take = (o) => {
          if (!o?.id) return;
          const nm = o.name || o.username || `${o.first_name ?? ""} ${o.last_name ?? ""}`.trim();
          seed[o.id] = { name: nm || `User ${o.id}` };
        };
        take(ev?.organizer);
        take(ev?.owner);
        take(ev?.created_by);
        take(ev?.user);
        take(ev?.host_user);
        if (Object.keys(seed).length) setUserCache((p) => ({ ...p, ...seed }));
      } catch { }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user") || localStorage.getItem("auth") || localStorage.getItem("profile");
      if (!raw) return;
      const o = JSON.parse(raw);
      const nm = o?.name || o?.username || `${o?.first_name ?? ""} ${o?.last_name ?? ""}`.trim();
      const idNum = Number(myUserId);
      if (Number.isFinite(idNum) && nm) {
        setUserCache(prev => prev[idNum] ? prev : ({ ...prev, [idNum]: { name: nm } }));
      }
    } catch { }
  }, [myUserId]);


  // Leave meeting (instant redirect; server calls in background)
  const leaveMeeting = useCallback(() => {
  if (leavingRef.current) return;
  leavingRef.current = true;

  getNumericEventId().then((eid) => {
    if (!eid) return;

    if (ROLE === 'publisher' && !endedRef.current) {
      endedRef.current = true;

      if (recordingData?.resourceId && recordingData?.sid && recordingData?.channel) {
        apiFetch(`${API}/event-recordings/${eid}/stop/`, {
          method: 'POST',
          body: JSON.stringify({
            resourceId: recordingData.resourceId,
            sid: recordingData.sid,
            channel: recordingData.channel,
          }),
          keepalive: true,
        }).catch(() => {});
      }

      apiFetch(`${API}/events/${eid}/live-status/`, {
        method: 'POST',
        body: JSON.stringify({ action: 'end' }),
        keepalive: true,
      }).catch(() => {});

      // ✅ use the real path your backend exposes:
      apiFetch(`${API}/event-recordings/${eid}/sync_recording/`, {  // <-- try sync_recording
        method: 'POST',
        keepalive: true,
      }).catch(() => {});
    } else {
      apiFetch(`${API}/events/${eid}/attending/`, {
        method: 'POST',
        body: JSON.stringify({ op: 'leave' }),
        keepalive: true,
      }).catch(() => {});
    }
  });

  // local cleanup (no awaits)
  try { localAudioTrack?.stop?.(); localAudioTrack?.close?.(); } catch {}
  try { localVideoTrack?.stop?.(); localVideoTrack?.close?.(); } catch {}
  try { stopChatPolling(); setConversationId(null); setChatMessages([]); } catch {}
  try { stopGroupPolling(); setGroupConversationId(null); setGroupMessages([]); } catch {}
  try { clientRef.current?.leave?.(); } catch {}

  // redirect after a short tick so POSTs start
  setTimeout(() => {
    try {
      if (window.opener && !window.opener.closed) {
        try { window.opener.location.href = exitUrl; } catch {}
        window.close();
        window.location.replace(exitUrl);
      } else {
        window.location.replace('/myevents'); // or exitUrl
      }
    } catch {
      window.location.href = '/myevents';
    }
  }, 60);
}, [API, ROLE, exitUrl, recordingData, stopChatPolling, stopGroupPolling, setConversationId, setChatMessages, setGroupConversationId, setGroupMessages, localAudioTrack, localVideoTrack]);

  // Visible participants list for sidebar
  const participants = useMemo(() => {
    return visibleTiles.map((t) => ({
      id: t.id,
      name: t.name,
      role: t.you ? "You" : "Audience",
      you: t.you,
      muted: t.you ? !micOn : false,
      camOff: t.camOff,
    }));
  }, [visibleTiles, micOn]);

  // Title/code
  const title = event?.title || "Live Event";
const [code, setCode] = useState("default");
useEffect(() => {
  (async () => {
    const eid = await getNumericEventId();
    setCode(String(eid || "default"));
  })();
}, [slug]);
  /* =========================
     Render (new front)
     ========================= */
  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] text-gray-900">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 sm:px-6 bg-white/80 backdrop-blur border-b border-gray-200">
        <button className="rounded-xl border border-gray-300 bg-white p-2 hover:bg-gray-50" onClick={() => (window.location.href = exitUrl)}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-extrabold sm:text-base text-gray-900">{title}</h1>
          <Pill className="bg-red-500 text-white shadow-sm">
            <Dot className="h-4 w-4 text-white" /> {joined ? "Recording" : "Connecting…"}
          </Pill>
        </div>
        <div className="ml-auto hidden items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs text-gray-800 sm:flex shadow-sm">
          <span>QnA Question</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Layout */}
      <div className="mx-auto grid max-w-7xl grid-cols-12 gap-4 px-4 pb-24 sm:px-6 lg:gap-6">
        {/* Stage */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9">
          <div className="rounded-2xl border border-gray-200 bg-white p-2 sm:p-3 shadow-sm">
            <div className="rounded-xl border border-gray-200 bg-white p-2 sm:p-3">
              <div className="aspect-video rounded-lg border border-gray-200 bg-gray-200 relative overflow-hidden">
                {stageTile?.videoTrack && !stageTile?.camOff ? (
                  <div ref={stageRef} className="absolute inset-0 bg-black" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-zinc-900">
                    <div
                      className="flex h-28 w-28 items-center justify-center rounded-md"
                      style={{ background: colorForSenderId(stageTile?.id || stageTile?.name || 0) }}
                    >
                      <span className="text-6xl font-bold text-white leading-none">
                        {(stageTile?.name || "U").trim().charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                {/* bottom-left name label */}
                {stageTile && (
                  <div className="absolute left-3 bottom-3">
                    <Pill className="bg-black/60 text-white border border-white/20">
                      <span className="font-semibold">{stageTile.name || "User"}</span>
                      {stageTile.you && <span className="opacity-80">(You)</span>}
                    </Pill>
                  </div>
                )}
              </div>
            </div>

            {/* Filmstrip */}
            <div className="mt-3 grid grid-cols-4 gap-3">
              {visibleTiles
                .filter(t => t.id !== stageTile?.id)
                .slice(0, 4)
                .map((t) => (
                  <div key={t.id} className="cursor-pointer" onClick={() => setPinnedId(t.id)}>
                    <VideoTile id={t.id} name={t.name} you={t.you}
                      muted={t.muted} camOff={t.camOff} videoTrack={t.videoTrack}
                    />
                  </div>
                ))}
            </div>

            {/* Footer controls */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <span className="grid h-7 w-7 place-items-center rounded-md border border-gray-300 bg-white shadow-sm">
                  <Users2 className="h-4 w-4" />
                </span>
                <code className="rounded-md border border-gray-300 bg-white px-2 py-1 shadow-sm">{participantCount}</code>
                <span className="text-gray-500">• {fmtTime(elapsed)}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCamOn((v) => !v)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white shadow-sm ${camOn ? "bg-teal-500 hover:bg-teal-600" : "bg-red-500 hover:bg-red-600"
                    }`}
                  disabled={!joined}
                >
                  {camOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                  <span className="hidden sm:inline">Camera</span>
                </button>
                <button
                  onClick={() => setMicOn((v) => !v)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white shadow-sm ${micOn ? "bg-teal-500 hover:bg-teal-600" : "bg-red-500 hover:bg-red-600"
                    }`}
                  disabled={!joined}
                >
                  {micOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  <span className="hidden sm:inline">Mic</span>
                </button>
                <button
                  onClick={toggleShare}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white shadow-sm ${sharing ? "bg-red-500 hover:bg-red-600" : "bg-teal-500 hover:bg-teal-600"
                    }`}
                  disabled={!joined}
                >
                  <MonitorUp className="h-4 w-4" />
                  <span className="hidden sm:inline">{sharing ? "Stop" : "Share"}</span>
                </button>
                {/* Mobile: open right drawer */}
                <button
                  onClick={() => { setRightOpen(true); setRightTab("chat"); }}
                  className="flex items-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-900 px-3 py-2 text-sm text-white lg:hidden shadow-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Chat</span>
                </button>
              </div>

              <button
                onClick={leaveMeeting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 hover:bg-red-600 px-3 py-2 text-sm text-white shadow-sm"
              >
                <PhoneOff className="h-4 w-4" />
                Leave Meeting
              </button>
            </div>
          </div>
        </div>

        {/* Right column */}
        <aside className="col-span-12 hidden lg:col-span-4 lg:block xl:col-span-3">
          {/* QnA highlight */}
          {/* Questions List */}
          <div className="mt-3 space-y-2 max-h-96 overflow-y-auto">
            {qna
              .sort((a, b) => b.votes - a.votes || new Date(b.created_at) - new Date(a.created_at))
              .map((q) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm overflow-visible"
                >
                  <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                    <span>
                      Asked by <span className="font-semibold text-gray-800">{q.by}</span>
                    </span>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                      Q{q.id}
                    </span>
                  </div>
                  <p className="text-sm leading-snug text-gray-900">{q.q}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-700">
                    {/* Upvote button with tooltip */}
                    <div className="relative">
                      <button
                        onClick={() => handleUpvote(q.id)}
                        onMouseEnter={() => setHoveredQuestion(q.id)}
                        onMouseLeave={() => setHoveredQuestion(null)}
                        className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
                          q.voters?.includes("You")
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span className="font-semibold">{q.votes}</span>
                      </button>

                      {/* Tooltip - ADD onMouseEnter and onMouseLeave here too */}
                      {hoveredQuestion === q.id && q.upvoters && q.upvoters.length > 0 && (
                        <div 
                          onMouseEnter={() => setHoveredQuestion(q.id)}
                          onMouseLeave={() => setHoveredQuestion(null)}
                          className="absolute top-full left-0 mt-2 z-[60] rounded-lg border border-gray-200 bg-white shadow-xl min-w-[180px] max-w-[250px]"
                          style={{ 
                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                          }}
                        >
                          {/* Header */}
                          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                            <div className="text-xs font-semibold text-gray-700">
                              Upvoted by {q.upvoters.length} {q.upvoters.length === 1 ? 'person' : 'people'}
                            </div>
                          </div>
                          
                          {/* List - shows 2 items, scrolls for more */}
                          <div 
                            className="p-2 space-y-1.5 overflow-y-auto"
                            style={{
                              maxHeight: '120px', // Shows 2 items (40px each)
                            }}
                          >
                            {q.upvoters.map((upvoter) => (
                              <div
                                key={upvoter.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: colorForSenderId(upvoter.id) }}
                                />
                                <span className="text-xs text-gray-700 truncate font-medium">
                                  {upvoter.name || upvoter.username || `User ${upvoter.id}`}
                                </span>
                              </div>
                            ))}
                          </div>
                          
                          {/* Arrow pointer pointing UP */}
                          <div 
                            className="absolute bottom-full left-6 w-0 h-0" 
                            style={{
                              borderLeft: '6px solid transparent',
                              borderRight: '6px solid transparent',
                              borderBottom: '6px solid white',
                              filter: 'drop-shadow(0 -1px 1px rgba(0,0,0,0.05))'
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <span className="text-xs text-gray-500">
                      {new Date(q.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          {/* Participants / Chat tabs */}
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex gap-2 p-2">
              <button
                onClick={() => setRightTab("participants")}
                className={`flex-1 rounded-xl border px-3 py-1.5 text-xs font-semibold ${rightTab === "participants" ? "border-gray-300 bg-gray-200" : "border-transparent hover:bg-gray-100"
                  }`}
              >
                PARTICIPANTS

              </button>
              <button
                onClick={() => setRightTab("chat")}
                className={`flex-1 rounded-xl border px-3 py-1.5 text-xs font-semibold ${rightTab === "chat" ? "border-gray-300 bg-gray-200" : "border-transparent hover:bg-gray-100"
                  }`}
              >
                CHAT{chatTabBadgeCount > 0 && (
                  <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded bg-red-600 px-1 text-[10px] font-bold text-white">
                    <span> {chatTabBadgeCount} </span>
                  </span>
                )}
              </button>
            </div>

            {rightTab === "participants" ? (
              <div className="max-h-[52vh] space-y-2 overflow-y-auto px-3 pb-3">
                {/* current user */}
                <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">You</div>
                    <div className="text-xs text-gray-500">{ROLE === "publisher" ? "Host" : "Audience"}</div>
                  </div>
                </div>
                {Object.values(remoteUsers).map((u) => {
                  const rid = userIdFromRemoteUid(u.uid);
                  const canDirect = Number.isInteger(rid) && rid !== Number(myUserId);
                  const displayName = userCache[rid]?.name || `User ${u.uid}`;
                  return (
                    <div key={String(u.uid)} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{displayName}</div>
                        <div className="text-xs text-gray-500">Connected</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {Number.isInteger(rid) && dmUnreadByPeer[rid] > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                            {dmUnreadByPeer[rid] > 99 ? "99+" : dmUnreadByPeer[rid]}
                          </span>
                        )}
                        {canDirect && (
                          <button
                            onClick={() => {
                              // 1) Persist the chosen peer immediately (before any state changes)
                              try { sessionStorage.setItem("last_dm_peer_id", String(rid)); } catch { }

                              // 2) Now open Direct
                              setRightTab("chat");
                              setChatSubTab(1);

                              (async () => {
                                try {
                                  setChatErr("");
                                  stopChatPolling();

                                  // Resolve canonical thread using the known peer
                                  let peer = Number(rid);
                                  if (!Number.isFinite(peer) || peer === Number(myUserId)) {
                                    try {
                                      const fallback = await resolveRecipientUserId();
                                      if (Number.isFinite(fallback)) peer = Number(fallback);
                                    } catch { }
                                  }
                                  if (!Number.isFinite(peer) || peer === Number(myUserId)) {
                                    setChatErr("Select someone to chat with.");
                                    return;
                                  }

                                  const conv = await findOrCreateDM(peer);
                                  if (!conv) throw new Error("Failed to get conversation ID.");
                                  const cid = toId(conv);
                                  setConversationId(cid);
                                  mountDM(cid);

                                  const server = await fetchMessages(cid);
                                  setDirectChats(prev => ({ ...prev, [cid]: server }));
                                  setChatMessages(server);
                                  await markMessagesRead(server);
                                  setUnreadDMCounts(prev => ({ ...prev, [cid]: 0 }));
                                  startChatPolling(cid);
                                } catch (e) {
                                  setChatErr(e.message || "Failed to start chat.");
                                  setRightTab("chat");
                                  setChatSubTab(1);
                                }
                              })();
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50 shadow-sm"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> DM
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-[52vh] flex-col">
                {/* Sub-tabs */}
                <div className="flex gap-2 border-b border-gray-200 px-2 pt-2">
                  <button
                    onClick={() => setChatSubTab(0)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${chatSubTab === 0 ? "bg-gray-200" : "hover:bg-gray-100"
                      }`}
                  >
                    Group{unreadGroupCount > 0 && (
                      <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded bg-red-600 px-1 text-[10px] font-bold text-white">
                        {unreadGroupCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setChatSubTab(1)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${chatSubTab === 1 ? "bg-gray-200" : "hover:bg-gray-100"
                      }`}
                  >
                    Direct{currentDMUnread > 0 && (
                      <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded bg-red-600 px-1 text-[10px] font-bold text-white">
                        {currentDMUnread}
                      </span>
                    )}
                  </button>
                </div>

                {/* Status/errors */}
                <div className="px-3 pt-2 text-xs text-gray-600">
                  {chatSubTab === 0 ? (
                    <>
                      {groupLoading && <div>Connecting group chat…</div>}
                      {!!groupErr && <div className="text-red-600">{groupErr}</div>}
                    </>
                  ) : (
                    <>
                      {chatLoading && <div>Connecting direct chat…</div>}
                      {!!chatErr && <div className="text-red-600">{chatErr}</div>}
                    </>
                  )}
                </div>

                {/* Messages */}
                <div ref={chatListRef} className="flex-1 space-y-2 overflow-y-auto px-3 pt-2">
                  {(() => {
                    const raw = chatSubTab === 0 ? groupMessages : chatMessages;
                    if (!raw || raw.length === 0) {
                      return <div className="text-sm text-gray-500">No messages yet. Start the conversation!</div>;
                    }
                    const msgs = dedupeById(raw);
                    return msgs.map((m, idx) => {
                      const fromMe = Number(m?.sender_id) === Number(myUserId);
                      const senderName = nameFromMsg(m, myUserId);
                      const at = m?.created_at ? new Date(m.created_at).toLocaleTimeString() : "";
                      return (
                        <div key={_msgKey(m) || `${idx}-${m.created_at || ""}`} className={`rounded-xl border p-2.5 shadow-sm ${fromMe ? "bg-gray-100 border-gray-200" : "bg-white border-gray-200"}`}>
                          <div className="text-xs text-gray-500">
                            <span className="font-semibold text-gray-800">{senderName}</span>
                            <span className="px-1">•</span>
                            <span>{at}</span>
                          </div>
                          <p className="text-sm leading-snug text-gray-900">{m?.body ?? m?.text ?? ""}</p>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Ask host (Group only) */}
                {chatSubTab === 0 && (
                  <div className="px-3 pt-2">
                    <label className="mb-1 flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={askAsQuestion}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setAskAsQuestion(v);
                          if (v && !chatInput) setChatInput("Question: ");
                        }}
                      />
                      <span>Ask host (also post to Q&A)</span>
                    </label>
                  </div>
                )}

                {/* Composer */}
                <div className="border-t border-gray-200 p-2">
                  <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white p-1 shadow-sm">
                    <input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (e.repeat) return; // ⟵ ignore key auto-repeat
                          chatSubTab === 0 ? handleSendMessageGroup() : handleSendMessageDM();
                        }
                      }}
                      placeholder={
                        chatSubTab === 0
                          ? askAsQuestion
                            ? "Ask a question to host"
                            : "Message everyone…"
                          : conversationId
                            ? "Message privately…"
                            : "Select someone to chat with"
                      }
                      className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder-gray-400"
                      disabled={
                        chatSubTab === 0
                          ? !groupConversationId || !!groupLoading
                          : !conversationId || !!chatLoading
                      }
                    />
                    <button
                      onClick={chatSubTab === 0 ? handleSendMessageGroup : handleSendMessageDM}
                      disabled={
                        !chatInput.trim() ||
                        (chatSubTab === 0 ? !groupConversationId || !!groupLoading : !conversationId || !!chatLoading)
                      }
                      className="grid h-9 w-9 place-items-center rounded-lg border border-gray-300 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Mobile drawer (right panel) */}
      {rightOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setRightOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 right-0 w-[88%] max-w-sm overflow-hidden rounded-l-2xl border-l border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <MessageCircle className="h-4 w-4" /> Live Chat
                {chatTabBadgeCount > 0 && (
                  <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded bg-red-600 px-1 text-[10px] font-bold text-white">
                    {chatTabBadgeCount}
                  </span>
                )}
              </div>
              <button
                className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50"
                onClick={() => setRightOpen(false)}
              >
                Close
              </button>
            </div>

            {/* Mobile chat body mirrors the active chat sub-tab */}
            <div className="flex h-full flex-col">
              <div className="flex gap-2 border-b border-gray-200 px-3 pt-3">
                <button
                  onClick={() => setChatSubTab(0)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${
                    chatSubTab === 0 ? "bg-gray-200" : "hover:bg-gray-100"
                  }`}
                >
                  Group
                  {unreadGroupCount > 0 && (
                    <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded bg-red-600 px-1 text-[10px] font-bold text-white">
                      {unreadGroupCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setChatSubTab(1)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold ${
                    chatSubTab === 1 ? "bg-gray-200" : "hover:bg-gray-100"
                  }`}
                >
                  Direct
                  {(() => {
                    const n = Object.values(unreadDMCounts).reduce((a, b) => a + b, 0);
                    return n > 0 ? (
                      <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded bg-red-600 px-1 text-[10px] font-bold text-white">
                        {n}
                      </span>
                    ) : null;
                  })()}
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto px-3 pt-2">
                {(() => {
                  const raw = chatSubTab === 0 ? groupMessages : chatMessages;
                  if (!raw || raw.length === 0) {
                    return (
                      <div className="text-sm text-gray-500">
                        No messages yet. Start the conversation!
                      </div>
                    );
                  }
                  const msgs = dedupeById(raw);
                  return msgs.map((m, idx) => {
                    const fromMe = Number(m?.sender_id) === Number(myUserId);
                    const senderName = nameFromMsg(m, myUserId);
                    const at = m?.created_at ? new Date(m.created_at).toLocaleTimeString() : "";
                    return (
                      <div
                        key={_msgKey(m) || `${idx}-${m.created_at || ""}`}
                        className={`rounded-xl border p-2.5 shadow-sm ${
                          fromMe ? "bg-gray-100 border-gray-200" : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold text-gray-800">{senderName}</span>
                          <span className="px-1">•</span>
                          <span>{at}</span>
                        </div>
                        <p className="text-sm leading-snug text-gray-900">
                          {m?.body ?? m?.text ?? ""}
                        </p>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Mobile: Ask host (Group only) */}
              {chatSubTab === 0 && (
                <div className="px-3 pt-2">
                  <label className="mb-1 flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={askAsQuestion}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setAskAsQuestion(v);
                        if (v && !chatInput) setChatInput("Question: ");
                      }}
                    />
                    <span>Ask host (also post to Q&A)</span>
                  </label>
                </div>
              )}

              <div className="border-t border-gray-200 p-2">
                <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white p-1 shadow-sm">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (e.repeat) return;
                        chatSubTab === 0 ? handleSendMessageGroup() : handleSendMessageDM();
                      }
                    }}
                    placeholder={
                      chatSubTab === 0
                        ? askAsQuestion
                          ? "Ask a question to host"
                          : "Message everyone…"
                        : conversationId
                        ? "Message privately…"
                        : "Select someone to chat with"
                    }
                    className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder-gray-400"
                    disabled={
                      chatSubTab === 0
                        ? !groupConversationId || !!groupLoading
                        : !conversationId || !!chatLoading
                    }
                  />
                  <button
                    onClick={chatSubTab === 0 ? handleSendMessageGroup : handleSendMessageDM}
                    disabled={
                      !chatInput.trim() ||
                      (chatSubTab === 0
                        ? !groupConversationId || !!groupLoading
                        : !conversationId || !!chatLoading)
                    }
                    className="grid h-9 w-9 place-items-center rounded-lg border border-gray-300 bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join error overlay */}
      {!!joinErr && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
          <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-2xl">
            <h3 className="mb-2 text-lg font-extrabold text-gray-900">Couldn’t join the meeting</h3>
            <p className="whitespace-pre-wrap text-sm text-gray-700">{joinErr}</p>
            <button
              onClick={() => {
                try {
                  window.location.replace(exitUrl || "/myevents");
                } catch {
                  window.location.href = "/myevents";
                }
              }}
              className="mt-3 rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:bg-black"
            >
              Go back
            </button>
          </div>
        </div>
      )}

      {/* Host finalizing overlay */}
      {finalizing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="mx-4 max-w-sm rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-2xl">
            <div className="mb-2 text-base font-semibold text-gray-900">Finalizing recording</div>
            <div className="mb-4 text-sm text-gray-700">
              {finalizingText || "Please wait while we save your recording…"}
            </div>
            <div className="mx-auto h-1.5 w-full max-w-[260px] overflow-hidden rounded bg-gray-200">
              <div className="h-full w-2/3 animate-pulse bg-teal-500" />
            </div>
            <div className="mt-3 text-xs text-gray-500">Don’t close this tab.</div>
          </div>
        </div>
      )}

      {/* Permission overlay */}
      {permission !== "granted" && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40">
          <div className="max-w-sm rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-2xl">
            <h3 className="mb-2 text-lg font-extrabold text-gray-900">
              {permission === "pending" ? "Requesting access…" : "Allow camera & microphone"}
            </h3>
            <p className="text-sm text-gray-700">
              {permission === "pending"
                ? "Please grant permission in your browser prompt."
                : "Permissions were blocked. Enable camera and microphone, then retry."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}