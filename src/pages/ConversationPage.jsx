// src/pages/ConversationPage.jsx
// Conversation UI with WhatsApp-style bubbles, Back button, and local "last read" tracking.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Avatar, Box, Button, Container, LinearProgress, Paper, TextField, Typography, Divider, IconButton,
} from "@mui/material";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import AccountHero from "../components/AccountHero.jsx";
import AccountSidebar from "../components/AccountSidebar.jsx";

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || "").trim();
const API_BASE = RAW_BASE.endsWith("/") ? RAW_BASE.slice(0, -1) : RAW_BASE;

const tokenHeader = () => {
  const t =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access") ||
    localStorage.getItem("jwt");
  return t ? { Authorization: `Bearer ${t}` } : {};
};

  // always sort by timestamp ascending (fallback: id)
  const byTimeAsc = (a, b) => {
    const ta = Date.parse(a?.created_at || a?.createdAt || a?.timestamp || 0);
    const tb = Date.parse(b?.created_at || b?.createdAt || b?.timestamp || 0);
    if (!isNaN(ta) && !isNaN(tb)) return ta - tb;
    return (a?.id ?? 0) - (b?.id ?? 0);
  };
  const normalize = (list) => (Array.isArray(list) ? [...list] : [...(list?.results ?? [])]).sort(byTimeAsc);


