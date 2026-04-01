import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { LocalizationProvider, TimePicker, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tzPlugin from "dayjs/plugin/timezone";
import { validateSessionTimes } from "../utils/dateTimeValidator";
import { formatSessionTimeRange } from "../utils/timezoneUtils";

dayjs.extend(utc);
dayjs.extend(tzPlugin);

const SESSION_TYPES = [
  { value: "main", label: "Main Session" },
  { value: "breakout", label: "Breakout Session" },
  { value: "workshop", label: "Workshop" },
  { value: "networking", label: "Networking" },
];

// Timezone-aware ISO conversion (matching AdminEvents.jsx toUTCISO)
// This ensures session times are in the same format as event times
const toUTCISO = (dayjsDate, tz = "UTC") => {
  if (!dayjsDate || !tz) return null;
  try {
    const date = dayjsDate.format("YYYY-MM-DD");
    const time = dayjsDate.format("HH:mm");
    const dt = dayjs.tz(`${date}T${time}:00`, tz);
    if (!dt.isValid()) {
      console.error("Invalid datetime:", { date, time, tz });
      return null;
    }
    const iso = dt.toDate().toISOString();
    console.log("📤 SessionDialog toUTCISO:", {
      inputDate: date,
      inputTime: time,
      timezone: tz,
      dayjsString: `${date}T${time}:00`,
      resultISO: iso,
    });
    return iso;
  } catch (e) {
    console.error("toUTCISO error:", e);
    return null;
  }
};

function SessionDialog({
  open,
  onClose,
  onSubmit,
  initialData = null,
  eventStartTime = null,
  eventEndTime = null,
  timezone = "UTC",
  eventStartDate = null, // Add event start/end dates for session validation
  eventEndDate = null,
  isMultiDay = false,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(dayjs());
  const [startTime, setStartTime] = useState(dayjs());
  const [endDate, setEndDate] = useState(dayjs().add(2, "hours"));
  const [endTime, setEndTime] = useState(dayjs().add(2, "hours"));
  const [sessionType, setSessionType] = useState("main");
  const [errors, setErrors] = useState({});

  // Helper to get default event date from eventStartTime
  const getDefaultEventDate = () => {
    if (eventStartTime) {
      return dayjs(eventStartTime).format("YYYY-MM-DD");
    }
    return dayjs().format("YYYY-MM-DD");
  };

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setTitle("");
      setDescription("");
      setStartDate(dayjs());
      setStartTime(dayjs());
      setEndDate(dayjs().add(2, "hours"));
      setEndTime(dayjs().add(2, "hours"));
      setSessionType("main");
      setErrors({});
    } else if (initialData) {
      // Load existing session data
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setSessionType(initialData.sessionType || "main");

      if (initialData.startTime) {
        // Convert ISO time to event's timezone
        const sd = timezone ? dayjs(initialData.startTime).tz(timezone) : dayjs(initialData.startTime);
        setStartDate(sd);
        setStartTime(sd);
      }
      if (initialData.endTime) {
        // Convert ISO time to event's timezone
        const ed = timezone ? dayjs(initialData.endTime).tz(timezone) : dayjs(initialData.endTime);
        setEndDate(ed);
        setEndTime(ed);
      }
    } else {
      // Default values for new session - use event start time
      let defaultStart = dayjs();

      if (eventStartTime) {
        // Convert event start time to event's timezone
        defaultStart = timezone ? dayjs(eventStartTime).tz(timezone) : dayjs(eventStartTime);
      } else {
        // Fallback: 9:00 AM today in event's timezone
        defaultStart = timezone
          ? dayjs().tz(timezone).hour(9).minute(0).second(0)
          : dayjs().hour(9).minute(0).second(0);
      }

      const defaultEnd = defaultStart.add(1, "hour");

      setStartDate(defaultStart);
      setStartTime(defaultStart);
      setEndDate(defaultEnd);
      setEndTime(defaultEnd);
    }
  }, [open, initialData, eventStartTime, timezone]);

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Session title is required";

    // Guard against invalid Dayjs values before combining date + time
    if (!startTime || !startTime.isValid()) {
      e.startTime = "Invalid time.";
    }
    if (!endTime || !endTime.isValid()) {
      e.endTime = "Invalid time.";
    }

    if (!e.startTime && !e.endTime && startDate && endDate) {
      // Extract date and time strings for validation
      const sessionStartDateStr = startDate.format("YYYY-MM-DD");
      const sessionStartTimeStr = startTime.format("HH:mm");
      const sessionEndDateStr = endDate.format("YYYY-MM-DD");
      const sessionEndTimeStr = endTime.format("HH:mm");

      // Derive event dates from eventStartTime/eventEndTime if available
      let eventStartDateStr = eventStartDate;
      let eventEndDateStr = eventEndDate;

      if (!eventStartDateStr && eventStartTime) {
        eventStartDateStr = dayjs(eventStartTime).tz(timezone).format("YYYY-MM-DD");
      }
      if (!eventEndDateStr && eventEndTime) {
        eventEndDateStr = dayjs(eventEndTime).tz(timezone).format("YYYY-MM-DD");
      }

      // Timezone-aware session validation
      if (eventStartDateStr && eventEndDateStr) {
        const validation = validateSessionTimes(
          sessionStartDateStr,
          sessionStartTimeStr,
          sessionEndDateStr,
          sessionEndTimeStr,
          eventStartDateStr,
          eventEndDateStr,
          timezone,
          initialData, // pass existing session for PATCH bypass logic
          isMultiDay
        );

        if (!validation.valid) {
          Object.assign(e, validation.errors);
          if (validation.errors.sessionStartTime && !e.startTime) {
            e.startTime = validation.errors.sessionStartTime;
          }
          if (validation.errors.sessionEndTime && !e.endTime) {
            e.endTime = validation.errors.sessionEndTime;
          }
        }
      }

      // Fallback boundary checks (for cases where timezone-aware validation doesn't apply)
      if (!isMultiDay && eventStartTime && eventEndTime && !e.sessionStartTime && !e.sessionEndTime) {
        const startLocal = dayjs.tz(`${sessionStartDateStr}T${sessionStartTimeStr}:00`, timezone);
        const endLocal = dayjs.tz(`${sessionEndDateStr}T${sessionEndTimeStr}:00`, timezone);
        const eventStartLocal = dayjs(eventStartTime).tz(timezone);
        const eventEndLocal = dayjs(eventEndTime).tz(timezone);

        if (startLocal.isBefore(eventStartLocal)) {
          e.startTime = `Session cannot start before event (${eventStartLocal.format("MMM DD, HH:mm")})`;
        }

        let cutoffTime = eventEndLocal;
        if (eventEndLocal.hour() === 0 && eventEndLocal.minute() === 0) {
          cutoffTime = eventEndLocal.add(1, "day");
        }

        if (endLocal.isAfter(cutoffTime)) {
          e.endTime = `Session cannot end after event (${eventEndLocal.format("MMM DD, HH:mm")})`;
        }
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const start = startDate.hour(startTime.hour()).minute(startTime.minute());
    const end = endDate.hour(endTime.hour()).minute(endTime.minute());

    const startISO = toUTCISO(start, timezone);
    const endISO = toUTCISO(end, timezone);

    console.log("🔍 SessionDialog Submit Debug:", {
      start: start.toString(),
      end: end.toString(),
      timezone,
      startISO,
      endISO,
    });

    const sessionData = {
      title: title.trim(),
      description: description.trim(),
      sessionType,
      startTime: startISO,
      endTime: endISO,
      // Used for display/editing
      _startDate: startDate.format("YYYY-MM-DD"),
      _startTime: startTime.format("HH:mm"),
      _endDate: endDate.format("YYYY-MM-DD"),
      _endTime: endTime.format("HH:mm"),
      _localId: initialData?._localId,
    };

    try {
      await onSubmit(sessionData);
      onClose();
    } catch (e) {
      // Parent handles toast/error state. Keep dialog open so user can correct input.
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle className="font-extrabold">
        {initialData ? "Edit Session" : "Add Session"}
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={2.5}>
          <TextField
            fullWidth
            label="Session Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
            placeholder="e.g., Opening Keynote, Breakout Discussion"
          />

          <TextField
            fullWidth
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={2}
            placeholder="Session description or agenda"
          />

          <TextField
            fullWidth
            select
            label="Session Type *"
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value)}
          >
            {SESSION_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="body2" className="font-semibold">
                Start Date &amp; Time
              </Typography>
              <Typography variant="caption" sx={{ color: "#6b7280" }}>
                {timezone}
              </Typography>
            </Box>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <DatePicker
                  value={startDate}
                  onChange={(date) => {
                    const next = date || dayjs();
                    setStartDate(next);
                    if (endDate && endDate.isBefore(next, "day")) {
                      setEndDate(next);
                    }
                  }}
                  format="DD/MM/YYYY"
                  slotProps={{ textField: { size: "small", fullWidth: true, error: !!errors.startTime } }}
                />
                <TimePicker
                  value={startTime && startTime.isValid() ? startTime : null}
                  onChange={(time) => {
                    if (!time) return; // cleared — keep last valid
                    if (!time.isValid()) {
                      setErrors((prev) => ({ ...prev, startTime: "Invalid time (use 1–12 in AM/PM)." }));
                      return;
                    }
                    setErrors((prev) => ({ ...prev, startTime: "" }));
                    setStartTime(time);

                    // Auto-select end time automatic by 1 hour addition
                    if (startDate) {
                      const startDt = startDate.hour(time.hour()).minute(time.minute());
                      if (startDt.isValid()) {
                        const endDt = startDt.add(1, 'hour');
                        setEndDate(endDt);
                        setEndTime(endDt);

                        if (!endDt.isAfter(startDt)) {
                          setErrors((prev) => ({ ...prev, endTime: "End time must be after start time" }));
                        } else {
                          setErrors((prev) => ({ ...prev, endTime: "" }));
                        }
                      }
                    }
                  }}
                  ampm
                  slotProps={{ textField: { size: "small", fullWidth: true, error: !!errors.startTime } }}
                />
              </Stack>
              {errors.startTime && (
                <Typography variant="caption" color="error" display="block" mt={0.5}>
                  {errors.startTime}
                </Typography>
              )}
            </LocalizationProvider>
          </Box>

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="body2" className="font-semibold">
                End Date &amp; Time
              </Typography>
              <Typography variant="caption" sx={{ color: "#6b7280" }}>
                {timezone}
              </Typography>
            </Box>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <DatePicker
                  value={endDate}
                  onChange={(date) => {
                    const next = date || dayjs();
                    if (startDate && next.isBefore(startDate, "day")) {
                      setEndDate(startDate);
                    } else {
                      setEndDate(next);
                    }
                  }}
                  format="DD/MM/YYYY"
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
                <TimePicker
                  value={endTime && endTime.isValid() ? endTime : null}
                  onChange={(time) => {
                    if (!time) return; // cleared — keep last valid
                    if (!time.isValid()) {
                      setErrors((prev) => ({ ...prev, endTime: "Invalid time (use 1–12 in AM/PM)." }));
                      return;
                    }

                    const endDt = endDate.hour(time.hour()).minute(time.minute());
                    const startDt = startDate.hour(startTime.hour()).minute(startTime.minute());
                    if (!endDt.isAfter(startDt)) {
                      setErrors((prev) => ({ ...prev, endTime: "End time must be after start time" }));
                    } else {
                      setErrors((prev) => ({ ...prev, endTime: "" }));
                    }

                    setEndTime(time);
                  }}
                  ampm
                  slotProps={{ textField: { size: "small", fullWidth: true, error: !!errors.endTime } }}
                />
              </Stack>
              {errors.endTime && (
                <Typography variant="caption" color="error" display="block" mt={0.5}>
                  {errors.endTime}
                </Typography>
              )}
            </LocalizationProvider>
          </Box>

          {/* Timezone Conversion Display */}
          <Box
            sx={{
              p: 1.5,
              backgroundColor: "#f3f4f6",
              borderRadius: 1,
              border: "1px solid #e5e7eb"
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, color: "#6b7280", display: "block", mb: 0.5 }}>
              Event Timezone: {timezone}
            </Typography>
            {(() => {
              // Create ISO strings from current start/end times for display
              const start = startDate.hour(startTime.hour()).minute(startTime.minute());
              const end = endDate.hour(endTime.hour()).minute(endTime.minute());
              const startISO = toUTCISO(start, timezone);
              const endISO = toUTCISO(end, timezone);

              if (startISO && endISO) {
                const formatted = formatSessionTimeRange(startISO, endISO, timezone);
                return formatted.secondary ? (
                  <>
                    <Typography variant="caption" sx={{ color: "#9ca3af" }}>
                      {formatted.secondary.label}
                    </Typography>
                  </>
                ) : null;
              }
              return null;
            })()}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          sx={{ backgroundColor: "#10b8a6", "&:hover": { backgroundColor: "#0ea5a4" } }}
        >
          {initialData ? "Update" : "Add Session"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SessionDialog;
