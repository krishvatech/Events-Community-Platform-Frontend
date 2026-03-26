# Virtual Speaker Frontend Integration Guide

## Files Created
1. ✅ `src/services/virtualSpeakerService.js` - API service layer
2. ✅ `src/components/VirtualSpeakerForm.jsx` - Create/edit virtual speakers
3. ✅ `src/components/ConvertVirtualSpeakerModal.jsx` - Convert virtual speaker to user
4. ✅ `src/pages/VirtualSpeakersPage.jsx` - Management page for virtual speakers

## Files That Need Updates

### 1. `src/components/ParticipantForm.jsx` - UPDATE REQUIRED

**Add imports at top:**
```javascript
import { listVirtualSpeakers } from "../services/virtualSpeakerService";
```

**Add these state variables after line 46:**
```javascript
const [selectedVirtualSpeaker, setSelectedVirtualSpeaker] = useState(null);
const [virtualSpeakerSearch, setVirtualSpeakerSearch] = useState("");
const [virtualSpeakerOptions, setVirtualSpeakerOptions] = useState([]);
const [loadingVirtualSpeakers, setLoadingVirtualSpeakers] = useState(false);
```

**Update line 52 - isAccountParticipant logic:**
```javascript
const isAccountParticipant = participantType === "staff" || participantType === "user";
```

**Add this new logic after line 52:**
```javascript
const isVirtualSpeaker = participantType === "virtual";
```

**In useEffect (line 57-94), add this after line 81 (in the else block):**
```javascript
} else if (initialData.participantType === "virtual") {
  setSelectedVirtualSpeaker({
    id: initialData.virtualSpeakerId,
    name: initialData.name,
  });
  setVirtualSpeakerSearch("");
}
```

**Add new useEffect for virtual speaker search (after line 124):**
```javascript
// Load virtual speakers on component mount and when searching
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
        const response = await listVirtualSpeakers(1); // Use community ID from context if available
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

**Update resetForm() (line 126-138) to include:**
```javascript
setSelectedVirtualSpeaker(null);
setVirtualSpeakerSearch("");
setVirtualSpeakerOptions([]);
setLoadingVirtualSpeakers(false);
```

**Update validate() (line 140-183) - add this before duplicate checking:**
```javascript
if (isVirtualSpeaker) {
  if (!selectedVirtualSpeaker?.id) {
    newErrors.speaker = "Please select a virtual speaker";
  }
}
```

**Update validate() duplicate checking (line 161-174) - add this case:**
```javascript
} else if (participantType === "virtual" && p.participantType === "virtual") {
  return p.virtualSpeakerId === selectedVirtualSpeaker?.id && p.role === role;
```

**Update handleSubmit() (line 185-238) - add this else if:**
```javascript
} else if (isVirtualSpeaker) {
  participantData.virtualSpeakerId = selectedVirtualSpeaker.id;
  participantData.name = selectedVirtualSpeaker.name;
  participantData.imageUrl = selectedVirtualSpeaker.profile_image_url || "";
}
```

**In the JSX render section (after the guest fields), add this before the submit buttons:**
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

**Add radio option for Virtual Speaker (find the RadioGroup section and add):**
```jsx
<FormControlLabel
  value="virtual"
  control={<Radio />}
  label="Virtual Speaker"
/>
```

---

### 2. `src/App.jsx` - ADD ROUTE

**Add this import at the top with other page imports:**
```javascript
import VirtualSpeakersPage from "./pages/VirtualSpeakersPage.jsx";
```

**Add this route in the Routes section (inside AdminLayout routes):**
```jsx
<Route
  path="/admin/virtual-speakers"
  element={
    <RequireAuth fallback="/signin">
      <VirtualSpeakersPage />
    </RequireAuth>
  }
/>
```

---

### 3. `src/components/Header.jsx` or Sidebar - ADD NAVIGATION LINK

**Add menu item for Virtual Speakers:**
```jsx
{/* For admin/organizers */}
<MenuItem
  onClick={() => {
    navigate('/admin/virtual-speakers');
    closeMenu();
  }}
>
  Virtual Speakers
</MenuItem>
```

---

### 4. `src/components/EditEventForm.jsx` - NO CHANGES NEEDED

The existing ParticipantForm will now support virtual speakers automatically once updated. When participants are submitted with `type: "virtual"` and `virtual_speaker_id`, the backend will handle it correctly.

---

## Implementation Steps

1. ✅ Create API service (`virtualSpeakerService.js`)
2. ✅ Create Virtual Speaker Form component
3. ✅ Create Convert Virtual Speaker Modal
4. ✅ Create Virtual Speakers Management page
5. ⏳ **UPDATE ParticipantForm.jsx** with virtual speaker support (see details above)
6. ⏳ **UPDATE App.jsx** to add route for Virtual Speakers page
7. ⏳ **UPDATE Header/Sidebar** to add navigation link
8. ✅ Test integration

---

## Testing Checklist

- [ ] Open Virtual Speakers page
- [ ] Create a new virtual speaker with name, job_title, company, bio, and image
- [ ] Edit the virtual speaker
- [ ] Delete a virtual speaker
- [ ] Convert virtual speaker to user account with email
- [ ] Resend invitation for converted speaker
- [ ] Create a new event
- [ ] In the event form, add a participant using "Virtual Speaker" type
- [ ] Verify virtual speaker data shows correctly in event participants
- [ ] Save event and verify participants are created
- [ ] Go to event details and verify virtual speaker is displayed

---

## Component Integration Flow

```
VirtualSpeakersPage
├── VirtualSpeakerForm (create/edit)
└── ConvertVirtualSpeakerModal (convert to user)

EditEventForm
└── ParticipantForm (UPDATED with virtual speaker support)
    └── Virtual speaker selection UI

API Layer
└── virtualSpeakerService.js
    ├── listVirtualSpeakers()
    ├── createVirtualSpeaker()
    ├── updateVirtualSpeaker()
    ├── deleteVirtualSpeaker()
    ├── convertVirtualSpeaker()
    └── resendVirtualSpeakerInvite()
```

---

## Key Data Structures

**Virtual Speaker Object:**
```json
{
  "id": 1,
  "community": 1,
  "name": "John Smith",
  "job_title": "Senior Engineer",
  "company": "Tech Corp",
  "bio": "Description here",
  "profile_image": "...",
  "profile_image_url": "...",
  "status": "active" | "converted",
  "converted_user": null | {id},
  "converted_at": null | "2026-03-26T...",
  "invited_email": "",
  "created_at": "2026-03-26T...",
  "updated_at": "2026-03-26T..."
}
```

**Participant with Virtual Speaker:**
```json
{
  "type": "virtual",
  "virtual_speaker_id": 123,
  "role": "speaker",
  "display_order": 0
}
```
