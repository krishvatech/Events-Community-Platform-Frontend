# ParticipantForm.jsx - Virtual Speaker Update Quick Guide

## What to Update

The `ParticipantForm.jsx` file needs to be updated to support virtual speakers as a participant type. This guide provides the exact changes needed.

## File Location
`Events-Community-Platform-Frontend/src/components/ParticipantForm.jsx`

## Changes Summary

### 1. Add Import (Top of file)
```javascript
import { listVirtualSpeakers } from "../services/virtualSpeakerService";
```

### 2. Add New State Variables (after line 46)
```javascript
const [selectedVirtualSpeaker, setSelectedVirtualSpeaker] = useState(null);
const [virtualSpeakerSearch, setVirtualSpeakerSearch] = useState("");
const [virtualSpeakerOptions, setVirtualSpeakerOptions] = useState([]);
const [loadingVirtualSpeakers, setLoadingVirtualSpeakers] = useState(false);
```

### 3. Add Virtual Speaker Check (after line 52)
```javascript
const isVirtualSpeaker = participantType === "virtual";
```

### 4. Add to useEffect (in the else block after line 81)
```javascript
} else if (initialData.participantType === "virtual") {
  setSelectedVirtualSpeaker({
    id: initialData.virtualSpeakerId,
    name: initialData.name,
  });
  setVirtualSpeakerSearch("");
}
```

### 5. Add New useEffect (after line 124)
```javascript
// Load virtual speakers on component mount
useEffect(() => {
  if (!isVirtualSpeaker) {
    setVirtualSpeakerOptions([]);
    return;
  }

  if (!virtualSpeakerSearch.trim() && virtualSpeakerOptions.length === 0) {
    // Load initial list
    const loadInitialSpeakers = async () => {
      setLoadingVirtualSpeakers(true);
      try {
        const response = await listVirtualSpeakers(1); // Use community ID from context/props
        const speakers = Array.isArray(response) ? response : response.results || [];
        setVirtualSpeakerOptions(speakers);
      } catch (error) {
        console.error("Failed to load virtual speakers:", error);
      } finally {
        setLoadingVirtualSpeakers(false);
      }
    };
    loadInitialSpeakers();
  } else if (virtualSpeakerSearch.trim()) {
    // Filter existing speakers
    const filtered = virtualSpeakerOptions.filter((s) =>
      s.name.toLowerCase().includes(virtualSpeakerSearch.toLowerCase())
    );
    setVirtualSpeakerOptions(filtered);
  }
}, [isVirtualSpeaker, virtualSpeakerSearch]);
```

### 6. Update resetForm() (line 126-138)
Add these lines:
```javascript
setSelectedVirtualSpeaker(null);
setVirtualSpeakerSearch("");
setVirtualSpeakerOptions([]);
setLoadingVirtualSpeakers(false);
```

### 7. Update validate() - Add Virtual Speaker Case (line 140-183)
Before duplicate checking, add:
```javascript
if (isVirtualSpeaker) {
  if (!selectedVirtualSpeaker?.id) {
    newErrors.speaker = "Please select a virtual speaker";
  }
}
```

### 8. Update validate() - Add to Duplicate Checking (line 165-174)
In the else if chain, add:
```javascript
} else if (participantType === "virtual" && p.participantType === "virtual") {
  return p.virtualSpeakerId === selectedVirtualSpeaker?.id && p.role === role;
```

### 9. Update handleSubmit() (line 185-238)
In the participantData assignment, add else if:
```javascript
} else if (isVirtualSpeaker) {
  participantData.virtualSpeakerId = selectedVirtualSpeaker.id;
  participantData.name = selectedVirtualSpeaker.name;
  participantData.imageUrl = selectedVirtualSpeaker.profile_image_url || "";
}
```

### 10. Add Radio Button Option (in the RadioGroup in JSX)
Find the RadioGroup with FormControlLabel options and add:
```jsx
<FormControlLabel
  value="virtual"
  control={<Radio />}
  label="Virtual Speaker"
/>
```

### 11. Add Virtual Speaker Selection UI (in JSX, before submit buttons)
```jsx
{/* Virtual Speaker Selection */}
{isVirtualSpeaker && (
  <Box sx={{ mb: 2 }}>
    <Autocomplete
      options={virtualSpeakerOptions}
      getOptionLabel={(option) => option?.name || ""}
      value={selectedVirtualSpeaker}
      onChange={(e, value) => setSelectedVirtualSpeaker(value)}
      onInputChange={(e, value) => setVirtualSpeakerSearch(value)}
      loading={loadingVirtualSpeakers}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Select Virtual Speaker *"
          error={!!errors.speaker}
          helperText={errors.speaker}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loadingVirtualSpeakers ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <Box {...props} component="li">
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            {option.profile_image_url && (
              <Avatar src={option.profile_image_url} sx={{ width: 32, height: 32 }} />
            )}
            <Box>
              <Typography variant="body2">{option.name}</Typography>
              {option.job_title && (
                <Typography variant="caption" color="textSecondary">
                  {option.job_title}
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>
      )}
    />
  </Box>
)}
```

## Validation Checklist

After making all changes, verify:
- [ ] File imports `virtualSpeakerService`
- [ ] State variables for virtual speaker added
- [ ] `isVirtualSpeaker` constant defined
- [ ] Virtual speaker initialization in useEffect
- [ ] Virtual speaker search useEffect added
- [ ] resetForm() includes virtual speaker reset
- [ ] validate() checks for virtual speaker selection
- [ ] validate() handles virtual speaker duplicates
- [ ] handleSubmit() includes virtual speaker data
- [ ] Radio button option for "Virtual Speaker" added
- [ ] Autocomplete UI component added
- [ ] All imports are present (Box, Stack, Avatar, Typography, CircularProgress)

## Testing

After update, test:
1. [ ] Create event, add participant as "Virtual Speaker"
2. [ ] Search for and select a virtual speaker
3. [ ] Try to submit without selecting speaker - should show error
4. [ ] Try to add same virtual speaker twice with same role - should show duplicate error
5. [ ] Successfully add virtual speaker to event
6. [ ] Edit event and modify the virtual speaker participant
7. [ ] Verify participant data is submitted correctly to backend

## Common Issues

**Issue:** "listVirtualSpeakers is not defined"
- **Solution:** Make sure import is added at top of file

**Issue:** Autocomplete not showing speakers
- **Solution:** Ensure listVirtualSpeakers API call succeeds and returns data

**Issue:** Virtual speaker type not appearing
- **Solution:** Check that radio button option is in the RadioGroup JSX

**Issue:** Community ID error
- **Solution:** If using community_id from props/context, update line in useEffect that calls listVirtualSpeakers(1)

---

**Estimated Time to Complete:** 30-45 minutes
**Difficulty Level:** Medium (straightforward copy-paste with context)
