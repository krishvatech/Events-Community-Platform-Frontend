import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Autocomplete,
  Box,
  Stack,
  Avatar,
  Typography,
  CircularProgress,
  Alert,
  MenuItem,
} from "@mui/material";
import { toast } from "react-toastify";
import InsertPhotoRoundedIcon from "@mui/icons-material/InsertPhotoRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import { listAdminUsers } from "../utils/api";

const ParticipantForm = ({
  open,
  onClose,
  onSubmit,
  initialData,
  existingParticipants = [],
}) => {
  // Form state
  const [participantType, setParticipantType] = useState("staff");
  const [role, setRole] = useState("speaker");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [userOptions, setUserOptions] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [bio, setBio] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // UI state
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  // Initialize form when dialog opens or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        // Editing mode
        setParticipantType(initialData.participantType || "staff");
        setRole(initialData.role || "speaker");
        setBio(initialData.bio || "");
        setImagePreview(initialData.imageUrl || "");

        if (initialData.participantType === "staff") {
          setSelectedUser({
            id: initialData.userId,
            first_name: initialData.firstName || "",
            last_name: initialData.lastName || "",
            email: initialData.email || "",
          });
          setUserSearch("");
        } else {
          setGuestName(initialData.guestName || "");
          setGuestEmail(initialData.guestEmail || "");
        }

        // Find index for duplicate checking
        const idx = existingParticipants.findIndex(
          (p) => p === initialData
        );
        setEditingIndex(idx);
      } else {
        // Creating mode
        resetForm();
        setEditingIndex(null);
      }
    }
  }, [open, initialData, existingParticipants]);

  // Debounced user search
  useEffect(() => {
    if (!userSearch.trim() || participantType !== "staff") {
      setUserOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const data = await listAdminUsers({
          search: userSearch,
          is_staff: true,
        });
        setUserOptions(data.results || data || []);
      } catch (error) {
        console.error("Failed to fetch staff users:", error);
        toast.error("Failed to load staff users");
      } finally {
        setLoadingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearch, participantType]);

  const resetForm = () => {
    setParticipantType("staff");
    setRole("speaker");
    setSelectedUser(null);
    setUserSearch("");
    setUserOptions([]);
    setGuestName("");
    setGuestEmail("");
    setBio("");
    setImageFile(null);
    setImagePreview("");
    setErrors({});
  };

  const validate = () => {
    const newErrors = {};

    if (participantType === "staff") {
      if (!selectedUser?.id) {
        newErrors.user = "Please select a staff member";
      }
    } else {
      if (!guestName.trim()) {
        newErrors.name = "Name is required";
      }
      if (!guestEmail.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
        newErrors.email = "Invalid email format";
      }
    }

    // Check for duplicates
    const isDuplicate = existingParticipants.some((p, idx) => {
      if (editingIndex !== null && idx === editingIndex) return false;

      if (participantType === "staff" && p.participantType === "staff") {
        return p.userId === selectedUser?.id && p.role === role;
      } else if (participantType === "guest" && p.participantType === "guest") {
        return p.guestEmail === guestEmail && p.role === role;
      }
      return false;
    });

    if (isDuplicate) {
      newErrors.duplicate =
        "This participant with the same role already exists";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const participantData = {
        participantType,
        role,
        bio: bio.trim(),
      };

      if (participantType === "staff") {
        participantData.userId = selectedUser.id;
        participantData.firstName = selectedUser.first_name || "";
        participantData.lastName = selectedUser.last_name || "";
        participantData.email = selectedUser.email || "";
        participantData.imageUrl =
          selectedUser.avatar_url ||
          selectedUser?.profile?.user_image_url ||
          selectedUser?.profile?.avatar_url ||
          selectedUser?.profile?.image_url ||
          "";
      } else {
        participantData.guestName = guestName.trim();
        participantData.guestEmail = guestEmail.trim();
      }

      if (imageFile) {
        participantData.imageFile = imageFile;
        participantData.imageUrl = imagePreview || "";
      } else if (imagePreview && imagePreview.startsWith("blob:")) {
        // Keep existing preview if not changed
        participantData.imageUrl = imagePreview;
      } else if (imagePreview) {
        participantData.imageUrl = imagePreview;
      }

      // Call parent's onSubmit
      await onSubmit(participantData);
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error submitting participant:", error);
      toast.error(error.message || "Failed to save participant");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(String(ev.target?.result || ""));
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {editingIndex !== null ? "Edit Participant" : "Add Participant"}
      </DialogTitle>

      <DialogContent sx={{ pt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Error Alert */}
        {errors.duplicate && (
          <Alert severity="warning">{errors.duplicate}</Alert>
        )}

        {/* Participant Type Selection */}
        <FormControl component="fieldset">
          <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500 }}>
            Participant Type
          </FormLabel>
          <RadioGroup
            row
            value={participantType}
            onChange={(e) => {
              setParticipantType(e.target.value);
              setSelectedUser(null);
              setUserSearch("");
              setGuestName("");
              setGuestEmail("");
              setImageFile(null);
              setImagePreview("");
              setErrors((prev) => ({ ...prev, user: "", name: "", email: "" }));
            }}
          >
            <FormControlLabel
              value="staff"
              control={<Radio />}
              label="Staff Member"
            />
            <FormControlLabel value="guest" control={<Radio />} label="Guest" />
          </RadioGroup>
        </FormControl>

        {/* Role Selection */}
        <TextField
          select
          label="Role *"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          fullWidth
        >
          <MenuItem value="speaker">Speaker</MenuItem>
          <MenuItem value="moderator">Moderator</MenuItem>
          <MenuItem value="host">Host</MenuItem>
        </TextField>

        {/* Conditional: Staff User Selection */}
        {participantType === "staff" && (
          <Autocomplete
            freeSolo={false}
            options={userOptions}
            loading={loadingUsers}
            value={selectedUser}
            getOptionLabel={(option) => {
              if (typeof option === "string") return option;
              return `${option.first_name || ""} ${option.last_name || ""} (${option.email || ""})`.trim();
            }}
            filterOptions={(x) => x} // Disable client-side filtering
            inputValue={userSearch}
            onInputChange={(event, newInputValue) => {
              setUserSearch(newInputValue);
              if (!newInputValue) setSelectedUser(null);
            }}
            onChange={(event, newValue) => {
              setSelectedUser(newValue && typeof newValue === "object" ? newValue : null);
              if (newValue && typeof newValue === "object") {
                setErrors((prev) => ({ ...prev, user: "" }));
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Staff Member *"
                placeholder="Search by name or email"
                error={!!errors.user}
                helperText={errors.user}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingUsers ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        )}

        {/* Conditional: Guest Name & Email */}
        {participantType === "guest" && (
          <>
            <TextField
              label="Name *"
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                setErrors((prev) => ({ ...prev, name: "" }));
              }}
              fullWidth
              error={!!errors.name}
              helperText={errors.name}
              placeholder="Guest's full name"
            />

            <TextField
              label="Email *"
              type="email"
              value={guestEmail}
              onChange={(e) => {
                setGuestEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: "" }));
              }}
              fullWidth
              error={!!errors.email}
              helperText={errors.email || "A temporary password will be sent to this email"}
              placeholder="guest@example.com"
            />
          </>
        )}

        {/* Bio */}
        <TextField
          label="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          fullWidth
          multiline
          rows={3}
          placeholder="Add a short bio or description"
        />

        {/* Image Upload (Guest only) */}
        {participantType === "guest" && (
          <Box>
            <Typography variant="subtitle2" className="font-semibold mb-2">
              Profile Image
            </Typography>
            <Stack spacing={2}>
              {/* Preview */}
              <Box
                className="rounded-lg border border-slate-300 bg-slate-100/70 flex items-center justify-center"
                sx={{ height: 120, position: "relative", overflow: "hidden" }}
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="profile preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Stack alignItems="center" spacing={0.5}>
                    <ImageRoundedIcon sx={{ fontSize: 32, color: "text.secondary" }} />
                    <Typography variant="caption" className="text-slate-500">
                      No image selected
                    </Typography>
                  </Stack>
                )}
              </Box>

              {/* Upload Button */}
              <input
                id="participant-image-file"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageChange}
              />
              <label htmlFor="participant-image-file" style={{ width: "100%" }}>
                <Button
                  component="span"
                  variant="outlined"
                  startIcon={<InsertPhotoRoundedIcon />}
                  fullWidth
                >
                  {imageFile ? "Change Image" : "Upload Image"}
                </Button>
              </label>

              {imageFile && (
                <Typography variant="caption" color="success.main">
                  ✓ Image selected: {imageFile.name}
                </Typography>
              )}
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
        >
          {submitting ? "Saving..." : editingIndex !== null ? "Update" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ParticipantForm;
