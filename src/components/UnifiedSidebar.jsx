// src/components/UnifiedSidebar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Badge,
    Typography,
    Divider,
    Button,
    useTheme,
    useMediaQuery,
    Paper,
    Avatar,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from "@mui/material";

// Icons
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded"; // Explore Events, My Events
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded"; // Explore Groups, My Groups
import LiveTvRoundedIcon from "@mui/icons-material/LiveTvRounded"; // Live Feed
import Diversity3RoundedIcon from "@mui/icons-material/Diversity3Rounded"; // Explore Members
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded"; // My Posts, CMS
import LibraryBooksRoundedIcon from "@mui/icons-material/LibraryBooksRounded"; // My Resources
import OndemandVideoRoundedIcon from "@mui/icons-material/OndemandVideoRounded"; // My Recordings
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded"; // My Orders, Saleor
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded"; // Messages
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded"; // Notifications
import PersonIcon from "@mui/icons-material/Person"; // Profile
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded"; // Identity Verification
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded"; // Staff
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import VerifiedIcon from "@mui/icons-material/Verified";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
// import ForumRoundedIcon from "@mui/icons-material/ForumRounded"; // TODO: Re-enable when Discussion Forum is ready
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { isOwnerUser, isStaffUser, canEditProfilesUser } from "../utils/adminRole";
import { apiClient, createWagtailSession, getSaleorDashboardUrl } from "../utils/api";
import { clearAuth } from "../utils/authStorage";

const ORANGE = "#E8532F";
const TEXT = "#2C3E5A";
const HOVER_BG = "rgba(232,83,47,0.07)";
const CARD_BG = "#ffffff";
const CARD_BORDER = "#F0EEEB";

// --- Helpers for badges ---
async function countFromPaginated(url) {
    try {
        const res = await apiClient.get(url);
        const j = res.data;
        if (typeof j.count === "number") return j.count;
        const arr = Array.isArray(j) ? j : j?.results || [];
        return arr.length;
    } catch {
        return 0;
    }
}

async function getUnreadGroupNotifCount(kind) {
    return countFromPaginated(
        `/group-notifications/?unread=1&kind=${encodeURIComponent(kind)}&page_size=1`
    );
}

async function getPendingNameRequestsCount() {
    if (!isOwnerUser()) return 0;
    return countFromPaginated(
        `/auth/admin/name-requests/?status=pending&page_size=1`
    );
}

async function getPendingJoinRequestsCount() {
    try {
        const r = await apiClient.get(`/groups/?page_size=200`);
        const j = r.data;
        const groups = Array.isArray(j) ? j : j?.results || [];
        const manageable = groups.filter((g) =>
            ["owner", "admin", "moderator"].includes(g?.current_user_role)
        );
        const counts = await Promise.all(
            manageable.map(async (g) => {
                try {
                    const rr = await apiClient.get(`/groups/${g.id}/member-requests/`);
                    const jj = rr.data;
                    if (typeof jj.count === "number") return jj.count;
                    return Array.isArray(jj.requests) ? jj.requests.length : 0;
                } catch {
                    return 0;
                }
            })
        );
        return counts.reduce((a, b) => a + (b || 0), 0);
    } catch {
        return 0;
    }
}

async function getAdminNotificationsBadgeCount() {
    const [joinPending, memberJoinedUnread, groupCreatedUnread, namePending] =
        await Promise.all([
            getPendingJoinRequestsCount(),
            getUnreadGroupNotifCount("member_joined"),
            getUnreadGroupNotifCount("group_created"),
            getPendingNameRequestsCount(),
        ]);
    return (joinPending || 0) + (memberJoinedUnread || 0) + (groupCreatedUnread || 0) + (namePending || 0);
}

async function getUserUnreadCount() {
    try {
        const res = await apiClient.get(`/notifications/?unread=1&page_size=1`);
        const j = res.data;
        if (typeof j.count === "number") return j.count;
        const arr = Array.isArray(j) ? j : j?.results || [];
        return arr.reduce((acc, n) => acc + (n?.is_read ? 0 : 1), 0);
    } catch {
        return 0;
    }
}

