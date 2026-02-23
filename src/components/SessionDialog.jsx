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
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

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
        const sd = dayjs(initialData.startTime);
        setStartDate(sd);
        setStartTime(sd);
      }
      if (initialData.endTime) {
        const ed = dayjs(initialData.endTime);
        setEndDate(ed);
        setEndTime(ed);
      }
    } else {
      // Default values for new session - use event start time
      let defaultStart = dayjs();

      if (eventStartTime) {
        defaultStart = dayjs(eventStartTime);
      } else {
        // Fallback: 9:00 AM today
        defaultStart = dayjs().hour(9).minute(0).second(0);
      }

      const defaultEnd = defaultStart.add(1, "hour");

      setStartDate(defaultStart);
      setStartTime(defaultStart);
      setEndDate(defaultEnd);
      setEndTime(defaultEnd);
    }
  }, [open, initialData, eventStartTime]);

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Session title is required";

    // Guard against invalid Dayjs values before combining date + time
    if (!startTime || !startTime.isValid()) {
      e.startTime = "Invalid time (use 1–12 in AM/PM).";
    }
    if (!endTime || !endTime.isValid()) {
      e.endTime = "Invalid time (use 1–12 in AM/PM).";
    }

    if (!e.startTime && !e.endTime) {
      const start = startDate.hour(startTime.hour()).minute(startTime.minute());
      const end = endDate.hour(endTime.hour()).minute(endTime.minute());

      // Validate session end is after start
      if (!end.isAfter(start)) {
        e.endTime = "End time must be after start time";
      }

      // Validate session times are within event times
      if (eventStartTime && eventEndTime) {
        const eventStart = dayjs(eventStartTime);
        const eventEnd = dayjs(eventEndTime);

        if (start.isBefore(eventStart)) {
          e.startTime = `Session cannot start before event (${eventStart.format("MMM DD, HH:mm")})`;
        }

        let cutoffTime = eventEnd;
        // If event ends at midnight (00:00), treat it as inclusive of that day
        if (eventEnd.hour() === 0 && eventEnd.minute() === 0) {
          cutoffTime = eventEnd.add(1, "day");
        }

        if (end.isAfter(cutoffTime)) {
          e.endTime = `Session cannot end after event (${eventEnd.format("MMM DD, HH:mm")})`;
        }

        const eventStartDate = eventStart.startOf("day");
        const eventEndDate = eventEnd.startOf("day");
        const sessionStartDate = start.startOf("day");
        const sessionEndDate = end.startOf("day");

        if (
          sessionStartDate.isBefore(eventStartDate) ||
          sessionEndDate.isAfter(eventEndDate)
        ) {
          e.startTime = `Session dates must be within event dates (${eventStart.format(
            "MMM DD"
          )} - ${eventEnd.format("MMM DD")})`;
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
            <Typography variant="body2" className="font-semibold mb-2">
              Start Date &amp; Time
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <DatePicker
                  value={startDate}
                  onChange={(date) => setStartDate(date || dayjs())}
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
            <Typography variant="body2" className="font-semibold mb-2">
              End Date &amp; Time
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <DatePicker
                  value={endDate}
                  onChange={(date) => setEndDate(date || dayjs())}
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
