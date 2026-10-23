import React, { useEffect, useMemo, useState } from "react";
import { Box, Paper, Typography, Link } from "@mui/material";
import { getAccessToken } from "../../utils/tokenStore";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

/** Public event-specific logo showcase. Absent/empty data does not alter the event page. */
export default function EventSponsorsPartnersSection({ eventId }) {
  const [items, setItems] = useState([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    setItems([]);
    setFailed(false);
    const token = getAccessToken();
    fetch(`${API_BASE}/events/${eventId}/supporters/`, {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to retrieve supporters (${response.status})`);
        return response.json();
      })
      .then((data) => { if (!controller.signal.aborted) setItems(Array.isArray(data) ? data : []); })
      .catch((error) => { if (!controller.signal.aborted) { console.warn("Event supporters:", error); setFailed(true); } });
    return () => controller.abort();
  }, [eventId]);

  const groups = useMemo(() => {
    const result = [];
    for (const item of items) {
      if (!item.logo_url || !["sponsor", "partner"].includes(item.kind)) continue;
      const groupKey = `${item.kind}:${item.category}`;
      let group = result.find((entry) => entry.key === groupKey);
      if (!group) {
        group = { key: groupKey, kind: item.kind, name: item.category_name, order: item.category_order, logos: [] };
        result.push(group);
      }
      group.logos.push(item);
    }
    return result.sort((a, b) => a.kind.localeCompare(b.kind) * -1 || a.order - b.order || a.name.localeCompare(b.name));
  }, [items]);

  // Missing API/schema or an event without supporters should not show an empty card.
  if (failed || groups.length === 0) return null;

  return (
    <Paper elevation={0} className="rounded-2xl border border-slate-200" sx={{ p: { xs: 2.5, sm: 3, md: 4 } }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 3 }}>Sponsors &amp; Partners</Typography>
      {groups.map((group) => (
        <Box key={group.key} sx={{ mb: 3, "&:last-child": { mb: 0 } }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ textAlign: "center", mb: 2 }}>
            {group.name}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: { xs: 2, sm: 3 } }}>
            {group.logos.map((item) => {
              const logo = (
                <Box component="img" src={item.logo_url} alt={`${item.name} logo`} loading="lazy"
                  sx={{ display: "block", maxWidth: { xs: 135, sm: 190 }, width: "100%", height: "auto", maxHeight: 100, objectFit: "contain" }} />
              );
              return (
                <Box key={item.id} sx={{ width: { xs: "42%", sm: 200 }, minHeight: 96, display: "flex", alignItems: "center", justifyContent: "center", p: 1.5 }}>
                  {item.website_url ? (
                    <Link href={item.website_url} rel="noopener noreferrer" target="_blank" aria-label={`Visit ${item.name} website`} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {logo}
                    </Link>
                  ) : logo}
                </Box>
              );
            })}
          </Box>
        </Box>
      ))}
    </Paper>
  );
}
