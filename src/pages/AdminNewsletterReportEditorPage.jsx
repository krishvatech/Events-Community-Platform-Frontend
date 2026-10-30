import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";

import {
  createNewsletterReport,
  getNewsletterReport,
  getNewsletterReportSource,
  listNewsletterReportSources,
  updateNewsletterReport,
} from "../services/newsletterService";
import {
  AGGREGATE_FUNCTIONS,
  CARD_BORDER,
  DESCRIPTION_MAX_LENGTH,
  LIST_CONDITIONS,
  MAX_FILTERS,
  MONTH_FREQUENCIES,
  NAME_MAX_LENGTH,
  NAVY,
  NO_VALUE_CONDITIONS,
  REPORTS_PATH,
  SCHEDULE_DAYS,
  SCHEDULE_UNITS,
  blankReport,
  draftToPayload,
  getErrorMessage,
  isValidReportId,
  reportPath,
  reportToDraft,
  validateReportDraft,
} from "./newsletterReportShared.jsx";

const DATE_TYPES = ["datetime", "date", "time"];

function Section({ title, help, children }) {
  return (
    <Paper variant="outlined" component="section" aria-label={title} sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 2, borderColor: CARD_BORDER }}>
      <Typography component="h2" sx={{ fontWeight: 850, color: NAVY }}>{title}</Typography>
      {help && <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{help}</Typography>}
      <Box sx={{ mt: help ? 0 : 2 }}>{children}</Box>
    </Paper>
  );
}

function FieldPicker({ label, options, value, onChange, disabled, size = "small", sx }) {
  const selected = options.find((option) => option.key === value) || null;
  return (
    <Autocomplete
      size={size}
      options={options}
      value={selected}
      disabled={disabled}
      getOptionLabel={(option) => option.label || option.key}
      isOptionEqualToValue={(option, current) => option.key === current.key}
      onChange={(_, option) => onChange(option?.key || "")}
      renderInput={(params) => <TextField {...params} label={label} />}
      sx={sx}
    />
  );
}

function ColumnsPicker({ label, options, value, onChange, help }) {
  const byKey = useMemo(() => new Map(options.map((option) => [option.key, option])), [options]);
  return (
    <Autocomplete
      multiple
      size="small"
      options={options}
      value={value.map((key) => byKey.get(key) || { key, label: key })}
      disableCloseOnSelect
      filterSelectedOptions
      getOptionLabel={(option) => option.label || option.key}
      isOptionEqualToValue={(option, current) => option.key === current.key}
      onChange={(_, selected) => onChange(selected.map((option) => option.key))}
      renderInput={(params) => <TextField {...params} label={label} helperText={help} />}
    />
  );
}

