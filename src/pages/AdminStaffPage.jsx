import * as React from "react";
import { isOwnerUser, getCurrentUserCandidate } from "../utils/adminRole";
import {
    Box, Container, Typography, TextField, InputAdornment,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
    Paper, Switch, Chip, IconButton, Tooltip, Button, Stack,
    CircularProgress, Pagination, Avatar, Skeleton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    FormControlLabel, Checkbox, FormControl, FormLabel,
    Alert
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedIcon from "@mui/icons-material/Verified";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import PersonRemoveRoundedIcon from "@mui/icons-material/PersonRemoveRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EmailIcon from "@mui/icons-material/Email";

import { listAdminUsers, patchStaff, bulkSetStaff, createAdminUser, updateAdminUser, deleteAdminUser } from "../utils/api";
import { useLocation, useParams } from "react-router-dom";


// Simple Dialog for Creating/Editing Users
function UserDialog({ open, onClose, mode, initialData, onSave, loading }) {
    const [formData, setFormData] = React.useState({
        email: "",
        first_name: "",
        last_name: "",
        is_staff: false,
        is_superuser: false,
        is_active: true
    });
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        if (open) {
            setError(null);
            if (mode === "edit" && initialData) {
                setFormData({
                    email: initialData.email || "",
                    first_name: initialData.first_name || "",
                    last_name: initialData.last_name || "",
                    is_staff: initialData.is_staff || false,
                    is_superuser: initialData.is_superuser || false,
                    is_active: initialData.is_active ?? true // default true if undefined
                });
            } else {
                setFormData({
                    email: "",
                    first_name: "",
                    last_name: "",
                    is_staff: true,      // default to staff for invite
                    is_superuser: false,
                    is_active: true
                });
            }
        }
    }, [open, mode, initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData(prev => {
            const updates = { [name]: type === "checkbox" ? checked : value };

            // Logic: If checking "Superuser", automatically check "Staff"
            if (name === "is_superuser" && checked) {
                updates.is_staff = true;
            }
            // Logic: If unchecking "Staff", automatically uncheck "Superuser" (since superusers must be staff)
            if (name === "is_staff" && !checked) {
                updates.is_superuser = false;
            }

            return { ...prev, ...updates };
        });
    };

    const handleSubmit = () => {
        if (!formData.email || !formData.first_name || !formData.last_name) {
            setError("Email, First Name, and Last Name are required.");
            return;
        }
        onSave(formData, setError);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {mode === "create" ? "Invite New User" : "Edit User"}
            </DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Stack spacing={2}>
                    <TextField
                        label="Email Address"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        fullWidth
                        required
                        disabled={mode === "edit"} // Prevent changing email on edit for now (simpler)
                        helperText={mode === "create" ? "An invitation with credentials will be sent to this email." : ""}
                    />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            label="First Name"
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            fullWidth
                            required
                        />
                        <TextField
                            label="Last Name"
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            fullWidth
                            required
                        />
                    </Stack>

                    <FormControl component="fieldset" variant="standard" sx={{ mt: 2 }}>
                        <FormLabel component="legend">Roles & Status</FormLabel>
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                            <FormControlLabel
                                control={
                                    <Switch checked={formData.is_staff} onChange={handleChange} name="is_staff" />
                                }
                                label="Staff"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox checked={formData.is_superuser} onChange={handleChange} name="is_superuser" color="secondary" />
                                }
                                label="Superuser (Platform Admin)"
                            />
                            {mode === "edit" && (
                                <FormControlLabel
                                    control={
                                        <Switch checked={formData.is_active} onChange={handleChange} name="is_active" color="info" />
                                    }
                                    label="Active"
                                />
                            )}
                        </Stack>
                    </FormControl>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : (mode === "create" ? "Send Invitation" : "Save Changes")}
                </Button>
            </DialogActions>
        </Dialog>
    );
}