export default function ConversationPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [conv, setConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const msgIdsRef = useRef(new Set());   // to prevent duplicates
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  const me = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // fetch conversation  messages
  useEffect(() => {
    let alive = true, ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setError("");

        const c = await fetch(`${API_BASE}/messaging/conversations/${conversationId}/`, { headers: tokenHeader(), signal: ctrl.signal });
        const cjson = await c.json().catch(() => ({}));
        if (!c.ok) throw new Error(cjson?.detail || `Conversation HTTP ${c.status}`);

        const r = await fetch(`${API_BASE}/messaging/conversations/${conversationId}/messages/`, { headers: tokenHeader(), signal: ctrl.signal });
        const json = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(json?.detail || `Messages HTTP ${r.status}`);

        if (!alive) return;
        const ordered = normalize(json);
        msgIdsRef.current = new Set(ordered.map(m => m.id));
        setConv(cjson);
        setMessages(ordered);

        // mark last read time locally (for directory badges)
        const last = ordered[ordered.length - 1];
        if (last) localStorage.setItem(`conv_read_${conversationId}`, last.created_at || new Date().toISOString());
      } catch (e) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Failed to load conversation");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; ctrl.abort(); };
  }, [conversationId]);

    // poll for new messages every 2.5s and merge
  useEffect(() => {
    let timer = null;
    async function tick() {
      try {
        const r = await fetch(`${API_BASE}/messaging/conversations/${conversationId}/messages/`, {
          headers: tokenHeader(),
          credentials: "include",
        });
        const json = await r.json().catch(() => ({}));
        const ordered = normalize(json);
        const fresh = [];
        for (const m of ordered) {
          if (!msgIdsRef.current.has(m.id)) {
            msgIdsRef.current.add(m.id);
            fresh.push(m);
          }
        }
        if (fresh.length) {
          setMessages(prev => [...prev, ...fresh].sort(byTimeAsc));
          const last = fresh[fresh.length - 1];
          if (last) localStorage.setItem(`conv_read_${conversationId}`, last.created_at || new Date().toISOString());
        }
      } catch {
        /* ignore transient errors */
      }
    }
    // first tick soon, then repeat
    tick();
    timer = setInterval(tick, 2500);
    return () => { if (timer) clearInterval(timer); };
  }, [API_BASE, conversationId]);

  // also update last-read on unmount (user just viewed this chat)
  useEffect(() => {
    return () => {
      localStorage.setItem(`conv_read_${conversationId}`, new Date().toISOString());
    };
  }, [conversationId]);

  async function sendMessage() {
    const body = text.trim();
    if (!body || sending) return;
    try {
      setSending(true);  
      const r = await fetch(`${API_BASE}/messaging/conversations/${conversationId}/messages/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify({ body }),
      });
      const msg = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(msg?.detail || "Failed to send message");
      if (msg?.id != null) msgIdsRef.current.add(msg.id);   // <- stop poll duplicate
      setMessages((arr) => (msg?.id && arr.some(m => m.id === msg.id)) ? arr : [...arr, msg]);
      setText("");
      // update last-read immediately since we're in the chat
      localStorage.setItem(`conv_read_${conversationId}`, msg.created_at || new Date().toISOString());
    } catch (e) {
      alert(e?.message || "Send failed");
    } finally {
        setSending(false);
    }
  }

  const otherName = useMemo(() =>
    conv?.other_user?.full_name ||
    conv?.other_user?.name ||
    [conv?.other_user?.first_name, conv?.other_user?.last_name].filter(Boolean).join(" ") ||
    conv?.other_user?.email || "Direct Message"
  , [conv]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AccountHero />
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 md:gap-6">
          <aside className="hidden md:block">
            <AccountSidebar stickyTop={96} />
          </aside>

          <main>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
              <Button
                onClick={() => navigate("/account/messages")}
                startIcon={<ArrowBackIosNewRoundedIcon />}
                variant="text"
                size="small"
                sx={{ textTransform: "none", borderRadius: 2 }}
              >
                Back
              </Button>
              <Avatar sx={{ width: 28, height: 28 }}>{(otherName || "?").slice(0,1).toUpperCase()}</Avatar>
              <Typography variant="h6" className="font-semibold tracking-tight">{otherName}</Typography>
            </Box>

            {loading && <LinearProgress />}

            {!loading && error && (
              <Paper elevation={0} className="rounded-2xl border border-slate-200 p-4">
                <Typography color="error">⚠️ {error}</Typography>
              </Paper>
            )}

            {!loading && !error && (
              <Paper elevation={0} className="rounded-2xl border border-slate-200 p-0 overflow-hidden">
                {/* messages */}
                <Box sx={{ p: { xs: 1.5, sm: 2 }, maxHeight: 560, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
                  {messages.map((m) => {
                    const meId = me?.id;
                    const mine = m.is_mine === true || m.sender === meId || m.sender_id === meId;
                    const ts = new Date(m.created_at).toLocaleString();
                    return (
                      <Box key={m.id} sx={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                        <Paper
                          elevation={0}
                          sx={{
                            px: 1.25, py: 0.75, maxWidth: "75%",
                            bgcolor: mine ? "primary.main" : "grey.100",
                            color: mine ? "primary.contrastText" : "text.primary",
                            borderRadius: 2,
                            borderTopLeftRadius: mine ? 2 : 0,
                            borderTopRightRadius: mine ? 0 : 2,
                            wordBreak: "break-word",
                          }}
                        >
                          <Typography sx={{ whiteSpace: "pre-wrap" }}>{m.body}</Typography>
                          <Typography variant="caption" sx={{ opacity: 0.7, display: "block", pt: 0.5, textAlign: "right" }}>
                            {ts}
                          </Typography>
                        </Paper>
                      </Box>
                    );
                  })}
                  <div ref={endRef} />
                </Box>

                <Divider />
                {/* composer */}
                <Box sx={{ p: { xs: 1.25, sm: 2 }, display: "flex", gap: 1 }}>
                  <TextField
                    placeholder="Type a message…"
                    fullWidth
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !sending) {
                            e.preventDefault(); sendMessage();
                        }
                    }}
                  />
                  <Button variant="contained" onClick={sendMessage} disabled={sending || !text.trim()} sx={{ textTransform: "none", borderRadius: 2 }}>
                    Send
                  </Button>
                </Box>
              </Paper>
            )}
          </main>
        </div>
      </Container>
    </div>
  );
}