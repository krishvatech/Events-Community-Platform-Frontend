// src/components/ReportProfileDialog.jsx
import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Typography,
  Stack,
  Alert,
  Collapse,
  Divider,
  Checkbox,
  Box,
} from "@mui/material";

// ... (existing code)

const PROFILE_REPORT_REASONS = [
  {
    value: "profile_inappropriate",
    label: "Inappropriate Profile Content",
    description: "Profile contains inappropriate images, bio, or information",
    requiresMetadata: false,
  },
  {
    value: "profile_deceased",
    label: "Person is Deceased",
    description: "This person has passed away and their profile should be memorialized",
    requiresMetadata: true,
    metadataFields: ["relationship", "deathDate", "obituaryUrl"],
  },
  {
    value: "profile_impersonation",
    label: "Impersonation",
    description: "This profile is impersonating someone else",
    requiresMetadata: true,
    metadataFields: ["impersonatedName", "proofUrls"],
  },
  {
    value: "profile_fake",
    label: "Not a Real Person",
    description: "This profile appears to be fake or a bot",
    requiresMetadata: false,
  },
  {
    value: "profile_correction",
    label: "Profile Needs Correction",
    description: "Information on this profile is incorrect and needs updating",
    requiresMetadata: true,
    metadataFields: ["correctionFields", "correctionReason"],
  },
  {
    value: "profile_illegal",
    label: "Illegal Content",
    description: "Profile contains illegal content or activities",
    requiresMetadata: true,
    metadataFields: ["illegalDescription", "illegalLocation"],
  },
];