async function getMessagesUnreadCount() {
    try {
        const res = await apiClient.get(`/messaging/conversations/`);
        const raw = res.data;
        const data = Array.isArray(raw) ? raw : (raw?.results || []);
        return data.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
    } catch {
        return 0;
    }
}

export default function UnifiedSidebar({ mobileOpen, onMobileClose }) {
    const location = useLocation();
    const navigate = useNavigate();
    const theme = useTheme();
    // We handle mobile drawer state in AppShell or local? 
    // Ideally AppShell passes it down.
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const userIsOwner = isOwnerUser();
    const userIsStaff = isStaffUser(); // This is true for BOTH Staff and SuperUser(Platform Admin) usually?
    const userCanEditProfiles = canEditProfilesUser();
    // Check utils/adminRole implementation references:
    // AdminSidebar says: const owner = isOwnerUser(); const staffOnly = !owner && isStaffUser();

    const isSuperUser = userIsOwner;
    const isStaffOnly = !isSuperUser && userIsStaff;
    const isNormalUser = !isSuperUser && !isStaffOnly;

    // --- State for badges ---
    const [notifCount, setNotifCount] = useState(0);
    const [messageCount, setMessageCount] = useState(0);
    const menuScrollRef = useRef(null);
    const activeItemRef = useRef(null);

    // --- Navigation Config ---
    const discoverItems = [
        { label: "Dashboard", to: "/community?view=home", icon: HomeRoundedIcon },
        { label: "Upcoming Events", to: "/events", icon: EventNoteRoundedIcon },
        { label: "Live Feed", to: "/community?view=live", icon: LiveTvRoundedIcon },
        // { label: "Discussion Forum", to: "/community?view=forum", icon: ForumRoundedIcon }, // TODO: Re-enable when feature is ready
        { label: "Explore Groups", to: "/community?view=groups", icon: GroupsRoundedIcon },
        { label: "Explore Members", to: "/community?view=members", icon: Diversity3RoundedIcon },
    ];

    const trainingsItems = [
        { label: "My Courses & Trainings", to: "/account/courses", icon: SchoolRoundedIcon },
        { label: "My Certificates", to: "/account/certificates", icon: EmojiEventsRoundedIcon },
    ];

    const resourcesItems = [
        { label: "E-Library", to: "/account/resources", icon: LibraryBooksRoundedIcon },
        { label: "My Recordings", to: "/account/recordings", icon: OndemandVideoRoundedIcon },
    ];

    let manageItems = [];
    let adminItems = [];

    if (isSuperUser) {
        // Super User [Platform Admin]
        manageItems = [
            { label: "My Posts", to: "/admin/posts", icon: ArticleRoundedIcon },
            { label: "My Events", to: "/admin/events", icon: EventNoteRoundedIcon },
            { label: "My Resources", to: "/admin/resources", icon: LibraryBooksRoundedIcon },
            { label: "My Recordings", to: "/admin/recordings", icon: OndemandVideoRoundedIcon },
            { label: "My Groups", to: "/admin/groups", icon: GroupsRoundedIcon },
            { label: "Messages", to: "/admin/messages", icon: ChatBubbleRoundedIcon, badge: "messages" },
            { label: "Notifications", to: "/admin/notifications", icon: NotificationsRoundedIcon, badge: "notifications" },
            { label: "My Contacts", to: "/community?view=contacts", icon: Diversity3RoundedIcon },
            { label: "Profile", to: "/account/profile", icon: PersonIcon },
        ];
        adminItems = [
            { label: "Moderation", to: "/admin/moderation", icon: ReportProblemRoundedIcon },
            { label: "Identity Verification", to: "/admin/name-requests", icon: BadgeRoundedIcon },
            { label: "Users", to: "/admin/users", icon: AdminPanelSettingsRoundedIcon },
            { label: "Saleor Dashboard", action: "saleor", icon: ShoppingCartRoundedIcon },
            { label: "CMS", action: "cms", icon: ArticleRoundedIcon },
        ];
    } else if (isStaffOnly) {
        // Staff User
        manageItems = [
            { label: "Messages", to: "/admin/messages", icon: ChatBubbleRoundedIcon, badge: "messages" },
            { label: "Notifications", to: "/community?view=notify", icon: NotificationsRoundedIcon, badge: "notifications" },
            { label: "My Events", to: "/admin/events", icon: EventNoteRoundedIcon },
            { label: "My Groups", to: "/admin/groups", icon: GroupsRoundedIcon },
            { label: "My Contacts", to: "/community?view=contacts", icon: Diversity3RoundedIcon },
            { label: "My Posts", to: "/community?view=myposts", icon: ArticleRoundedIcon },
            { label: "My Resources", to: "/admin/resources", icon: LibraryBooksRoundedIcon },
            { label: "My Recordings", to: "/admin/recordings", icon: OndemandVideoRoundedIcon },
            { label: "Profile", to: "/account/profile", icon: PersonIcon },
        ];
        adminItems = userCanEditProfiles
            ? [
                { label: "Moderation", to: "/admin/moderation", icon: ReportProblemRoundedIcon },
                { label: "Users", to: "/admin/staff", icon: AdminPanelSettingsRoundedIcon }
            ]
            : [];
    } else {
        // Normal User
        manageItems = [
            { label: "Messages", to: "/community?view=messages", icon: ChatBubbleRoundedIcon, badge: "messages" },
            { label: "Notifications", to: "/community?view=notify", icon: NotificationsRoundedIcon, badge: "notifications" },
            { label: "My Events", to: "/account/events", icon: EventNoteRoundedIcon },
            { label: "My Groups", to: "/community/mygroups", icon: GroupsRoundedIcon },
            { label: "My Contacts", to: "/community?view=contacts", icon: Diversity3RoundedIcon },
            { label: "My Posts", to: "/community?view=myposts", icon: ArticleRoundedIcon },
            { label: "My Orders", to: "/account/cart", icon: ShoppingCartRoundedIcon },
            { label: "Profile", to: "/account/profile", icon: PersonIcon },
        ];
    }

    // --- Effects for Badges ---
    useEffect(() => {
        let off = false;
        const sync = async () => {
            let n = 0;
            let m = await getMessagesUnreadCount();

            if (isSuperUser) {
                n = await getAdminNotificationsBadgeCount();
            } else if (isStaffOnly) {
                // Staff uses Community Notifications per prompt? "Community/NotificationsPage.jsx"
                // BUT wait, typically staff might need admin notifications too? 
                // Prompt says: "Notifications - Community/NotificationsPage.jsx" for Staff. 
                // So likely standard user notifications.
                // However, AdminEvents etc might benefit from admin notifications?
                // Sticking to Prompt: "Community/NotificationsPage.jsx" -> UserUnreadCount.
                n = await getUserUnreadCount();
            } else {
                n = await getUserUnreadCount();
            }

            if (!off) {
                setNotifCount(n);
                setMessageCount(m);
            }
        };

        sync();
        const id = setInterval(sync, 30000);

        // Listeners? 
        // AdminSidebar listens to 'admin:notify:unread' and 'messages:unread'
        // CommunitySideBar listens to 'notify:unread' and 'messages:unread'

        const onMsgUnread = (e) => setMessageCount(Math.max(0, e?.detail?.count ?? 0));
        const onNotifyUnread = (e) => setNotifCount(Math.max(0, e?.detail?.count ?? 0));

        window.addEventListener("messages:unread", onMsgUnread);

        // For admin notifications: 
        if (isSuperUser) {
            window.addEventListener("admin:notify:unread", onNotifyUnread);
        } else {
            window.addEventListener("notify:unread", onNotifyUnread);
        }

        return () => {
            off = true;
            clearInterval(id);
            window.removeEventListener("messages:unread", onMsgUnread);
            if (isSuperUser) {
                window.removeEventListener("admin:notify:unread", onNotifyUnread);
            } else {
                window.removeEventListener("notify:unread", onNotifyUnread);
            }
        };
    }, [isSuperUser, isStaffOnly]);

    useEffect(() => {
        const t = setTimeout(() => {
            const menuEl = menuScrollRef.current;
            const activeEl = activeItemRef.current;
            if (!menuEl || !activeEl) return;

            const menuRect = menuEl.getBoundingClientRect();
            const activeRect = activeEl.getBoundingClientRect();
            const activeTop = activeRect.top - menuRect.top + menuEl.scrollTop;
            const targetTop = activeTop - (menuEl.clientHeight / 2) + (activeRect.height / 2);
            const maxTop = Math.max(0, menuEl.scrollHeight - menuEl.clientHeight);
            const clampedTop = Math.min(maxTop, Math.max(0, targetTop));

            menuEl.scrollTo({
                top: clampedTop,
                behavior: "smooth",
            });
        }, 0);
        return () => clearTimeout(t);
    }, [location.pathname, location.search, isMobile, mobileOpen]);


    // --- Actions ---
    const [openLogoutDialog, setOpenLogoutDialog] = useState(false);

    const handleAction = async (action) => {
        if (action === "saleor") {
            try {
                const { url } = await getSaleorDashboardUrl();
                window.open(url, "_blank");
            } catch { alert("Error accessing Saleor"); }
        } else if (action === "cms") {
            try {
                const url = await createWagtailSession();
                window.open(url, "_blank");
            } catch { alert("Error accessing CMS"); }
        }
    };

    const handleLogoutClick = () => {
        setOpenLogoutDialog(true);
    };

    const handleLogoutConfirm = async () => {
        setOpenLogoutDialog(false);
        // Copied from Header.jsx
        const access = localStorage.getItem("access_token");
        const refresh = localStorage.getItem("refresh_token");
        const isJwtLike = (t) => typeof t === "string" && t.split(".").length === 3;

        try {
            if (import.meta.env.VITE_AUTH_PROVIDER !== "cognito" && access && refresh && isJwtLike(refresh)) {
                await apiClient.post("/auth/logout/", { refresh });
            }
        } catch { }
        try {
            if (access) {
                await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/wagtail/logout/`, {
                    method: "POST", headers: { Authorization: `Bearer ${access}` }, credentials: "include"
                });
            }
        } catch { }

        clearAuth();
        localStorage.setItem("cart_count", "0");
        window.dispatchEvent(new Event("cart:update"));
        window.dispatchEvent(new Event("auth:changed"));
        // App.jsx will catch auth change and unmount sidebar
        navigate("/", { replace: true });
    };


    const renderList = (items, title) => (
        <Box sx={{ mb: 2 }}>
            {title && (
                <Typography variant="overline" sx={{ px: 2.5, pt: 1.5, pb: 0.5, display: "block", color: "#C0BAB4", fontWeight: 800, fontSize: 10, letterSpacing: "0.1em" }}>
                    {title}
                </Typography>
            )}
            <List disablePadding>
                {items.map((item, idx) => {
                    const isActive = item.to ? location.pathname === item.to || (item.to.includes("?") && location.pathname + location.search === item.to) : false;
                    // Approximate active check for query params? 
                    // UnifiedSidebar might need smarter matching if we have query params.
                    // e.g. active if pathname matches and query matches.
                    // For now simple equality or startsWith for non-query URLs.

                    let selected = false;
                    const searchParams = new URLSearchParams(location.search);
                    const refParam = searchParams.get("ref");

                    if (item.to) {
                        if (refParam === "my_events") {
                            // If coming from My Events...
                            if (item.to === "/account/events") {
                                selected = true;
                            } else if (item.to === "/events") {
                                selected = false; // Explicitly deselect "Explore"
                            } else if (item.to.includes("?")) {
                                selected = (location.pathname + location.search) === item.to;
                            } else {
                                selected = location.pathname.startsWith(item.to);
                            }
                        } else if (refParam === "my_resources") {
                            if (item.to === "/account/resources" || item.to === "/admin/resources") {
                                selected = true;
                            } else if (item.to.includes("?")) {
                                selected = (location.pathname + location.search) === item.to;
                            } else {
                                selected = location.pathname.startsWith(item.to);
                            }
                        } else {
                            // Default / Fallback logic
                            if (location.pathname.startsWith("/resource/") && (item.to === "/account/resources" || item.to === "/admin/resources")) {
                                selected = true;
                            } else if (location.pathname.startsWith("/community/groups/") && item.to === "/community?view=feed") {
                                // Highlight "Explore Groups" when viewing a group detail
                                selected = true;
                            } else if (location.pathname.startsWith("/community/rich-profile/") && item.to === "/community?view=members") {
                                // Highlight "Explore Members" when viewing a profile
                                selected = true;
                            } else if (item.to.includes("?")) {
                                selected = (location.pathname + location.search) === item.to;
                            } else {
                                selected = location.pathname.startsWith(item.to);
                            }
                        }
                    }

                    return (
                        <ListItemButton
                            key={idx}
                            ref={selected ? activeItemRef : null}
                            selected={selected}
                            onClick={() => {
                                if (item.action) handleAction(item.action);
                                else {
                                    navigate(item.to);
                                    if (isMobile) onMobileClose?.();
                                }
                            }}
                            sx={{
                                borderRadius: 2,
                                px: 1.5,
                                mx: 1,
                                mb: 0.5,
                                color: selected ? ORANGE : TEXT,
                                bgcolor: selected ? HOVER_BG : "transparent",
                                "&:hover": { bgcolor: HOVER_BG },
                                "&.Mui-selected": { bgcolor: HOVER_BG },
                                "&.Mui-selected:hover": { bgcolor: HOVER_BG },
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 36, color: selected ? ORANGE : "#6b7280" }}>
                                {item.badge ? (
                                    <Badge color="error" badgeContent={item.badge === "notifications" ? notifCount : messageCount} invisible={!(item.badge === "notifications" ? notifCount : messageCount)}>
                                        <item.icon fontSize="small" />
                                    </Badge>
                                ) : (
                                    <item.icon fontSize="small" />
                                )}
                            </ListItemIcon>
                            <ListItemText primary={item.label} primaryTypographyProps={{ variant: "body2", fontWeight: selected ? 600 : 500 }} />
                        </ListItemButton>
                    );
                })}
            </List>
        </Box>
    );

    // --- User Profile State ---
    const [user, setUser] = useState(null);

    useEffect(() => {
        let active = true;

        const fetchUser = () => {
            apiClient.get("/users/me/").then((res) => {
                if (!active) return;
                setUser(res.data);
                try {
                    localStorage.setItem("user", JSON.stringify(res.data || {}));
                } catch { }
            }).catch(() => { });
        };

        fetchUser();

        const onAvatarUpdate = (e) => {
            if (active && e.detail?.avatar) {
                setUser((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        avatar: e.detail.avatar,
                        user_image: e.detail.avatar,
                        profile: {
                            ...(prev.profile || {}),
                            user_image: e.detail.avatar,
                            user_image_url: e.detail.avatar,
                            avatar: e.detail.avatar
                        }
                    };
                });
            }
        };

        window.addEventListener("profile:avatar-updated", onAvatarUpdate);
        return () => {
            active = false;
            window.removeEventListener("profile:avatar-updated", onAvatarUpdate);
        };
    }, []);

    // --- Cart State ---
    const [cartCount, setCartCount] = useState(() => {
        const raw = localStorage.getItem("cart_count");
        const n = raw ? parseInt(raw, 10) : 0;
        return Number.isFinite(n) ? n : 0;
    });

    useEffect(() => {
        const update = () => {
            const raw = localStorage.getItem("cart_count");
            const n = raw ? parseInt(raw, 10) : 0;
            setCartCount(Number.isFinite(n) ? n : 0);
        };
        const onStorage = (e) => { if (e.key === "cart_count") update(); };

        window.addEventListener("storage", onStorage);
        window.addEventListener("cart:update", update);

        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("cart:update", update);
        };
    }, []);

    const showCart = cartCount > 0 && !isSuperUser; // Owners typically don't shop

    const SidebarContent = (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "#ffffff", borderRight: `1px solid ${CARD_BORDER}` }}>
            {/* Brand area */}
            <Box sx={{ px: 2.5, py: 2, display: "flex", alignItems: "center", gap: 1.5, borderBottom: `1px solid ${CARD_BORDER}` }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "#1B2A4A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#0A9396" strokeWidth="1.5" />
                        <ellipse cx="12" cy="12" rx="4" ry="10" stroke="#E8532F" strokeWidth="1.5" />
                        <line x1="2" y1="12" x2="22" y2="12" stroke="#0A9396" strokeWidth="1.5" />
                    </svg>
                </Box>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: "#1B2A4A", lineHeight: 1.2, letterSpacing: "-0.01em" }}>IMAA</Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: 10, color: "#0A9396", letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.2 }}>CONNECT</Typography>
                </Box>
            </Box>

            <Box sx={{
                flex: 1,
                overflowY: "auto",
                py: 1,
                // Hide scrollbar
                "&::-webkit-scrollbar": { display: "none" },
                scrollbarWidth: "none",
                msOverflowStyle: "none"
            }}>
                {renderList(discoverItems, "EVENTS & COMMUNITY")}
                {isNormalUser && renderList(trainingsItems, "TRAININGS & COURSES")}
                {isNormalUser && renderList(resourcesItems, "RESOURCES")}
                {renderList(manageItems, isNormalUser ? "PERSONAL" : "MY CONTENT")}
                {adminItems.length > 0 && renderList(adminItems, "PLATFORM")}
            </Box>

            <Box sx={{ px: 1, pt: 0.5, pb: 0.5 }}>
                <ListItemButton
                    onClick={() => navigate("/account/settings")}
                    sx={{ borderRadius: 2, px: 1.5, mx: 1, mb: 0.25, color: TEXT, "&:hover": { bgcolor: HOVER_BG } }}
                >
                    <ListItemIcon sx={{ minWidth: 36, color: "#6b7280" }}>
                        <SettingsRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Settings" primaryTypographyProps={{ variant: "body2", fontWeight: 500 }} />
                </ListItemButton>
                <Box
                    component="a"
                    href="https://imaa-institute.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: "flex", alignItems: "center", gap: 1, px: 2.5, py: 0.75, color: "#C0BAB4", fontSize: 11.5, textDecoration: "none", fontWeight: 500,
                        "&:hover": { color: ORANGE } }}
                >
                    <OpenInNewIcon sx={{ fontSize: 13 }} />
                    Back to imaa-institute.org
                </Box>
            </Box>

            <Divider />

            <Box sx={{ p: 2, pb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                {/* Profile Section */}
                <Box
                    onClick={() => navigate('/account/profile')}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        overflow: "hidden",
                        cursor: "pointer",
                        flex: 1,
                        p: 0.5,
                        borderRadius: 2,
                        transition: "background-color 0.2s",
                        "&:hover": { bgcolor: "rgba(0, 0, 0, 0.04)" }
                    }}
                >
                    {user && (
                        <>
                            <Avatar
                                src={
                                    (function () {
                                        // Prioritize nested profile image from the API response structure provided
                                        const raw = user.profile?.user_image ||
                                            user.profile?.user_image_url ||
                                            user.avatar ||
                                            user.user_image ||
                                            user.image ||
                                            "";

                                        if (!raw) return "";
                                        if (raw.startsWith("http") || raw.startsWith("blob:")) return raw;

                                        // Prepend API_BASE if relative
                                        const base = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
                                        return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
                                    })()
                                }
                                alt={user.first_name || "User"}
                                sx={{ width: 40, height: 40 }}
                            >
                                {(user.first_name || user.username || "U")[0]?.toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <Typography variant="subtitle2" fontWeight={700} noWrap>
                                        {user.first_name} {user.last_name}
                                    </Typography>
                                    {user.profile?.kyc_status === "approved" && (
                                        <Tooltip title="Verified">
                                            <VerifiedIcon sx={{ fontSize: 16, color: "#22d3ee" }} />
                                        </Tooltip>
                                    )}
                                </Box>
                                <Typography variant="caption" color="text.secondary" noWrap display="block">
                                    {(function () {
                                        // 1. Try latest experience
                                        if (user.experiences && user.experiences.length > 0) {
                                            const exp = user.experiences[0]; // Assuming sorted by latest from backend
                                            const title = exp.position;
                                            const org = exp.community_name || exp.org || exp.company;
                                            if (title && org) return `${title} – ${org}`;
                                            if (title) return title;
                                        }
                                        // 2. Try Profile Headline/Job
                                        const p = user.profile || {};
                                        if (p.headline) return p.headline;
                                        if (p.job_title && p.company) return `${p.job_title} – ${p.company}`;
                                        if (p.job_title) return p.job_title;

                                        // 3. Fallback to username if nothing else
                                        return user.username;
                                    })()}
                                </Typography>
                            </Box>
                        </>
                    )}
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {showCart && (
                        <Tooltip title="Cart">
                            <IconButton
                                onClick={() => navigate(isStaffOnly ? "/admin/carts" : "/account/cart")}
                                sx={{
                                    color: "text.secondary",
                                    bgcolor: "rgba(0, 0, 0, 0.04)",
                                    "&:hover": { bgcolor: "rgba(0, 0, 0, 0.1)" }
                                }}
                            >
                                <Badge
                                    badgeContent={cartCount}
                                    color="error"
                                    overlap="circular"
                                    max={99}
                                    sx={{
                                        "& .MuiBadge-badge": {
                                            fontSize: "0.6rem",
                                            height: 16,
                                            minWidth: 16,
                                            padding: "0 4px",
                                        }
                                    }}
                                >
                                    <ShoppingCartRoundedIcon fontSize="small" />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                    )}

                    <Tooltip title="Logout">
                        <IconButton
                            onClick={handleLogoutClick}
                            color="error"
                            sx={{
                                bgcolor: "rgba(211, 47, 47, 0.04)",
                                "&:hover": { bgcolor: "rgba(211, 47, 47, 0.12)" }
                            }}
                        >
                            <LogoutRoundedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>


            {/* Logout Confirmation Dialog */}
            <Dialog
                open={openLogoutDialog}
                onClose={() => setOpenLogoutDialog(false)}
                PaperProps={{
                    sx: { borderRadius: 3, p: 1, minWidth: 320 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    Are you leaving our system?
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        You are about to log out. We'll miss you!
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setOpenLogoutDialog(false)}
                        sx={{ borderRadius: 2, textTransform: "none", color: "text.secondary" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleLogoutConfirm}
                        variant="contained"
                        color="error"
                        sx={{ borderRadius: 2, textTransform: "none", boxShadow: "none" }}
                        autoFocus
                    >
                        Yes, Logout
                    </Button>
                </DialogActions>
            </Dialog>
        </Box >
    );

    return isMobile ? (
        <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={onMobileClose}
            ModalProps={{ keepMounted: true }}
            sx={{
                "& .MuiDrawer-paper": { boxSizing: "border-box", width: 280 }
            }}
        >
            {SidebarContent}
        </Drawer>
    ) : (
        <Drawer
            variant="permanent"
            sx={{
                display: { xs: "none", md: "block" },
                "& .MuiDrawer-paper": { boxSizing: "border-box", width: 280, position: "fixed", height: "100vh" }
            }}
            open
        >
            {SidebarContent}
        </Drawer>
    );
}
