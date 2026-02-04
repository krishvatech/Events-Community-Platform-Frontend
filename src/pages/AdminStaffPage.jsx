import * as React from "react";
import { isOwnerUser } from "../utils/adminRole";
import {
    Box, Container, Typography, TextField, InputAdornment,
    Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
    Paper, Switch, Chip, IconButton, Tooltip, Button, Stack,
    CircularProgress, Pagination, Avatar, Skeleton
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VerifiedIcon from "@mui/icons-material/Verified";
import RefreshIcon from "@mui/icons-material/Refresh";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import PersonRemoveRoundedIcon from "@mui/icons-material/PersonRemoveRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
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

    const communityId = React.useMemo(
        () => new URLSearchParams(location.search).get("community_id") || "1",
        [location.search]
    );

    const [rows, setRows] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [q, setQ] = React.useState("");
    const [selected, setSelected] = React.useState(new Set());

    // ✅ pagination state
    const [page, setPage] = React.useState(1);
    const rowsPerPage = 6;

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const params = { search: q, ordering: "-date_joined", page_size: 100 };
            if (communityId) params.community_id = communityId;
            const data = await listAdminUsers(params);
            setRows(data.results ?? data);
            setPage(1);          // ✅ reset to first page on new data
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

    // ✅ slice rows for current page
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
                        maxWidth: "100%",   // ✅ let the table span like Resources
                    }}
                >
                    {/* Header – same style as Admin Events page */}
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
                            {("A")[0].toUpperCase()}
                        </Avatar>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="h5" className="font-extrabold">
                                Staff Management
                            </Typography>
                            <Typography className="text-slate-500">
                                Grant or remove staff access for your community members.
                            </Typography>
                        </Box>

                        {/* Right side – bulk actions, like Events “Create Event” button */}
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
                                size="small"
                                variant="contained"
                                startIcon={<PersonAddAlt1RoundedIcon />}
                                onClick={() => bulk(true)}
                                disabled={!selected.size || loading}
                                sx={{
                                    textTransform: "none",
                                    borderRadius: 999,
                                    px: 1.5,
                                }}
                            >
                                Make staff
                            </Button>

                            <Button
                                size="small"
                                variant="outlined"
                                color="warning"
                                startIcon={<PersonRemoveRoundedIcon />}
                                onClick={() => bulk(false)}
                                disabled={!selected.size || loading}
                                sx={{
                                    textTransform: "none",
                                    borderRadius: 999,
                                    px: 1.5,
                                }}
                            >
                                Remove staff
                            </Button>
                        </Box>
                    </Box>

                    <TextField
                        size="small"
                        placeholder="Search users"
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

                    {loading ? (
                        <>
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell
                                                width={40}
                                                sx={{ display: { xs: "none", lg: "table-cell" } }}
                                            />
                                            <TableCell>User</TableCell>
                                            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                                                Email
                                            </TableCell>
                                            <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                                                Last Login
                                            </TableCell>
                                            <TableCell align="center">Staff</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Array.from({ length: rowsPerPage }).map((_, idx) => (
                                            <TableRow key={idx}>
                                                {/* Checkbox column */}
                                                <TableCell
                                                    sx={{ display: { xs: "none", lg: "table-cell" } }}
                                                >
                                                    <Skeleton variant="rounded" width={18} height={18} />
                                                </TableCell>

                                                {/* User */}
                                                <TableCell>
                                                    <Stack direction="row" spacing={1} alignItems="center">
                                                        <Skeleton
                                                            variant="rounded"
                                                            width={80}
                                                            height={24}
                                                        />
                                                        <Skeleton
                                                            variant="rounded"
                                                            width={70}
                                                            height={24}
                                                        />
                                                    </Stack>
                                                </TableCell>

                                                {/* Email */}
                                                <TableCell
                                                    sx={{ display: { xs: "none", sm: "table-cell" } }}
                                                >
                                                    <Skeleton
                                                        variant="text"
                                                        width="80%"
                                                        height={20}
                                                    />
                                                </TableCell>

                                                {/* Last login */}
                                                <TableCell
                                                    sx={{ display: { xs: "none", lg: "table-cell" } }}
                                                >
                                                    <Skeleton
                                                        variant="text"
                                                        width="60%"
                                                        height={20}
                                                    />
                                                </TableCell>

                                                {/* Staff switch */}
                                                <TableCell align="center">
                                                    <Skeleton
                                                        variant="rounded"
                                                        width={36}
                                                        height={20}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    ) : (
                        <>
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            {/* Checkbox column – only on large desktop */}
                                            <TableCell
                                                width={40}
                                                sx={{ display: { xs: "none", lg: "table-cell" } }}
                                            ></TableCell>

                                            <TableCell>User</TableCell>

                                            {/* Email – show from tablet upwards */}
                                            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                                                Email
                                            </TableCell>

                                            {/* Last Login – only big desktop */}
                                            <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                                                Last Login
                                            </TableCell>

                                            <TableCell align="center">Staff</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {paginatedRows.map((u) => (
                                            <TableRow key={u.id} hover>
                                                <TableCell
                                                    sx={{ display: { xs: "none", lg: "table-cell" } }}
                                                >
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
                                                            {u.is_superuser && (
                                                                <Chip size="small" color="secondary" label="Superuser" sx={{ height: 20, fontSize: "0.65rem", mt: 0.5 }} />
                                                            )}
                                                        </Box>
                                                    </Stack>
                                                </TableCell>

                                                {/* Email – hide on very small screens */}
                                                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                                                    {u.email || "—"}
                                                </TableCell>

                                                {/* Last login – show from lg and up */}
                                                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                                                    {u.last_login ? new Date(u.last_login).toLocaleString() : "—"}
                                                </TableCell>

                                                {/* Staff switch */}
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

                            {/* ✅ Pagination control */}
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
                        </>
                    )}
                </Box>
            </Box>
        </Container>
    );
}
