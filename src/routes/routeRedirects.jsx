// src/routes/routeRedirects.jsx
// Small redirect route elements shared by the Vite route table (src/App.jsx)
// and the Next.js App Router pages. Moved verbatim from App.jsx.
//
// Note: in App.jsx, /events/:id (EventIdRedirect) and the guarded
// /community/groups/:groupId (RedirectGroupDetailsToAdmin) are shadowed by the
// earlier /events/:slug and community/groups/:groupId routes, so React Router
// never renders them. The Next.js routes reproduce that effective behaviour.

import React from "react";
import { Navigate, useNavigate, useParams } from "#navigation";
import { CircularProgress } from "@mui/material";

export function RedirectGroupToAdmin() {
  const { idOrSlug } = useParams();
  return <Navigate to={`/admin/groups/${idOrSlug}`} replace />;
}

export function RedirectGroupDetailsToAdmin() {
  const { groupId } = useParams();
  return <Navigate to={`/admin/community/groups/${groupId}`} replace />;
}

// Redirect numeric event IDs to slug-based URLs
export function EventIdRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Only redirect if id is numeric
    if (!/^\d+$/.test(id)) {
      navigate('/events', { replace: true });
      return;
    }

    const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

    fetch(`${API_BASE}/events/${id}/`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(event => {
        if (event.slug) {
          navigate(`/events/${encodeURIComponent(event.slug)}`, { replace: true });
        } else {
          navigate('/events', { replace: true });
        }
      })
      .catch(() => {
        navigate('/events', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return <CircularProgress sx={{ display: 'block', margin: '50px auto' }} />;
  }
  return null;
}
