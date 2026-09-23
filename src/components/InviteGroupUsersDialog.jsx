import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Tabs,
    Tab,
    TextField,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Checkbox,
    Typography,
    Box,
    InputAdornment,
    CircularProgress,
    FormControlLabel,
    Checkbox as MuiCheckbox,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import GroupIcon from "@mui/icons-material/Group";
import PersonIcon from "@mui/icons-material/Person";
import VerifiedIcon from "@mui/icons-material/Verified";
import { toast } from "react-toastify";

// Define API constants (reusing existing patterns)
const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

// The personal note only. The backend appends each recipient's own signed
// invitation link, so no group URL is added here.
const buildDefaultInviteMessage = (groupName) =>
    `You are invited to join${groupName ? ` ${groupName}` : " this group"}. Accept the invitation to see its posts, members and chat.`;

export default function InviteGroupUsersDialog({
    open,
    onClose,
    groupIdOrSlug,
    groupId,
    groupName = "",
    onInvited,
}) {
    const [tab, setTab] = useState(0); // 0 = Users, 1 = Groups
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [selectedGroups, setSelectedGroups] = useState(new Set());
    const [alsoSendMessage, setAlsoSendMessage] = useState(true);
    const [inviteMessage, setInviteMessage] = useState("");

    // Debounced search
    useEffect(() => {
        if (!open) {
            setResults([]);
            setSearchQuery("");
            return;
        }

        setAlsoSendMessage(true);
        setInviteMessage(buildDefaultInviteMessage(groupName));

        const timer = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                performSearch();
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, tab, open]);

    const performSearch = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const endpoint = tab === 0 ? "users" : "groups";
            const url = `${API_ROOT}/${endpoint}/?search=${encodeURIComponent(searchQuery)}`;

            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.ok) {
                const data = await res.json();
                const items = Array.isArray(data) ? data : (data.results || []);
                // Never let an admin invite this group into itself
                setResults(
                    tab === 1 && groupId
                        ? items.filter((g) => String(g.id) !== String(groupId))
                        : items
                );
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (item) => {
        if (tab === 0) {
            const newSet = new Set(selectedUsers);
            newSet.has(item.id) ? newSet.delete(item.id) : newSet.add(item.id);
            setSelectedUsers(newSet);
        } else {
            const newSet = new Set(selectedGroups);
            newSet.has(item.id) ? newSet.delete(item.id) : newSet.add(item.id);
            setSelectedGroups(newSet);
        }
    };

    const handleSelectAll = () => {
        const current = tab === 0 ? selectedUsers : selectedGroups;
        const newSet = new Set(current);
        const allSelected = results.every((r) => newSet.has(r.id));

        if (allSelected) {
            results.forEach((r) => newSet.delete(r.id));
        } else {
            results.forEach((r) => newSet.add(r.id));
        }

        if (tab === 0) setSelectedUsers(newSet);
        else setSelectedGroups(newSet);
    };

    const resetState = () => {
        setSelectedUsers(new Set());
        setSelectedGroups(new Set());
        setSearchQuery("");
        setResults([]);
        setAlsoSendMessage(true);
        setInviteMessage("");
    };

    const handleSendInvites = async () => {
        if (selectedUsers.size === 0 && selectedGroups.size === 0) {
            toast.warning("Please select at least one user or group.");
            return;
        }
        if (alsoSendMessage && !inviteMessage.trim()) {
            toast.warning("Enter a message or turn off the message option.");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const payload = {
                user_ids: Array.from(selectedUsers),
                group_ids: Array.from(selectedGroups),
                send_message: alsoSendMessage,
                invite_message: inviteMessage.trim(),
            };

            const res = await fetch(`${API_ROOT}/groups/${groupIdOrSlug}/invite_users/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (res.ok) {
                toast.success(json.message || "Invitations sent successfully!");
                onInvited?.(json);
                onClose();
                resetState();
            } else {
                toast.error(json.detail || "Failed to send invitations.");
            }
        } catch (error) {
            console.error("Invite error", error);
            toast.error("An error occurred while sending invitations.");
        } finally {
            setLoading(false);
        }
    };

    const isAllSelected = results.length > 0 && results.every((r) =>
        tab === 0 ? selectedUsers.has(r.id) : selectedGroups.has(r.id)
    );

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Invite Users</DialogTitle>
            <DialogContent>
                <Tabs
                    value={tab}
                    onChange={(e, v) => {
                        setTab(v);
                        setResults([]);
                        setSearchQuery("");
                    }}
                    variant="fullWidth"
                    sx={{ mb: 2 }}
                >
                    <Tab icon={<PersonIcon />} label="Users" />
                    <Tab icon={<GroupIcon />} label="Groups" />
                </Tabs>

                <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
                    <TextField
                        fullWidth
                        placeholder={tab === 0 ? "Search users by name..." : "Search groups by name..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon color="action" />
                                </InputAdornment>
                            ),
                        }}
                        size="small"
                    />
                </Box>

                <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "grey.50" }}>
                    <FormControlLabel
                        control={
                            <MuiCheckbox
                                checked={alsoSendMessage}
                                onChange={(e) => setAlsoSendMessage(e.target.checked)}
                            />
                        }
                        label="Also send a group message"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: alsoSendMessage ? 1 : 0 }}>
                        Invite notifications will still be sent. This adds a direct message from you.
                        Invited people join only once they accept — they are not added to the group now.
                    </Typography>
                    {alsoSendMessage && (
                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            maxRows={6}
                            size="small"
                            placeholder={groupName ? `Message about ${groupName}` : "Write a message for invited users"}
                            value={inviteMessage}
                            onChange={(e) => setInviteMessage(e.target.value)}
                        />
                    )}
                </Box>

                {results.length > 0 && (
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                        <Button size="small" onClick={handleSelectAll}>
                            {isAllSelected ? "Deselect All Visible" : "Select All Visible"}
                        </Button>
                    </Box>
                )}

                {loading && (
                    <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}

                <List sx={{ maxHeight: 300, overflow: "auto" }}>
                    {!loading && results.length === 0 && searchQuery.length >= 2 && (
                        <Typography variant="body2" color="text.secondary" align="center">
                            No results found.
                        </Typography>
                    )}

                    {results.map((item) => {
                        const isSelected = tab === 0 ? selectedUsers.has(item.id) : selectedGroups.has(item.id);
                        const labelId = `group-invite-checkbox-${item.id}`;

                        let primaryText = item.name || "Unknown";
                        let secondaryText = `${item.member_count || 0} members`;
                        let avatarUrl = item.avatar || "";
                        let isVerified = false;

                        if (tab === 0) {
                            const first = item.first_name || "";
                            const last = item.last_name || "";
                            const full = `${first} ${last}`.trim();
                            primaryText = full || item.username || "Unknown";
                            secondaryText = item.email || "";

                            avatarUrl = item.profile?.user_image_url || item.profile?.user_image || "";

                            const kyc = item.profile?.kyc_status;
                            isVerified = kyc === "approved" || kyc === "verified";
                        } else {
                            avatarUrl = item.logo || "";
                        }

                        return (
                            <ListItem
                                key={item.id}
                                button
                                onClick={() => handleToggle(item)}
                            >
                                <ListItemAvatar>
                                    <Avatar src={avatarUrl} alt={primaryText}>
                                        {primaryText.charAt(0).toUpperCase()}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                            {primaryText}
                                            {isVerified && (
                                                <VerifiedIcon color="primary" sx={{ fontSize: 16 }} />
                                            )}
                                        </Box>
                                    }
                                    secondary={secondaryText}
                                />
                                <Checkbox
                                    edge="end"
                                    checked={isSelected}
                                    tabIndex={-1}
                                    disableRipple
                                    inputProps={{ "aria-labelledby": labelId }}
                                />
                            </ListItem>
                        );
                    })}
                </List>

                <Box sx={{ mt: 2, p: 1, bgcolor: "action.hover", borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Selected: {selectedUsers.size} Users, {selectedGroups.size} Groups
                    </Typography>
                </Box>

            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button
                    onClick={handleSendInvites}
                    variant="contained"
                    disabled={loading || (selectedUsers.size === 0 && selectedGroups.size === 0)}
                >
                    {loading ? "Sending..." : "Send Invites"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