export default function AdminStaffPage() {

    const location = useLocation();
    const owner = isOwnerUser();

    // Only owners/superadmins can view this page
    if (!owner) {
        return (
            <Container maxWidth="md" sx={{ py: 6 }}>
                <Typography variant="h6" align="center">
                    Only owners can manage staff.
                </Typography>
            </Container>
        );
    }

    const communityId = React.useMemo(
        () => new URLSearchParams(location.search).get("community_id") || "1",
        [location.search]
    );

    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [q, setQ] = React.useState("");
    const [currentUser, setCurrentUser] = React.useState(null);

    React.useEffect(() => {
        const u = getCurrentUserCandidate();
        setCurrentUser(u);
    }, []);

    const [selected, setSelected] = React.useState(new Set());

    // Pagination state
    const [page, setPage] = React.useState(1);
    const rowsPerPage = 10;

    // Dialog State
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [dialogMode, setDialogMode] = React.useState("create"); // 'create' | 'edit'
    const [editingUser, setEditingUser] = React.useState(null);
    const [actionLoading, setActionLoading] = React.useState(false);

    // Delete Dialog State
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [userToDelete, setUserToDelete] = React.useState(null);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const params = { search: q, ordering: "-date_joined", page_size: 100 };
            if (communityId) params.community_id = communityId;
            const data = await listAdminUsers(params);
            setRows(data.results ?? data);
            setPage(1);          // reset to first page on new data
        } finally {
            setLoading(false);
        }
    }, [q, communityId]);

    React.useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenCreate = () => {
        setDialogMode("create");
        setEditingUser(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (user) => {
        setDialogMode("edit");
        setEditingUser(user);
        setDialogOpen(true);
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        setEditingUser(null);
    };

    const handleSaveUser = async (data, setError) => {
        setActionLoading(true);
        try {
            if (dialogMode === "create") {
                await createAdminUser(data);
            } else {
                await updateAdminUser(editingUser.id, data);
            }
            await fetchData();
            handleDialogClose();
        } catch (err) {
            console.error("Failed to save user", err);
            const msg = err.response?.data?.detail || err.response?.data?.email?.[0] || "Failed to save user.";
            setError(msg);
        } finally {
            setActionLoading(false);
        }
    };

    const confirmDeleteUser = (user) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const handleExecuteDelete = async () => {
        if (!userToDelete) return;
        setActionLoading(true);
        try {
            await deleteAdminUser(userToDelete.id);
            await fetchData();
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        } catch (err) {
            alert("Failed to delete user: " + (err.response?.data?.detail || err.message));
        } finally {
            setActionLoading(false);
        }
    };


    // slice rows for current page
    const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
    const startIndex = (page - 1) * rowsPerPage;
    const paginatedRows = rows.slice(startIndex, startIndex + rowsPerPage);

    return (
        <Container maxWidth="lg" disableGutters sx={{ py: 3 }}>
            <Box className="grid grid-cols-12 gap-6">
                <Box
                    className="col-span-12"
                    sx={{
                        width: "100%",
                        maxWidth: "100%",
                    }}
                >
                    {/* Header */}
                    <Box
                        className="mb-4"
                        sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: { xs: "flex-start", sm: "center" },
                            gap: 2,
                        }}
                    >
                        <Avatar sx={{ bgcolor: "#0ea5a4" }}>
                            <AdminPanelSettingsRoundedIcon />
                        </Avatar>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="h5" className="font-extrabold">
                                Staff Management
                            </Typography>
                            <Typography className="text-slate-500">
                                Be careful! Granting staff or superuser access gives significant permissions.
                            </Typography>
                        </Box>

                        {/* Actions */}
                        <Box
                            sx={{
                                width: { xs: "100%", sm: "auto" },
                                display: "flex",
                                flexWrap: "wrap",
                                justifyContent: { xs: "flex-start", sm: "flex-end" },
                                gap: 1,
                            }}
                        >
                            <Button
                                variant="contained"
                                color="primary"
                                startIcon={<AddIcon />}
                                onClick={handleOpenCreate}
                                sx={{ borderRadius: 8, textTransform: "none" }}
                            >
                                Invite User
                            </Button>
                        </Box>
                    </Box>

                    <TextField
                        size="small"
                        placeholder="Search users..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ mb: 2, width: { xs: "100%", md: "100%", lg: 360 } }}
                    />

                    <TableContainer component={Paper} variant="outlined">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>User</TableCell>
                                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                                        Email
                                    </TableCell>
                                    <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                                        Last Login
                                    </TableCell>
                                    <TableCell align="center">Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell colSpan={6}>
                                                <Skeleton height={40} />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    paginatedRows.map((u) => (
                                        <TableRow key={u.id} hover>

                                            {/* User */}
                                            <TableCell>
                                                <Stack direction="row" spacing={2} alignItems="center">
                                                    <Avatar
                                                        src={u.avatar_url}
                                                        alt={u.username}
                                                        sx={{ width: 40, height: 40 }}
                                                    >
                                                        {u.username?.[0]?.toUpperCase()}
                                                    </Avatar>
                                                    <Box>
                                                        <Stack direction="row" spacing={0.5} alignItems="center">
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                                {(u.first_name || u.last_name) ? `${u.first_name} ${u.last_name}`.trim() : u.username}
                                                            </Typography>
                                                            {u.profile?.kyc_status === "approved" && (
                                                                <Tooltip title="Identity Verified">
                                                                    <VerifiedIcon sx={{ fontSize: 16, color: "#22d3ee" }} />
                                                                </Tooltip>
                                                            )}
                                                        </Stack>
                                                        <Stack direction="row" spacing={0.5} mt={0.5}>
                                                            {u.is_superuser && (
                                                                <Chip size="small" color="secondary" label="Superuser" sx={{ height: 20, fontSize: "0.65rem" }} />
                                                            )}
                                                            {!u.is_active && (
                                                                <Chip size="small" label="Inactive" sx={{ height: 20, fontSize: "0.65rem" }} />
                                                            )}
                                                        </Stack>
                                                    </Box>
                                                </Stack>
                                            </TableCell>

                                            {/* Email */}
                                            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                                                {u.email || "—"}
                                            </TableCell>

                                            {/* Last login */}
                                            <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                                                {u.last_login ? new Date(u.last_login).toLocaleString() : "—"}
                                            </TableCell>

                                                {/* Status instead of Switch */}
                                                <TableCell align="center">
                                                    {u.is_superuser ? (
                                                        <Chip label="Superuser" color="secondary" size="small" variant="filled" />
                                                    ) : u.is_staff ? (
                                                        <Chip label="Staff" color="success" size="small" variant="outlined" />
                                                    ) : (
                                                        <Chip label="User" size="small" variant="outlined" />
                                                    )}
                                                </TableCell>

                                                {/* Actions */}
                                                <TableCell align="right">
                                                    <Stack direction="row" justifyContent="flex-end">
                                                        <Tooltip title="Edit Details">
                                                            <span>
                                                                <IconButton 
                                                                    size="small" 
                                                                    onClick={() => handleOpenEdit(u)}
                                                                    disabled={currentUser && currentUser.id === u.id}
                                                                >
                                                                    <EditIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                        <Tooltip title="Delete User">
                                                            <span>
                                                                <IconButton 
                                                                    size="small" 
                                                                    color="error" 
                                                                    onClick={() => confirmDeleteUser(u)}
                                                                    disabled={currentUser && currentUser.id === u.id}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Stack>
                                                </TableCell>
                                        </TableRow>
                                    ))
                                )}
                                {!loading && paginatedRows.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">No users found.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Pagination control */}
                    {rows.length > rowsPerPage && (
                        <Box mt={2} display="flex" justifyContent="flex-end">
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(_, value) => setPage(value)}
                                color="primary"
                                size="small"
                            />
                        </Box>
                    )}

                    {/* Create/Edit Helper Dialog */}
                    <UserDialog
                        open={dialogOpen}
                        onClose={handleDialogClose}
                        mode={dialogMode}
                        initialData={editingUser}
                        onSave={handleSaveUser}
                        loading={actionLoading}
                    />

                    {/* Delete Confirmation Dialog */}
                    <Dialog
                        open={deleteDialogOpen}
                        onClose={() => setDeleteDialogOpen(false)}
                        maxWidth="xs"
                        fullWidth
                    >
                        <DialogTitle>Delete User?</DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" color="text.secondary">
                                Are you sure you want to delete <strong>{userToDelete?.username || userToDelete?.email}</strong>?
                            </Typography>
                            <Alert severity="warning" sx={{ mt: 2 }}>
                                This action is permanent. The user will be removed from the platform.
                            </Alert>

                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setDeleteDialogOpen(false)} color="inherit" disabled={actionLoading}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleExecuteDelete}
                                color="error"
                                variant="contained"
                                disabled={actionLoading}
                                startIcon={actionLoading ? <CircularProgress size={20} color="inherit" /> : null}
                            >
                                {actionLoading ? "Deleting..." : "Delete User"}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </Box>
            </Box>
        </Container>
    );
}
