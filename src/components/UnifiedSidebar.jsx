// src/components/UnifiedSidebar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import useMarketingAccess from "../hooks/useMarketingAccess";
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
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import MarkEmailReadRoundedIcon from "@mui/icons-material/MarkEmailReadRounded";
import NewspaperRoundedIcon from "@mui/icons-material/NewspaperRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { isOwnerUser, isStaffUser, canEditProfilesUser } from "../utils/adminRole";
import { apiClient, createWagtailSession, getSaleorDashboardUrl } from "../utils/api";
import { logoutBrowserSession } from "../utils/logoutSession";
import { getAccessToken } from "../utils/tokenStore";

const NAVY = "#1B2A4A";
const NAVY_2 = "#203554";
const CORAL = "#E8532F";
const TEAL = "#0A9396";
const SIDEBAR_TEXT = "rgba(255,255,255,0.82)";
const SIDEBAR_MUTED = "rgba(255,255,255,0.46)";
const SIDEBAR_BORDER = "rgba(255,255,255,0.12)";
const SIDEBAR_HOVER = "rgba(255,255,255,0.08)";
const SIDEBAR_ACTIVE = "rgba(255,255,255,0.08)";

// --- Helpers for badges ---
const BADGE_CACHE_TTL_MS = 60_000;
const ADMIN_BADGE_BASE_DELAY_MS = 750;
const ADMIN_BADGE_JITTER_MS = 4_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function canLoadAdminBadges() {
    return isOwnerUser() || isStaffUser();
}

