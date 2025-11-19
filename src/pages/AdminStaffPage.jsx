import * as React from "react";
import { isOwnerUser } from "../utils/adminRole";
import {
    Box, Container, Typography, TextField, InputAdornment,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
    Paper, Switch, Chip, IconButton, Tooltip, Button, Stack, CircularProgress
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import RemoveDoneIcon from "@mui/icons-material/RemoveDone";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import AdminSidebar from "../components/AdminSidebar";
import { listAdminUsers, patchStaff, bulkSetStaff } from "../utils/api";
import { useLocation } from "react-router-dom";

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
    const communityId = React.useMemo(() => new URLSearchParams(location.search).get("community_id") || "16", [location.search]);
    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [q, setQ] = React.useState("");
    const [selected, setSelected] = React.useState(new Set());
    // const communityId = new URLSearchParams(location.search).get("community_id");
    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const params = { search: q, ordering: "-date_joined", page_size: 100 };
            if (communityId) params.community_id = communityId;
            const data = await listAdminUsers(params);
            setRows(data.results ?? data);
        } finally {
            setLoading(false);
        }
    }, [q, communityId]);

    React.useEffect(() => { fetchData(); }, [fetchData]);

    const toggleStaff = async (user, next) => {
        const snapshot = rows.slice();
        setRows(prev => prev.map(r => (r.id === user.id ? { ...r, is_staff: next } : r)));
        try {
            await patchStaff(user.id, next);
        } catch {
            setRows(snapshot); // revert on error
        }
    };

    const bulk = async (flag) => {
        const ids = Array.from(selected);
        if (!ids.length) return;
        setLoading(true);
        try {
            await bulkSetStaff(ids, flag);
            await fetchData();
            setSelected(new Set());
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Box className="grid grid-cols-12 gap-6">
                <Box className="col-span-12 md:col-span-9">
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                        <Stack direction="row" spacing={1} alignItems="center">
                            <AdminPanelSettingsRoundedIcon />
                            <Typography variant="h5">Staff Management</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1}>
                            <Tooltip title="Refresh">
                                <IconButton onClick={fetchData}><RefreshIcon /></IconButton>
                            </Tooltip>
                            <Button size="small" startIcon={<DoneAllIcon />} onClick={() => bulk(true)} disabled={!selected.size || loading}>
                                Make Staff
                            </Button>
                            <Button size="small" color="warning" startIcon={<RemoveDoneIcon />} onClick={() => bulk(false)} disabled={!selected.size || loading}>
                                Remove Staff
                            </Button>
                        </Stack>
                    </Stack>

                    <TextField
                        size="small"
                        placeholder="Search users"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
                        sx={{ mb: 2, width: 360 }}
                    />

                    {loading ? (
                        <Box py={8} textAlign="center"><CircularProgress /></Box>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell width={40}></TableCell>
                                        <TableCell>User</TableCell>
                                        <TableCell>Email</TableCell>
                                        <TableCell>Joined</TableCell>
                                        <TableCell>Last Login</TableCell>
                                        <TableCell align="center">Staff</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((u) => (
                                        <TableRow key={u.id} hover>
                                            <TableCell>
                                                <input
                                                    type="checkbox"
                                                    checked={selected.has(u.id)}
                                                    onChange={(e) => {
                                                        const s = new Set(selected);
                                                        e.target.checked ? s.add(u.id) : s.delete(u.id);
                                                        setSelected(s);
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <Chip size="small" label={u.username} />

                                                    {u.is_superuser && <Chip size="small" color="secondary" label="Superuser" />}
                                                </Stack>
                                            </TableCell>
                                            <TableCell>{(u.first_name || u.last_name) ? `${u.first_name} ${u.last_name}` : "—"}</TableCell>
                                            <TableCell>{u.email || "—"}</TableCell>
                                            <TableCell>{u.last_login ? new Date(u.last_login).toLocaleString() : "—"}</TableCell>
                                            <TableCell align="center">
                                                <Switch
                                                    checked={Boolean(u.is_staff)}
                                                    onChange={(e) => toggleStaff(u, e.target.checked)}
                                                    disabled={u.is_superuser}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            </Box>
        </Container>
    );
}