function FilterRow({ index, filter, definitions, onChange, onRemove }) {
  const definition = definitions.find((item) => item.key === filter.column);
  const operators = definition?.operators || [];
  const listCondition = LIST_CONDITIONS.includes(filter.condition);
  const noValue = NO_VALUE_CONDITIONS.includes(filter.condition);
  const choices = definition?.choices || [];
  const isDate = DATE_TYPES.includes(definition?.type);

  const change = (patch) => onChange({ ...filter, ...patch });
  const changeColumn = (column) => {
    const next = definitions.find((item) => item.key === column);
    const firstOperator = next?.operators?.[0]?.value || "";
    change({ column, condition: firstOperator, value: LIST_CONDITIONS.includes(firstOperator) ? [] : "" });
  };
  const changeCondition = (condition) => {
    const wasList = LIST_CONDITIONS.includes(filter.condition);
    const isList = LIST_CONDITIONS.includes(condition);
    change({ condition, value: wasList === isList ? filter.value : isList ? [] : "" });
  };

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "flex-start" }} data-filter-row={index}>
      {index > 0 ? (
        <TextField select size="small" label="Join" value={filter.glue} onChange={(event) => change({ glue: event.target.value })} sx={{ width: { md: 90 } }}>
          <MenuItem value="and">and</MenuItem>
          <MenuItem value="or">or</MenuItem>
        </TextField>
      ) : (
        <Box sx={{ width: { md: 90 }, display: { xs: "none", md: "block" }, pt: 1, color: "text.secondary" }}>Where</Box>
      )}
      <FieldPicker label={`Filter ${index + 1} field`} options={definitions} value={filter.column} onChange={changeColumn} sx={{ flex: 2, minWidth: 0 }} />
      <TextField
        select
        size="small"
        label="Condition"
        value={operators.some((option) => option.value === filter.condition) ? filter.condition : ""}
        onChange={(event) => changeCondition(event.target.value)}
        disabled={!definition}
        sx={{ flex: 1, minWidth: 140 }}
      >
        {operators.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
      </TextField>
      {noValue ? (
        <Box sx={{ flex: 2 }} />
      ) : listCondition ? (
        <Autocomplete
          multiple
          freeSolo={!choices.length}
          size="small"
          options={choices.map((option) => option.value)}
          getOptionLabel={(value) => choices.find((option) => option.value === value)?.label || value}
          value={Array.isArray(filter.value) ? filter.value : []}
          onChange={(_, values) => change({ value: values.map(String) })}
          renderInput={(params) => <TextField {...params} label="Values" helperText={choices.length ? "" : "Type a value and press Enter"} />}
          sx={{ flex: 2, minWidth: 0 }}
        />
      ) : choices.length ? (
        <TextField select size="small" label="Value" value={filter.value} onChange={(event) => change({ value: event.target.value })} sx={{ flex: 2, minWidth: 0 }}>
          {choices.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
      ) : (
        <TextField
          size="small"
          label="Value"
          value={filter.value}
          onChange={(event) => change({ value: event.target.value })}
          placeholder={isDate ? "YYYY-MM-DD HH:MM:SS" : ""}
          helperText={isDate ? "UTC" : ""}
          inputProps={{ maxLength: 500 }}
          sx={{ flex: 2, minWidth: 0 }}
        />
      )}
      {/* describeChild: the tip is a description; the checkbox stays named "Dynamic". */}
      <Tooltip describeChild title="Viewers can change this filter's value when they run the report">
        <FormControlLabel
          control={<Checkbox size="small" checked={Boolean(filter.dynamic) && !listCondition && !noValue} disabled={listCondition || noValue}
            onChange={(event) => change({ dynamic: event.target.checked })} />}
          label="Dynamic"
          sx={{ mr: 0, whiteSpace: "nowrap" }}
        />
      </Tooltip>
      <IconButton aria-label={`Remove filter ${index + 1}`} onClick={onRemove} size="small" sx={{ alignSelf: { xs: "flex-end", md: "center" } }}>
        <DeleteOutlineRoundedIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}

export default function AdminNewsletterReportEditorPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const editing = reportId !== undefined;
  const [draft, setDraft] = useState(blankReport);
  const [sources, setSources] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  // The heading names the saved report, not the name being typed.
  const [savedName, setSavedName] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        if (editing && !isValidReportId(reportId)) throw Object.assign(new Error("bad id"), { notFound: true });
        const [sourceList, report] = await Promise.all([
          listNewsletterReportSources(),
          editing ? getNewsletterReport(reportId) : Promise.resolve(null),
        ]);
        if (!active) return;
        setSources(Array.isArray(sourceList?.results) ? sourceList.results : []);
        if (report) {
          setDraft(reportToDraft(report));
          setSavedName(report.name || "");
        }
      } catch (err) {
        if (active) setLoadError(err?.notFound ? "That report does not exist." : getErrorMessage(err, "We could not load the report builder."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [editing, reportId]);

  useEffect(() => {
    if (!draft.source) {
      setMeta(null);
      return undefined;
    }
    let active = true;
    setMetaLoading(true);
    getNewsletterReportSource(draft.source)
      .then((data) => { if (active) setMeta(data); })
      .catch((err) => { if (active) { setMeta(null); setSaveError(getErrorMessage(err, "We could not load this data source.")); } })
      .finally(() => { if (active) setMetaLoading(false); });
    return () => { active = false; };
  }, [draft.source]);

  const set = (patch) => {
    setTouched(true);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const chooseSource = (source) => {
    // A new source has different columns: start the definition again.
    setTouched(true);
    setDraft((current) => ({ ...blankReport, name: current.name, description: current.description, isPublished: current.isPublished,
      system: current.system, source }));
  };

  const columnOptions = meta?.columns || [];
  const groupByOptions = useMemo(
    () => columnOptions.filter((column) => (meta?.groupByColumns || []).includes(column.key)),
    [columnOptions, meta]
  );
  const filterOptions = meta?.filters || [];
  const graphOptions = meta?.graphs || [];
  const problem = validateReportDraft(draft);

  const save = async () => {
    setTouched(true);
    if (problem) {
      setSaveError(problem);
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const payload = draftToPayload(draft, { includeSource: !editing });
      const saved = editing ? await updateNewsletterReport(reportId, payload) : await createNewsletterReport(payload);
      navigate(reportPath(saved.id), { state: { flash: editing ? "Report saved." : "Report created." } });
    } catch (err) {
      setSaveError(getErrorMessage(err, "The report could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress aria-label="Loading report builder" /></Stack>;
  }
  if (loadError) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{loadError}</Alert>
        <Button component={RouterLink} to={REPORTS_PATH} startIcon={<ArrowBackRoundedIcon />} sx={{ alignSelf: "flex-start", textTransform: "none" }}>Back to Reports</Button>
      </Stack>
    );
  }

  const groupedSources = sources.map((source) => ({ ...source, key: source.source }));

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Button component={RouterLink} to={editing ? reportPath(reportId) : REPORTS_PATH} startIcon={<ArrowBackRoundedIcon />} size="small" sx={{ textTransform: "none", mb: 1 }}>
            {editing ? "Back to report" : "Back to Reports"}
          </Button>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 850, color: NAVY, wordBreak: "break-word" }}>
            {editing ? `Edit ${savedName || "report"}` : "Create Report"}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Button onClick={() => navigate(editing ? reportPath(reportId) : REPORTS_PATH)} disabled={saving} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={save} disabled={saving || metaLoading} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
            {saving ? "Saving…" : editing ? "Save Report" : "Create Report"}
          </Button>
        </Stack>
      </Stack>

      {saveError && <Alert severity="error" onClose={() => setSaveError("")}>{saveError}</Alert>}

      <Section title="Details">
        <Stack spacing={2}>
          <TextField label="Report name" required value={draft.name} onChange={(event) => set({ name: event.target.value })}
            inputProps={{ maxLength: NAME_MAX_LENGTH }} error={touched && !draft.name.trim()} />
          <TextField label="Description" value={draft.description} onChange={(event) => set({ description: event.target.value })}
            multiline minRows={2} inputProps={{ maxLength: DESCRIPTION_MAX_LENGTH }} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControlLabel control={<Switch checked={draft.isPublished} onChange={(event) => set({ isPublished: event.target.checked })} />} label="Published" />
            <FormControlLabel control={<Switch checked={draft.system} onChange={(event) => set({ system: event.target.checked })} />} label="Shared with all Mautic users" />
          </Stack>
          {!draft.isPublished && <Alert severity="info" variant="outlined">Unpublished reports are never emailed on their schedule.</Alert>}
        </Stack>
      </Section>

      <Section title="Data source" help={editing ? "A saved report keeps its data source. Create a new report to use another one." : "What the report is about. Each source has its own columns, filters and graphs."}>
        <Autocomplete
          options={groupedSources}
          groupBy={(option) => option.groupLabel || ""}
          value={groupedSources.find((option) => option.source === draft.source) || null}
          getOptionLabel={(option) => option.label || option.source}
          isOptionEqualToValue={(option, current) => option.source === current.source}
          onChange={(_, option) => chooseSource(option?.source || "")}
          disabled={editing}
          renderInput={(params) => <TextField {...params} label="Data source" required />}
        />
        {metaLoading && <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}><CircularProgress size={18} /><Typography variant="body2">Loading columns…</Typography></Stack>}
      </Section>

      {meta && !metaLoading && (
        <>
          <Section title="Columns" help="The table's columns, in the order chosen.">
            <ColumnsPicker label="Columns" options={columnOptions} value={draft.columns} onChange={(columns) => set({ columns })} />
          </Section>

          <Section title="Filters" help="Only rows that match these filters are included. Dynamic filters can be changed each time the report is run.">
            <Stack spacing={2} divider={<Divider flexItem />}>
              {draft.filters.map((filter, index) => (
                <FilterRow
                  key={index}
                  index={index}
                  filter={filter}
                  definitions={filterOptions}
                  onChange={(next) => set({ filters: draft.filters.map((item, i) => (i === index ? next : item)) })}
                  onRemove={() => set({ filters: draft.filters.filter((_, i) => i !== index) })}
                />
              ))}
            </Stack>
            <Button startIcon={<AddRoundedIcon />} onClick={() => set({ filters: [...draft.filters, { column: "", glue: "and", condition: "", value: "", dynamic: false }] })}
              disabled={draft.filters.length >= MAX_FILTERS} sx={{ textTransform: "none", mt: draft.filters.length ? 2 : 0 }}>
              Add Filter
            </Button>
          </Section>

          <Section title="Group & calculate" help="Group rows by columns, then count, sum or average within each group. When grouping, every column in the table must also be grouped.">
            <Stack spacing={2}>
              <ColumnsPicker label="Group by" options={groupByOptions} value={draft.groupBy} onChange={(groupBy) => set({ groupBy })} />
              {draft.aggregators.map((item, index) => (
                <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField select size="small" label="Function" value={item.function} sx={{ minWidth: 130 }}
                    onChange={(event) => set({ aggregators: draft.aggregators.map((a, i) => (i === index ? { ...a, function: event.target.value } : a)) })}>
                    {AGGREGATE_FUNCTIONS.map((fn) => <MenuItem key={fn} value={fn}>{fn}</MenuItem>)}
                  </TextField>
                  <FieldPicker label={`Calculation ${index + 1} column`} options={columnOptions} value={item.column} sx={{ flex: 1 }}
                    onChange={(column) => set({ aggregators: draft.aggregators.map((a, i) => (i === index ? { ...a, column } : a)) })} />
                  <IconButton aria-label={`Remove calculation ${index + 1}`} size="small" onClick={() => set({ aggregators: draft.aggregators.filter((_, i) => i !== index) })}>
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Button startIcon={<AddRoundedIcon />} onClick={() => set({ aggregators: [...draft.aggregators, { function: "COUNT", column: "" }] })}
                disabled={!draft.groupBy.length} sx={{ alignSelf: "flex-start", textTransform: "none" }}>
                Add Calculation
              </Button>
            </Stack>
          </Section>

          <Section title="Sort" help="How the table rows are ordered.">
            <Stack spacing={2}>
              {draft.tableOrder.map((item, index) => (
                <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <FieldPicker label={`Sort ${index + 1} column`} options={columnOptions} value={item.column} sx={{ flex: 1 }}
                    onChange={(column) => set({ tableOrder: draft.tableOrder.map((o, i) => (i === index ? { ...o, column } : o)) })} />
                  <TextField select size="small" label="Direction" value={item.direction} sx={{ minWidth: 150 }}
                    onChange={(event) => set({ tableOrder: draft.tableOrder.map((o, i) => (i === index ? { ...o, direction: event.target.value } : o)) })}>
                    <MenuItem value="ASC">Ascending</MenuItem>
                    <MenuItem value="DESC">Descending</MenuItem>
                  </TextField>
                  <IconButton aria-label={`Remove sort ${index + 1}`} size="small" onClick={() => set({ tableOrder: draft.tableOrder.filter((_, i) => i !== index) })}>
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Button startIcon={<AddRoundedIcon />} onClick={() => set({ tableOrder: [...draft.tableOrder, { column: "", direction: "ASC" }] })}
                sx={{ alignSelf: "flex-start", textTransform: "none" }}>
                Add Sort
              </Button>
            </Stack>
          </Section>

          <Section title="Graphs" help={graphOptions.length ? "Charts Mautic draws for this data source, shown in the report." : "This data source has no graphs."}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, columnGap: 2 }}>
              {graphOptions.map((graph) => (
                <FormControlLabel
                  key={graph.key}
                  control={<Checkbox checked={draft.graphs.includes(graph.key)}
                    onChange={(event) => set({ graphs: event.target.checked ? [...draft.graphs, graph.key] : draft.graphs.filter((key) => key !== graph.key) })} />}
                  label={<span>{graph.label} <Chip size="small" label={graph.type} sx={{ ml: 0.5, height: 20 }} /></span>}
                />
              ))}
            </Box>
            <Stack sx={{ mt: 1 }}>
              <FormControlLabel control={<Switch checked={draft.settings.showGraphsAboveTable}
                onChange={(event) => set({ settings: { ...draft.settings, showGraphsAboveTable: event.target.checked } })} />} label="Show graphs above the table" />
              <FormControlLabel control={<Switch checked={draft.settings.showDynamicFilters}
                onChange={(event) => set({ settings: { ...draft.settings, showDynamicFilters: event.target.checked } })} />} label="Show dynamic filters when viewing" />
              <FormControlLabel control={<Switch checked={draft.settings.hideDateRangeFilter}
                onChange={(event) => set({ settings: { ...draft.settings, hideDateRangeFilter: event.target.checked } })} />} label="Hide the date range when viewing" />
            </Stack>
          </Section>

          <Section title="Email schedule" help="Mautic emails the report as a CSV file. Each email covers the previous day, week or month.">
            <Stack spacing={2}>
              <FormControlLabel control={<Switch checked={draft.isScheduled} onChange={(event) => set({ isScheduled: event.target.checked })} />} label="Email this report on a schedule" />
              {draft.isScheduled && (
                <>
                  <TextField label="Send to" required value={draft.toAddress} onChange={(event) => set({ toAddress: event.target.value })}
                    helperText="Email addresses, separated by commas" />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField select size="small" label="Every" value={draft.scheduleUnit} onChange={(event) => set({ scheduleUnit: event.target.value })} sx={{ minWidth: 150 }}>
                      {SCHEDULE_UNITS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                    </TextField>
                    {draft.scheduleUnit === "MONTHLY" && (
                      <TextField select size="small" label="Which" value={draft.scheduleMonthFrequency} onChange={(event) => set({ scheduleMonthFrequency: event.target.value })} sx={{ minWidth: 120 }}>
                        {MONTH_FREQUENCIES.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                      </TextField>
                    )}
                    {draft.scheduleUnit !== "DAILY" && (
                      <TextField select size="small" label="Day" value={draft.scheduleDay} onChange={(event) => set({ scheduleDay: event.target.value })} sx={{ minWidth: 200 }}>
                        {SCHEDULE_DAYS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                      </TextField>
                    )}
                  </Stack>
                  <Alert severity="warning" variant="outlined">
                    Reports larger than about 5 MB arrive as a download link that needs a Mautic login, not as an attachment.
                    Use Export on the report page for large reports.
                  </Alert>
                </>
              )}
            </Stack>
          </Section>
        </>
      )}
    </Stack>
  );
}