function readBadgeCache(key, ttlMs = BADGE_CACHE_TTL_MS) {
    try {
        const raw = sessionStorage.getItem(`sidebarBadge:${key}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || (Date.now() - parsed.ts) > ttlMs) return null;
        return Number(parsed.value || 0);
    } catch {
        return null;
    }
}

function writeBadgeCache(key, value) {
    try {
        sessionStorage.setItem(
            `sidebarBadge:${key}`,
            JSON.stringify({ ts: Date.now(), value: Number(value || 0) })
        );
    } catch { }
}

async function cachedBadgeCount(key, loader, ttlMs = BADGE_CACHE_TTL_MS) {
    const cached = readBadgeCache(key, ttlMs);
    if (cached !== null) return cached;
    const value = await loader();
    writeBadgeCache(key, value);
    return Number(value || 0);
}

async function countFromPaginated(url, cacheKey = url) {
    return cachedBadgeCount(cacheKey, async () => {
        try {
            const res = await apiClient.get(url);
            const j = res.data;
            if (typeof j.count === "number") return j.count;
            const arr = Array.isArray(j) ? j : j?.results || [];
            return arr.length;
        } catch {
            return 0;
        }
    });
}

async function getUnreadGroupNotifCount(kind) {
    if (!canLoadAdminBadges()) return 0;
    return countFromPaginated(
        `/group-notifications/?unread=1&kind=${encodeURIComponent(kind)}&page_size=1`,
        `group-notif-${kind}`
    );
}

async function getPendingNameRequestsCount() {
    if (!isOwnerUser()) return 0;
    return countFromPaginated(
        `/auth/admin/name-requests/?status=pending&page_size=1`,
        "admin-name-requests"
    );
}

async function getPendingJoinRequestsCount() {
    if (!canLoadAdminBadges()) return 0;
    return cachedBadgeCount("admin-pending-join-requests", async () => {
        try {
            const r = await apiClient.get(`/groups/admin/pending-join-requests-count/`);
            const j = r.data || {};
            return Number(j.pending_join_requests_count ?? j.count ?? 0);
        } catch {
            return 0;
        }
    });
}

async function getAdminNotificationsBadgeCount() {
    if (!canLoadAdminBadges()) return 0;
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
    return countFromPaginated(`/notifications/?unread=1&page_size=1`, "user-notifications");
}

async function getMessagesUnreadCount() {
    return cachedBadgeCount("messages-unread", async () => {
        try {
            const res = await apiClient.get(`/messaging/conversations/unread-count/`);
            const raw = res.data || {};
            return Number(raw.unread_count ?? raw.count ?? 0);
        } catch {
            return 0;
        }
    }, 15_000);
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

    // Marketing Hub visibility comes from the backend (active ECP superuser WITH
    // an active Mautic mapping), never from is_superuser/is_staff alone.
    const { hasMarketingAccess } = useMarketingAccess();

    // --- State for badges and Saleor status ---
    const [notifCount, setNotifCount] = useState(0);
    const [messageCount, setMessageCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [showMoreIndicator, setShowMoreIndicator] = useState(false);
    const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
    const [saleorEnabled, setSaleorEnabled] = useState(true); // Default true, will be set to false if disabled
    const menuScrollRef = useRef(null);
    const activeItemRef = useRef(null);
    const searchInputRef = useRef(null);

    // --- Navigation Config ---
    const discoverItems = [
        { label: "Dashboard", to: "/community?view=home", icon: HomeRoundedIcon },
        { label: "Upcoming Events", to: "/events", icon: EventNoteRoundedIcon },
        { label: "Live Feed", to: "/community?view=live", icon: LiveTvRoundedIcon },
        { label: "Discussion Forum", to: "/community?view=forum", icon: ForumRoundedIcon },
        { label: "Explore Groups", to: "/community?view=groups", icon: GroupsRoundedIcon },
        { label: "Explore Members", to: "/community?view=members", icon: Diversity3RoundedIcon },
    ];

    const trainingsItems = [
        { label: "My Courses & Trainings", to: "/account/courses", icon: SchoolRoundedIcon },
        { label: "My Certificates", to: "/account/certificates", icon: EmojiEventsRoundedIcon },
    ];

    const resourcesItems = isSuperUser
        ? [
            { label: "E-Library", to: "/admin/resources", icon: LibraryBooksRoundedIcon },
            { label: "My Recordings", to: "/admin/recordings", icon: OndemandVideoRoundedIcon },
          ]
        : [
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
            { label: "My Series", to: "/admin/series", icon: ArticleRoundedIcon },
            { label: "Virtual Speakers", to: "/admin/virtual-speakers", icon: MicRoundedIcon },
            { label: "My Groups", to: "/admin/groups", icon: GroupsRoundedIcon },
            { label: "Messages", to: "/admin/messages", icon: ChatBubbleRoundedIcon, badge: "messages" },
            { label: "Notifications", to: "/admin/notifications", icon: NotificationsRoundedIcon, badge: "notifications" },
            { label: "Newsletter", to: "/newsletter", icon: NewspaperRoundedIcon },
            { label: "My Contacts", to: "/community?view=contacts", icon: Diversity3RoundedIcon },
            { label: "Profile", to: "/account/profile", icon: PersonIcon },
        ];
        adminItems = [
            { label: "Moderation", to: "/admin/moderation", icon: ReportProblemRoundedIcon },
            { label: "Identity Verification", to: "/admin/name-requests", icon: BadgeRoundedIcon },
            { label: "Users", to: "/admin/users", icon: AdminPanelSettingsRoundedIcon },
            { label: "Saleor Manager", to: "/admin/saleor", icon: ShoppingCartRoundedIcon },
            { label: "Email Templates", to: "/admin/email-templates", icon: MarkEmailReadRoundedIcon },
            { label: "Marketing Hub", to: "/admin/newsletter", icon: NewspaperRoundedIcon },
            { label: "CMS", action: "cms", icon: ArticleRoundedIcon },
            { label: "Admin Guide", to: "/admin/guide", icon: MenuBookRoundedIcon },
        ];
    } else if (isStaffOnly) {
        // Staff User
        manageItems = [
            { label: "Messages", to: "/admin/messages", icon: ChatBubbleRoundedIcon, badge: "messages" },
            { label: "Notifications", to: "/community?view=notify", icon: NotificationsRoundedIcon, badge: "notifications" },
            { label: "Newsletter", to: "/newsletter", icon: NewspaperRoundedIcon },
            { label: "My Events", to: "/admin/events", icon: EventNoteRoundedIcon },
            { label: "My Groups", to: "/admin/groups", icon: GroupsRoundedIcon },
            { label: "My Contacts", to: "/community?view=contacts", icon: Diversity3RoundedIcon },
            { label: "My Posts", to: "/community?view=myposts", icon: ArticleRoundedIcon },
            { label: "Profile", to: "/account/profile", icon: PersonIcon },
        ];
        adminItems = [
            { label: "Moderation", to: "/admin/moderation", icon: ReportProblemRoundedIcon },
            { label: "Marketing Hub", to: "/admin/newsletter", icon: NewspaperRoundedIcon },
            ...(userCanEditProfiles ? [{ label: "Users", to: "/admin/staff", icon: AdminPanelSettingsRoundedIcon }] : []),
            { label: "Admin Guide", to: "/admin/guide", icon: MenuBookRoundedIcon },
        ];
    } else {
        // Normal User
        manageItems = [
            { label: "Messages", to: "/community?view=messages", icon: ChatBubbleRoundedIcon, badge: "messages" },
            { label: "Notifications", to: "/community?view=notify", icon: NotificationsRoundedIcon, badge: "notifications" },
            { label: "Newsletter", to: "/newsletter", icon: NewspaperRoundedIcon },
            { label: "My Events", to: "/account/events", icon: EventNoteRoundedIcon },
            { label: "My Groups", to: "/community/mygroups", icon: GroupsRoundedIcon },
            { label: "My Contacts", to: "/community?view=contacts", icon: Diversity3RoundedIcon },
            { label: "My Posts", to: "/community?view=myposts", icon: ArticleRoundedIcon },
            { label: "My Orders", to: "/account/cart", icon: ShoppingCartRoundedIcon },
            { label: "Profile", to: "/account/profile", icon: PersonIcon },
        ];
    }

    // --- Check Saleor Status ---
    useEffect(() => {
        const checkSaleorStatus = async () => {
            try {
                const response = await apiClient.get("/auth/saleor/status/");
                setSaleorEnabled(response.data?.enabled !== false);
            } catch {
                // If the endpoint fails or is disabled, assume Saleor is disabled
                setSaleorEnabled(false);
            }
        };
        checkSaleorStatus();
    }, []);

    // --- Effects for Badges ---
    useEffect(() => {
        let off = false;

        const isLiveMeetingRoute = () => {
            const path = window.location.pathname;
            return path.includes("/live") || path.includes("/meeting") || path.includes("/rtk");
        };

        const liveRoute = isLiveMeetingRoute();

        const sync = async () => {
            let n = 0;
            let m = 0;

            // During live meeting, keep badges working but reduce backend pressure.
            // Do not fetch very frequently for 200–500 users.
            m = await getMessagesUnreadCount();

            if (isSuperUser || isStaffOnly) {
                // Delay admin badge APIs so 500 users landing on dashboard do not
                // create an immediate grouped/admin badge spike.
                await sleep(ADMIN_BADGE_BASE_DELAY_MS + Math.floor(Math.random() * ADMIN_BADGE_JITTER_MS));
                if (off) return;
                n = await getAdminNotificationsBadgeCount();
            } else {
                n = await getUserUnreadCount();
            }

            if (!off) {
                setNotifCount(n);
                setMessageCount(m);
            }
        };

        sync();

        const intervalMs = liveRoute ? 120000 : 30000;
        const id = setInterval(sync, intervalMs);

        const onMsgUnread = (e) => setMessageCount(Math.max(0, e?.detail?.count ?? 0));
        const onNotifyUnread = (e) => setNotifCount(Math.max(0, e?.detail?.count ?? 0));

        window.addEventListener("messages:unread", onMsgUnread);

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

    useEffect(() => {
        const menuEl = menuScrollRef.current;
        if (!menuEl) return;

        const handleScroll = () => {
            const isScrollable = menuEl.scrollHeight > menuEl.clientHeight;
            const notAtBottom = menuEl.scrollTop < menuEl.scrollHeight - menuEl.clientHeight - 50;
            setShowMoreIndicator(isScrollable && notAtBottom);
        };

        // Small delay to ensure DOM is measured correctly
        setTimeout(handleScroll, 100);
        menuEl.addEventListener("scroll", handleScroll);

        return () => menuEl.removeEventListener("scroll", handleScroll);
    }, [searchQuery]);



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
        await logoutBrowserSession();
        localStorage.setItem("cart_count", "0");
        window.dispatchEvent(new Event("cart:update"));
        window.dispatchEvent(new Event("auth:changed"));
        // App.jsx will catch auth change and unmount sidebar
        navigate("/", { replace: true });
    };

    const filterMenuItems = (items) => {
        if (!searchQuery.trim()) return items;
        const query = searchQuery.toLowerCase();
        return items.filter(item => item.label.toLowerCase().includes(query));
    };

    const renderList = (items, title) => {
        const filteredItems = filterMenuItems(items);
        if (filteredItems.length === 0) return null;

        return (
        <Box sx={{ mb: 2 }}>
            {title && (
                <Typography variant="overline" sx={{ px: 2.5, pt: 1.5, pb: 0.75, display: "block", color: SIDEBAR_MUTED, fontWeight: 800, fontSize: 10, letterSpacing: "0.14em", lineHeight: 1.2 }}>
                    {title}
                </Typography>
            )}
            <List disablePadding>
                {filteredItems.map((item, idx) => {
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
                                position: "relative",
                                borderRadius: "8px",
                                px: 1.5,
                                mx: 1,
                                mb: 0.5,
                                minHeight: 42,
                                color: selected ? "#ffffff" : SIDEBAR_TEXT,
                                bgcolor: selected ? SIDEBAR_ACTIVE : "transparent",
                                transition: "background-color 0.16s ease, color 0.16s ease",
                                "&:hover": { bgcolor: selected ? "rgba(255,255,255,0.1)" : SIDEBAR_HOVER, color: "#ffffff" },
                                "&.Mui-selected": { bgcolor: SIDEBAR_ACTIVE },
                                "&.Mui-selected:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                                "&::before": {
                                    content: '""',
                                    position: "absolute",
                                    left: 0,
                                    top: 8,
                                    bottom: 8,
                                    width: 3,
                                    borderRadius: "0 999px 999px 0",
                                    bgcolor: selected ? CORAL : "transparent"
                                }
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 36, color: selected ? CORAL : "rgba(255,255,255,0.62)" }}>
                                {item.badge ? (
                                  <Badge color="error" badgeContent={item.badge === "notifications" ? notifCount : messageCount} invisible={!(item.badge === "notifications" ? notifCount : messageCount)}>
                                        <item.icon fontSize="small" />
                                    </Badge>
                                ) : (
                                    <item.icon fontSize="small" />
                                )}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{
                                    variant: "body2",
                                    fontWeight: selected ? 800 : 600,
                                    fontSize: 13,
                                    noWrap: true
                                }}
                            />
                        </ListItemButton>
                    );
                })}
            </List>
        </Box>
        );
    };

    // --- User Profile State ---
    const [user, setUser] = useState(null);

    // Calculate total filtered items
    // One place decides which admin entries are actually visible, so the search
    // count and the rendered list can never disagree.
    const visibleAdminItems = adminItems.filter(
        (item) =>
            (item.label !== "Saleor Manager" || saleorEnabled) &&
            (item.label !== "Marketing Hub" || hasMarketingAccess)
    );

    const allItems = [
        ...discoverItems,
        ...(isSuperUser ? trainingsItems : []),  // Trainings & Courses: SuperUser only
        ...resourcesItems,  // Show for ALL users
        ...manageItems,
        ...visibleAdminItems
    ];

    const filteredCount = searchQuery.trim()
        ? allItems.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase())).length
        : 0;

    // Search keyboard shortcuts
    useEffect(() => {
        if (filteredCount === 0) {
            setCurrentSearchIndex(0);
            return;
        }

        const handleKeyDown = (e) => {
            if (e.key === "/" && !searchQuery) {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === "Escape" && searchQuery) {
                setSearchQuery("");
                setCurrentSearchIndex(0);
            } else if (e.key === "ArrowDown" && searchQuery) {
                e.preventDefault();
                setCurrentSearchIndex(prev => (prev + 1) % filteredCount);
            } else if (e.key === "ArrowUp" && searchQuery) {
                e.preventDefault();
                setCurrentSearchIndex(prev => (prev - 1 + filteredCount) % filteredCount);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [searchQuery, filteredCount]);

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
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: NAVY, color: SIDEBAR_TEXT, borderRight: `1px solid ${SIDEBAR_BORDER}`, boxShadow: "4px 0 18px rgba(27,42,74,0.16)" }}>
            {/* Brand area */}
            <Box sx={{ px: 2.5, py: 2, display: "flex", alignItems: "center", gap: 1.5, borderBottom: `1px solid ${SIDEBAR_BORDER}` }}>
                <Box sx={{ width: 38, height: 38, borderRadius: "8px", bgcolor: "rgba(255,255,255,0.08)", border: `1px solid ${SIDEBAR_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke={TEAL} strokeWidth="1.5" />
                        <ellipse cx="12" cy="12" rx="4" ry="10" stroke={CORAL} strokeWidth="1.5" />
                        <line x1="2" y1="12" x2="22" y2="12" stroke={TEAL} strokeWidth="1.5" />
                    </svg>
                </Box>
                <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: 15, color: "#ffffff", lineHeight: 1.15 }}>IMAA</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: 10, color: "rgba(255,255,255,0.52)", letterSpacing: "0.14em", textTransform: "uppercase", lineHeight: 1.25 }}>CONNECT</Typography>
                </Box>
            </Box>

            <Box sx={{
                flex: 1,
                overflowY: "auto",
                py: 1,
                position: "relative",
                "&::-webkit-scrollbar": {
                    width: "6px"
                },
                "&::-webkit-scrollbar-track": {
                    bg: "transparent"
                },
                "&::-webkit-scrollbar-thumb": {
                    bgcolor: "rgba(255,255,255,0.22)",
                    borderRadius: "3px",
                    "&:hover": {
                        bgcolor: "rgba(255,255,255,0.34)"
                    }
                },
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(255,255,255,0.22) transparent"
            }} ref={menuScrollRef}>
                {/* Sticky Search Bar */}
                <Box sx={{
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    bgcolor: NAVY,
                    p: 1.5,
                    mb: 1,
                    borderBottom: `1px solid ${SIDEBAR_BORDER}`
                }}>
                    <Box sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        bgcolor: "rgba(255,255,255,0.08)",
                        border: `1px solid ${SIDEBAR_BORDER}`,
                        borderRadius: "8px",
                        px: 1.5,
                        py: 0.75,
                        justifyContent: "space-between",
                        color: SIDEBAR_MUTED,
                        "&:focus-within": {
                            borderColor: "rgba(10,147,150,0.9)",
                            boxShadow: "0 0 0 3px rgba(10,147,150,0.16)",
                            color: "#ffffff"
                        }
                    }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flex: 1, minWidth: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentSearchIndex(0);
                                }}
                                style={{
                                    flex: 1,
                                    border: "none",
                                    background: "transparent",
                                    outline: "none",
                                    fontSize: "14px",
                                    fontFamily: "inherit",
                                    color: "#ffffff",
                                    minWidth: 0
                                }}
                            />
                        </Box>
                        <Box sx={{ fontSize: "12px", color: SIDEBAR_MUTED, fontWeight: 700, whiteSpace: "nowrap", ml: 1 }}>
                            {searchQuery && filteredCount > 0
                                ? `${currentSearchIndex + 1} / ${filteredCount}`
                                : `${allItems.length}`
                            }
                        </Box>
                    </Box>
                </Box>

                {renderList(discoverItems, "EVENTS & COMMUNITY")}
                {isSuperUser && renderList(trainingsItems, "TRAININGS & COURSES")}
                {renderList(resourcesItems, "RESOURCES")}
                {renderList(manageItems, isNormalUser ? "PERSONAL" : "MY CONTENT")}
                {visibleAdminItems.length > 0 && renderList(visibleAdminItems, "PLATFORM")}

                {/* More Indicator - sticky positioning */}
                <Box sx={{
                    position: "sticky",
                    bottom: 0,
                    display: "flex",
                    justifyContent: "center",
                    py: 1.5,
                    px: 1.5,
                    bgcolor: NAVY,
                    borderTop: `1px solid ${SIDEBAR_BORDER}`,
                    opacity: showMoreIndicator ? 1 : 0,
                    pointerEvents: showMoreIndicator ? "auto" : "none",
                    transition: "opacity 0.2s",
                    zIndex: 5
                }}>
                    <Button
                        onClick={() => {
                            const menuEl = menuScrollRef.current;
                            if (menuEl) {
                                menuEl.scrollBy({
                                    top: menuEl.clientHeight,
                                    behavior: "smooth"
                                });
                            }
                        }}
                        sx={{
                            borderRadius: 2,
                            textTransform: "none",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#ffffff",
                            bgcolor: SIDEBAR_ACTIVE,
                            padding: "8px 16px",
                            border: `1px solid rgba(232,83,47,0.36)`,
                            "&:hover": {
                                bgcolor: "rgba(232,83,47,0.26)",
                                borderColor: "rgba(232,83,47,0.52)"
                            },
                            transition: "all 0.2s"
                        }}
                    >
                        ↓ More
                    </Button>
                </Box>
            </Box>

            <Box sx={{ px: 1, pt: 0.75, pb: 0.75, borderTop: `1px solid ${SIDEBAR_BORDER}` }}>
                {/* TODO: Re-enable Settings when ready */}
                {/* <ListItemButton
                    onClick={() => navigate("/account/settings")}
                    sx={{ borderRadius: 2, px: 1.5, mx: 1, mb: 0.25, color: TEXT, "&:hover": { bgcolor: HOVER_BG } }}
                >
                    <ListItemIcon sx={{ minWidth: 36, color: "#6b7280" }}>
                        <SettingsRoundedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Settings" primaryTypographyProps={{ variant: "body2", fontWeight: 500 }} />
                </ListItemButton> */}
                <Box
                    component="a"
                    href="https://imaa-institute.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: "flex", alignItems: "center", gap: 1, px: 2.5, py: 0.75, color: SIDEBAR_MUTED, fontSize: 11.5, textDecoration: "none", fontWeight: 700,
                        "&:hover": { color: "#ffffff" } }}
                >
                    <OpenInNewIcon sx={{ fontSize: 13 }} />
                    Back to imaa-institute.org
                </Box>
            </Box>

            <Divider sx={{ borderColor: SIDEBAR_BORDER }} />

            <Box sx={{ p: 2, pb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, bgcolor: NAVY_2 }}>
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
                        p: 0.75,
                        borderRadius: "8px",
                        transition: "background-color 0.2s",
                        "&:hover": { bgcolor: SIDEBAR_HOVER }
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
                                sx={{ width: 40, height: 40, bgcolor: TEAL, color: "#ffffff", fontWeight: 800, boxShadow: "0 0 0 1px rgba(255,255,255,0.18)" }}
                            >
                                {(user.first_name || user.username || "U")[0]?.toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                    <Typography variant="subtitle2" fontWeight={800} noWrap sx={{ color: "#ffffff", fontSize: 13 }}>
                                        {user.first_name} {user.last_name}
                                    </Typography>
                                    {user.profile?.kyc_status === "approved" && (
                                        <Tooltip title="Verified">
                                            <VerifiedIcon sx={{ fontSize: 16, color: TEAL }} />
                                        </Tooltip>
                                    )}
                                </Box>
                                <Typography variant="caption" noWrap display="block" sx={{ color: SIDEBAR_MUTED, fontWeight: 600 }}>
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

                                        return "";
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
                                    color: "#ffffff",
                                    bgcolor: "rgba(255,255,255,0.08)",
                                    border: `1px solid ${SIDEBAR_BORDER}`,
                                    "&:hover": { bgcolor: SIDEBAR_HOVER }
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
                                color: "#ffffff",
                                bgcolor: "rgba(232,83,47,0.16)",
                                border: "1px solid rgba(232,83,47,0.32)",
                                "&:hover": { bgcolor: "rgba(232,83,47,0.26)" }
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
