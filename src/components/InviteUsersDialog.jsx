import React, { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import GroupIcon from "@mui/icons-material/Group";
import PersonIcon from "@mui/icons-material/Person";
import { toast } from "react-toastify";

// Define API constants (reusing existing patterns)
const RAW = import.meta.env.VITE_API_BASE_URL || "";
const BASE = RAW.replace(/\/+$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

export default function InviteUsersDialog({ open, onClose, eventId }) {
    const [tab, setTab] = useState(0); // 0 = Users, 1 = Groups
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [selectedGroups, setSelectedGroups] = useState(new Set());

    // Debounced search
    useEffect(() => {
        if (!open) {
            setResults([]);
            setSearchQuery("");
            return;
        }

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
            // Adjust endpoint based on backend structure. Assuming standard ModelViewSet with SearchFilter.
            const url = `${API_ROOT}/${endpoint}/?search=${encodeURIComponent(searchQuery)}`;

            const res = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (res.ok) {
                const data = await res.json();
                // Handle pagination or list response
                const items = Array.isArray(data) ? data : (data.results || []);
                setResults(items);
            }
        } catch (error) {
            console.error("Search failed", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (item) => {
        if (tab === 0) {
            // Users
            const newSet = new Set(selectedUsers);
            if (newSet.has(item.id)) {
                newSet.delete(item.id);
            } else {
                newSet.add(item.id);
            }
            setSelectedUsers(newSet);
        } else {
            // Groups
            const newSet = new Set(selectedGroups);
            if (newSet.has(item.id)) {
                newSet.delete(item.id);
            } else {
                newSet.add(item.id);
            }
            setSelectedGroups(newSet);
        }
    };

    const handleSelectAll = () => {
        if (tab === 0) {
            const newSet = new Set(selectedUsers);
            const allSelected = results.every((r) => newSet.has(r.id));

            if (allSelected) {
                // Deselect all visible
                results.forEach((r) => newSet.delete(r.id));
            } else {
                // Select all visible
                results.forEach((r) => newSet.add(r.id));
            }
            setSelectedUsers(newSet);
        } else {
            const newSet = new Set(selectedGroups);
            const allSelected = results.every((r) => newSet.has(r.id));

            if (allSelected) {
                // Deselect all visible
                results.forEach((r) => newSet.delete(r.id));
            } else {
                // Select all visible
                results.forEach((r) => newSet.add(r.id));
            }
            setSelectedGroups(newSet);
        }
    };

    const handleSendInvites = async () => {
        if (selectedUsers.size === 0 && selectedGroups.size === 0) {
            toast.warning("Please select at least one user or group.");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const payload = {
                user_ids: Array.from(selectedUsers),
                group_ids: Array.from(selectedGroups),
            };

            const res = await fetch(`${API_ROOT}/events/${eventId}/invite_users/`, {
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
                onClose();
                // Reset selections
                setSelectedUsers(new Set());
                setSelectedGroups(new Set());
                setSearchQuery("");
                setResults([]);
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

                {results.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
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
                        const labelId = `checkbox-list-label-${item.id}`;
                        const avatarUrl = item.avatar || (item.profile && item.profile.avatar); // Handle varied user structures

                        return (
                            <ListItem
                                key={item.id}
                                button
                                onClick={() => handleToggle(item)}
                            >
                                <ListItemAvatar>
                                    <Avatar src={avatarUrl} alt={item.username || item.name}>
                                        {(item.username || item.name || "?")[0].toUpperCase()}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={tab === 0 ? (item.username || "Unknown") : (item.name || "Unknown Group")}
                                    secondary={tab === 0 ? item.email : `${item.member_count || 0} members`} // Assuming member_count might exist or be added
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

                <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
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