export default function ReportProfileDialog({
  open,
  onClose,
  onSubmit,
  loading,
  targetUser,
}) {
  const [reason, setReason] = React.useState("profile_inappropriate");
  const [notes, setNotes] = React.useState("");

  // Deceased-specific fields
  const [relationship, setRelationship] = React.useState("");
  const [deathDate, setDeathDate] = React.useState("");
  const [obituaryUrl, setObituaryUrl] = React.useState("");

  // Impersonation-specific fields
  const [impersonatedName, setImpersonatedName] = React.useState("");
  const [proofUrls, setProofUrls] = React.useState("");

  // Correction-specific fields
  const [correctionFields, setCorrectionFields] = React.useState({}); // Object, made user-friendly
  const [correctionReason, setCorrectionReason] = React.useState("");

  // Illegal content fields
  const [illegalDescription, setIllegalDescription] = React.useState("");
  const [illegalLocation, setIllegalLocation] = React.useState("");

  React.useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setReason("profile_inappropriate");
      setNotes("");
      setRelationship("");
      setDeathDate("");
      setObituaryUrl("");
      setImpersonatedName("");
      setProofUrls("");
      setCorrectionFields({});
      setCorrectionReason("");
      setIllegalDescription("");
      setIllegalLocation("");
    }
  }, [open]);

  const selectedReason = PROFILE_REPORT_REASONS.find((r) => r.value === reason);

  const handleSubmit = () => {
    const payload = {
      target_user_id: targetUser?.id,
      reason,
      notes,
    };

    // Add metadata based on reason
    if (reason === "profile_deceased") {
      payload.metadata = {
        relationship_to_deceased: relationship,
        death_date: deathDate || null,
        obituary_url: obituaryUrl,
      };
    } else if (reason === "profile_impersonation") {
      payload.metadata = {
        impersonated_person_name: impersonatedName,
        proof_urls: proofUrls
          .split("\n")
          .map((url) => url.trim())
          .filter(Boolean),
      };
    } else if (reason === "profile_correction") {
      payload.metadata = {
        correction_fields: correctionFields, // Already an object
        correction_reason: correctionReason,
      };
    } else if (reason === "profile_illegal") {
      payload.metadata = {
        illegal_content_description: illegalDescription,
        illegal_content_location: illegalLocation,
      };
    }

    onSubmit?.(payload);
  };

  const canSubmit = () => {
    if (!notes.trim()) return false;

    if (reason === "profile_deceased" && !relationship.trim()) {
      return false;
    }

    if (reason === "profile_impersonation" && !impersonatedName.trim()) {
      return false;
    }

    if (reason === "profile_correction" && Object.keys(correctionFields).length === 0) {
      return false;
    }

    if (reason === "profile_illegal" && !illegalDescription.trim()) {
      return false;
    }

    return true;
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Report Profile</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {targetUser && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You are reporting: <strong>{targetUser.full_name || targetUser.username}</strong>
            </Alert>
          )}

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Why are you reporting this profile?
          </Typography>

          <RadioGroup value={reason} onChange={(e) => setReason(e.target.value)}>
            {PROFILE_REPORT_REASONS.map((r) => (
              <FormControlLabel
                key={r.value}
                value={r.value}
                control={<Radio />}
                label={
                  <Stack spacing={0.25}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {r.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.description}
                    </Typography>
                  </Stack>
                }
              />
            ))}
          </RadioGroup>

          <Divider />

          {/* Deceased-specific fields */}
          <Collapse in={reason === "profile_deceased"}>
            <Stack spacing={2}>
              <Alert severity="info">
                If you believe this person has passed away, please provide details to help
                us verify and memorialize their profile appropriately.
              </Alert>

              <TextField
                label="Your relationship to the deceased"
                fullWidth
                required
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g., Family member, Friend, Colleague"
                helperText="Required"
              />

              <TextField
                label="Date of death (if known)"
                type="date"
                fullWidth
                value={deathDate}
                onChange={(e) => setDeathDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="Link to obituary or death notice"
                fullWidth
                value={obituaryUrl}
                onChange={(e) => setObituaryUrl(e.target.value)}
                placeholder="https://..."
                helperText="Optional but helpful for verification"
              />
            </Stack>
          </Collapse>

          {/* Impersonation-specific fields */}
          <Collapse in={reason === "profile_impersonation"}>
            <Stack spacing={2}>
              <Alert severity="warning">
                Impersonation is a serious violation. Please provide evidence to support
                your claim.
              </Alert>

              <TextField
                label="Name of person being impersonated"
                fullWidth
                required
                value={impersonatedName}
                onChange={(e) => setImpersonatedName(e.target.value)}
                placeholder="Real person's name"
                helperText="Required"
              />

              <TextField
                label="Links to proof (one per line)"
                fullWidth
                multiline
                minRows={3}
                value={proofUrls}
                onChange={(e) => setProofUrls(e.target.value)}
                placeholder="https://example.com/proof1&#10;https://example.com/proof2"
                helperText="Social media profiles, websites, etc. showing the real person"
              />
            </Stack>
          </Collapse>

          {/* Correction-specific fields */}
          <Collapse in={reason === "profile_correction"}>
            <Stack spacing={2}>
              <Alert severity="info">
                Please specify which fields need correction and the correct values.
              </Alert>

              {/* Standard Fields Selection */}
              <Stack spacing={1}>
                <Typography variant="body2" fontWeight={600}>Select fields to correct:</Typography>
                {["Full Name", "Job Title", "Company", "Location", "Bio"].map((field) => {
                  const key = field.toLowerCase().replace(" ", "_"); // full_name, job_title...
                  const isSelected = correctionFields[key] !== undefined;

                  return (
                    <div key={key}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => {
                              const newFields = { ...correctionFields };
                              if (e.target.checked) {
                                newFields[key] = ""; // Init empty
                              } else {
                                delete newFields[key];
                              }
                              setCorrectionFields(newFields);
                            }}
                          />
                        }
                        label={field}
                      />
                      {isSelected && (
                        <Box sx={{ ml: 4, mt: 1 }}>
                          <TextField
                            size="small"
                            fullWidth
                            placeholder={`Correct ${field}`}
                            value={correctionFields[key]}
                            onChange={(e) => {
                              setCorrectionFields({
                                ...correctionFields,
                                [key]: e.target.value
                              });
                            }}
                          />
                        </Box>
                      )}
                    </div>
                  );
                })}
              </Stack>

              <TextField
                label="Reason for corrections"
                fullWidth
                multiline
                minRows={2}
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Explain why these corrections are needed"
              />
            </Stack>
          </Collapse>

          {/* Illegal content fields */}
          <Collapse in={reason === "profile_illegal"}>
            <Stack spacing={2}>
              <Alert severity="error">
                <strong>Important:</strong> Reports of illegal content are taken very
                seriously and may be forwarded to law enforcement.
              </Alert>

              <TextField
                label="Description of illegal content"
                fullWidth
                multiline
                minRows={3}
                required
                value={illegalDescription}
                onChange={(e) => setIllegalDescription(e.target.value)}
                placeholder="Describe the illegal content or activity"
                helperText="Required - Please be specific"
              />

              <TextField
                label="Location on profile"
                fullWidth
                value={illegalLocation}
                onChange={(e) => setIllegalLocation(e.target.value)}
                placeholder="e.g., Profile bio, About section, Cover photo"
                helperText="Where on the profile is this content located?"
              />
            </Stack>
          </Collapse>

          <Divider />

          {/* General notes field */}
          <TextField
            label="Additional details"
            fullWidth
            multiline
            minRows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Share any context that can help our moderators review this profile."
            helperText="Required"
            required
          />

          <Typography variant="caption" color="text.secondary">
            Reports are anonymous. Our moderation team will review this profile and take
            appropriate action. False reports may result in account restrictions.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleSubmit}
          disabled={loading || !canSubmit()}
        >
          {loading ? "Submitting..." : "Submit Report"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
