import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  Snackbar,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const BASE = API_BASE.replace(/\/+$/, "");
const API_ROOT = BASE.endsWith("/api") ? BASE : `${BASE}/api`;

const getToken = () =>
  localStorage.getItem("access_token") ||
  localStorage.getItem("access") ||
  localStorage.getItem("access_token") ||
  "";

const addContentToExistingHtml = (existingHtml, { _meeting_info, _closing }) => {
  if (!existingHtml) return existingHtml;

  let html = existingHtml;

  // Remove duplicate footers - keep only the last one
  const footerPatterns = [
    /<[^>]*>IMAA Connect[^<]*<\/[^>]*>/gi,
    /<[^>]*>©\s*\d+[^<]*All rights reserved[^<]*<\/[^>]*>/gi,
    /IMAA Connect/gi,
    /©\s*\d+\s*\|\s*All rights reserved/gi,
    /All rights reserved/gi,
  ];

  // Collect all footer pieces
  let hasFooterContent = false;
  for (const pattern of footerPatterns) {
    if (pattern.test(html)) {
      hasFooterContent = true;
      break;
    }
  }

  if (hasFooterContent) {
    // Remove all footer variations
    let cleanHtml = html;
    for (const pattern of footerPatterns) {
      cleanHtml = cleanHtml.replace(pattern, "");
    }

    // Remove extra whitespace left behind
    cleanHtml = cleanHtml.replace(/(<[^>]*>[\s\n]*)+<\/body>/i, "\n</body>");

    // Add back single footer before closing body
    const footer = '<p style="font-size: 12px; color: #666; margin-top: 20px;">IMAA Connect © 2026 | All rights reserved</p>';
    if (cleanHtml.includes("</body>")) {
      html = cleanHtml.replace("</body>", footer + "\n</body>");
    } else {
      html = cleanHtml;
    }
  }

  // Add meeting info (Zoom link) AFTER event details section
  if (_meeting_info && _meeting_info.trim()) {
    // Check if meeting info already exists in HTML to prevent duplicates
    const sanitizedMeetingInfo = (_meeting_info || "").substring(0, 50); // Check first 50 chars
    if (!html.includes(sanitizedMeetingInfo)) {
      // Convert URLs to clickable links
      const urlRegex = /(https?:\/\/[^\s<>"]+)/g;
      const meetingInfoWithLinks = (_meeting_info || "").replace(urlRegex, '<a href="$1" style="color: #007bff; text-decoration: underline;">$1</a>');

      const meetingInfoHtml = `<div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; border-radius: 4px;">
        <p style="font-size: 14px; margin: 0;">${meetingInfoWithLinks.replace(/\n/g, "<br>")}</p>
      </div>`;

      // Look for event details section - find "Ready to go" and insert before it
      if (html.includes("Ready to go")) {
        // Insert right before "Ready to go" section
        const readyToGoIndex = html.indexOf("Ready to go");
        // Find the opening tag of the Ready to go section
        let tagStart = readyToGoIndex;
        while (tagStart > 0 && html[tagStart] !== '<') {
          tagStart--;
        }
        html = html.slice(0, tagStart) + meetingInfoHtml + html.slice(tagStart);
      } else if (html.includes("</body>")) {
        // Fallback: insert before closing body tag
        html = html.replace("</body>", meetingInfoHtml + "</body>");
      }
    }
  }

  // Add closing message at the end (before body close)
  if (_closing && _closing.trim()) {
    const closingHtml = `<p style="font-size: 13px; margin-top: 30px; color: #666;">${(_closing || "").replace(/\n/g, "<br>")}</p>`;

    // Simply insert before the closing body tag
    if (html.includes("</body>")) {
      html = html.replace("</body>", closingHtml + "\n</body>");
    } else if (html.includes("</div>")) {
      // Fallback: insert before last closing div
      html = html.replace(/<\/div>(?!.*<\/div>)/s, closingHtml + "\n</div>");
    }
  }

  return html;
};

const parseHtmlToSimpleText = (htmlBody) => {
  if (!htmlBody) return {};

  const doc = new DOMParser().parseFromString(htmlBody, "text/html");
  const paragraphs = doc.querySelectorAll("p");
  const divs = doc.querySelectorAll("div[style*='background-color']");

  let greeting = "";
  let mainMessage = "";
  let meetingInfo = "";
  let eventDetails = "";
  let closing = "";

  // Try to identify sections based on styling or position
  let pIndex = 0;
  for (const p of paragraphs) {
    const text = p.textContent.trim();
    if (!text) continue;

    if (pIndex === 0) {
      greeting = text;
    } else if (pIndex === 1) {
      mainMessage = text;
    } else {
      closing = text;
    }
    pIndex++;
  }

  // Look for styled divs
  for (const div of divs) {
    const style = div.getAttribute("style");
    const text = div.textContent.trim();

    if (style && style.includes("#f5f5f5")) {
      meetingInfo = text;
    } else if (style && style.includes("#f9f9f9")) {
      eventDetails = text;
    }
  }

  return {
    _greeting: greeting,
    _main_message: mainMessage,
    _meeting_info: meetingInfo,
    _event_details: eventDetails,
    _closing: closing,
  };
};

const TEMPLATE_TYPES = {
  user_registration_acknowledgement: "Registered User Confirmation",
  guest_registration_acknowledgement: "Guest Confirmation",
  event_confirmation: "Speaker/Host Confirmation",
};

const DEFAULT_SUBJECTS = {
  user_registration_acknowledgement: "Registration Confirmed – {{ event_title }}",
  guest_registration_acknowledgement: "Your Guest Registration – {{ event_title }}",
  event_confirmation: "You're Confirmed as Speaker/Host – {{ event_title }}",
};

const AVAILABLE_VARIABLES = [
  "{{ first_name }}",
  "{{ guest_name }}",
  "{{ email }}",
  "{{ event_title }}",
  "{{ event_date_str }}",
  "{{ event_start_str }}",
  "{{ event_end_str }}",
  "{{ event_date_range_str }}",
  "{{ event_timezone }}",
  "{{ event_url }}",
  "{{ support_email }}",
];

export default function EventConfirmationEmailManager({ event, eventId }) {
  const actualEventId = event?.id || eventId;
  const [selectedTemplate, setSelectedTemplate] = useState("user_registration_acknowledgement");
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: "", severity: "success" });

  const loadTemplate = async () => {
    if (!actualEventId) return;
    setLoading(true);
    try {
      const url = `${API_ROOT}/events/${actualEventId}/email-templates/${selectedTemplate}/`;
      console.log("Loading template from:", url);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      console.log("Response status:", response.status);
      if (response.ok) {
        const data = await response.json();

        // Try to parse existing HTML content back into simple fields
        const parsedFields = parseHtmlToSimpleText(data.html_body);

        // Use default subject if not set or if it's just the template key
        const subject = data.subject && !data.subject.includes("[")
          ? data.subject
          : DEFAULT_SUBJECTS[selectedTemplate] || "";

        // Clear closing message if it contains footer text
        let closing = data._closing || parsedFields._closing || "";
        if (closing && (closing.includes("IMAA Connect") || closing.includes("All rights reserved"))) {
          closing = "";
        }

        // Auto-save if subject was corrected
        const needsAutoSave = data.subject && data.subject.includes("[") && subject;
        if (needsAutoSave) {
          // Auto-correct the subject in the database
          fetch(
            `${API_ROOT}/events/${actualEventId}/email-templates/${selectedTemplate}/`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getToken()}`,
              },
              body: JSON.stringify({
                subject: subject,
                html_body: data.html_body,
                text_body: data.text_body || "",
                is_active: data.is_active,
              }),
            }
          ).catch(() => {}); // Silent auto-save
        }

        setTemplate({
          ...data,
          subject,
          _greeting: data._greeting || parsedFields._greeting || "",
          _main_message: data._main_message || parsedFields._main_message || "",
          _meeting_info: data._meeting_info || parsedFields._meeting_info || "",
          _event_details: data._event_details || parsedFields._event_details || "",
          _closing: closing,
        });
      } else {
        const errorText = await response.text();
        console.error("Error response:", response.status, errorText);
        showNotification(`Failed to load template: ${response.status}`, "error");
      }
    } catch (error) {
      console.error("Error loading template:", error);
      showNotification("Error loading template", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!actualEventId || !template) return;
    setSaving(true);
    try {
      // Preserve existing HTML and add new content
      const htmlBody = addContentToExistingHtml(template.html_body, {
        _meeting_info: template._meeting_info,
        _closing: template._closing,
      });

      // Use default subject if current subject contains brackets (template key)
      const finalSubject = (template.subject && !template.subject.includes("["))
        ? template.subject
        : DEFAULT_SUBJECTS[selectedTemplate] || "";

      const response = await fetch(
        `${API_ROOT}/events/${actualEventId}/email-templates/${selectedTemplate}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            subject: finalSubject,
            html_body: htmlBody,
            text_body: template.text_body || "",
            is_active: template.is_active,
          }),
        }
      );
      if (response.ok) {
        showNotification("Template saved successfully", "success");
        loadTemplate();
      } else {
        const error = await response.json();
        showNotification(`Failed to save: ${error.detail || "Unknown error"}`, "error");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      showNotification("Error saving template", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!actualEventId) return;
    setSaving(true);
    try {
      const response = await fetch(
        `${API_ROOT}/events/${actualEventId}/email-templates/${selectedTemplate}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      if (response.ok || response.status === 204) {
        showNotification("Template reset to default", "success");
        setResetConfirmOpen(false);
        loadTemplate();
      } else {
        showNotification("Failed to reset template", "error");
      }
    } catch (error) {
      console.error("Error resetting template:", error);
      showNotification("Error resetting template", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!actualEventId || !template) return;
    setPreviewLoading(true);
    try {
      // Preserve existing HTML and add new content for preview
      const htmlBody = addContentToExistingHtml(template.html_body, {
        _meeting_info: template._meeting_info,
        _closing: template._closing,
      });

      // Use default subject if current subject contains brackets (template key)
      const finalSubject = (template.subject && !template.subject.includes("["))
        ? template.subject
        : DEFAULT_SUBJECTS[selectedTemplate] || "";

      const response = await fetch(
        `${API_ROOT}/events/${actualEventId}/email-templates/${selectedTemplate}/preview/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            subject: finalSubject,
            html_body: htmlBody,
            text_body: template.text_body || "",
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        // Override subject with the one we calculated to ensure it shows correctly
        setPreviewData({
          ...data,
          subject: finalSubject,
        });
        setPreviewOpen(true);
      } else {
        showNotification("Failed to preview template", "error");
      }
    } catch (error) {
      console.error("Error previewing template:", error);
      showNotification("Error previewing template", "error");
    } finally {
      setPreviewLoading(false);
    }
  };

  const showNotification = (message, severity = "success") => {
    setNotification({ open: true, message, severity });
  };

  useEffect(() => {
    loadTemplate();
  }, [selectedTemplate, actualEventId]);

  if (!actualEventId) {
    return (
      <Alert severity="error">Event ID not found. Cannot manage email templates.</Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Template Type Selector */}
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Email Template Type
              </Typography>
              <FormControl fullWidth sx={{ maxWidth: 400 }}>
                <InputLabel>Select Template</InputLabel>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  label="Select Template"
                >
                  {Object.entries(TEMPLATE_TYPES).map(([key, label]) => (
                    <MenuItem key={key} value={key}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {template?.source === "global_default" && (
                <Alert severity="info">
                  Currently using default email template. Make changes below to create a custom template for this event.
                </Alert>
              )}
              {template?.source === "event_specific" && (
                <Alert severity="success">
                  This event has a custom email template.
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Template Editor */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : template ? (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Email Subject & Additional Content
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Edit the subject and add optional content (Zoom link, closing message). The original template design is preserved.
                </Typography>

                <TextField
                  label="Email Subject"
                  value={template.subject || DEFAULT_SUBJECTS[selectedTemplate] || ""}
                  onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder={DEFAULT_SUBJECTS[selectedTemplate] || ""}
                  helperText="This appears in the recipient's inbox. Use {{ event_title }} to include the event name."
                />

                <Box sx={{ my: 2, p: 2, bgcolor: "#f0f0f0", borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Original Template (Preserved)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    The existing professional email template will remain unchanged. You can add optional content below.
                  </Typography>
                </Box>

                <Box>
                  <TextField
                    label="Zoom Link or Meeting Details (Optional)"
                    value={template._meeting_info || ""}
                    onChange={(e) => setTemplate({ ...template, _meeting_info: e.target.value })}
                    fullWidth
                    multiline
                    rows={3}
                    variant="outlined"
                    size="small"
                    placeholder="e.g., Zoom Link: https://us06web.zoom.us/j/87417021396?pwd=..."
                    helperText="This will be added to the email with a highlighted box"
                  />
                  {template._meeting_info && (
                    <Button
                      size="small"
                      onClick={() => setTemplate({ ...template, _meeting_info: "" })}
                      sx={{ mt: 1 }}
                    >
                      Clear
                    </Button>
                  )}
                </Box>

                <Box>
                  <TextField
                    label="Closing Message (Optional)"
                    value={template._closing || ""}
                    onChange={(e) => setTemplate({ ...template, _closing: e.target.value })}
                    fullWidth
                    multiline
                    rows={2}
                    variant="outlined"
                    size="small"
                    placeholder="e.g., If you have any questions, please contact us at {{ support_email }}"
                    helperText="Custom message before footer. Don't include footer text here - it's added automatically."
                  />
                  {template._closing && (
                    <Button
                      size="small"
                      onClick={() => setTemplate({ ...template, _closing: "" })}
                      sx={{ mt: 1 }}
                    >
                      Clear
                    </Button>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        {/* Available Variables */}
        {template && (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Available Variables
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Use these variables in your template:
                </Typography>
                <Grid container spacing={1}>
                  {AVAILABLE_VARIABLES.map((variable) => (
                    <Grid item xs={12} sm={6} md={4} key={variable}>
                      <Box
                        sx={{
                          bgcolor: "grey.100",
                          p: 1,
                          borderRadius: 1,
                          fontFamily: "monospace",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          "&:hover": { bgcolor: "grey.200" },
                        }}
                        onClick={() => {
                          // Copy to clipboard
                          navigator.clipboard.writeText(variable);
                          showNotification("Copied to clipboard", "success");
                        }}
                      >
                        {variable}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {template && (
          <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              onClick={() => loadTemplate()}
              disabled={loading}
              startIcon={<RefreshRoundedIcon />}
            >
              Reload
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setResetConfirmOpen(true)}
              disabled={saving || template?.source === "global_default"}
            >
              Reset to Default
            </Button>
            <Button
              variant="outlined"
              onClick={handlePreview}
              disabled={previewLoading || saving}
            >
              {previewLoading ? "Previewing..." : "Preview"}
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle>Email Preview</DialogTitle>
        <DialogContent>
          {previewData && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Subject:
                </Typography>
                <Box
                  sx={{
                    bgcolor: "grey.100",
                    p: 2,
                    borderRadius: 1,
                    fontFamily: "monospace",
                    fontSize: "0.9rem",
                    wordBreak: "break-word",
                  }}
                >
                  {previewData.subject}
                </Box>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  HTML Preview:
                </Typography>
                <Box
                  sx={{
                    border: "1px solid #ddd",
                    borderRadius: 1,
                    p: 2,
                    minHeight: 200,
                    bgcolor: "#fff",
                  }}
                >
                  <iframe
                    srcDoc={previewData.html_body}
                    style={{
                      width: "100%",
                      height: "300px",
                      border: "none",
                      borderRadius: "4px",
                    }}
                    title="HTML Preview"
                  />
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
      >
        <DialogTitle>Reset to Default Template?</DialogTitle>
        <DialogContent>
          <Typography>
            This will remove the custom template for this event and revert to the default template.
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={handleReset}
            color="error"
            variant="contained"
            disabled={saving}
          >
            {saving ? "Resetting..." : "Reset"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
