# Interest-Based Matching - Frontend Integration Guide

## Overview

The interest-based matching system has been fully integrated into the frontend speed networking interface. This guide explains all the new components and how they work.

## New Components Added

### 1. **InterestTagManager.jsx**
Location: `src/components/speed-networking/InterestTagManager.jsx`

**Purpose:** Allows hosts to create and manage interest tags for a speed networking session.

**Features:**
- View all active interest tags for a session
- Create new interest tags with:
  - Label (e.g., "Looking for investors")
  - Category (e.g., "investment")
  - Side: Offering / Seeking / Both
- Delete/deactivate tags
- Color-coded by category

**Usage in SpeedNetworkingHostPanel:**
```jsx
<InterestTagManager
    eventId={eventId}
    sessionId={session?.id}
    session={session}
/>
```

### 2. **InterestSelector.jsx**
Location: `src/components/speed-networking/InterestSelector.jsx`

**Purpose:** Dialog that appears when participants join a speed networking queue to select their interests.

**Features:**
- Multi-select interface for choosing interests
- Interests grouped by category
- Visual indicators for side (Seeking/Offering/Both)
- Shows count of selected interests
- Validates that at least one interest is selected before allowing join

**Usage in SpeedNetworkingZone:**
```jsx
<InterestSelector
    eventId={eventId}
    sessionId={session?.id}
    open={showInterestSelector}
    onClose={() => setShowInterestSelector(false)}
    onSelectInterests={handleJoinQueueWithInterests}
/>
```

### 3. **InterestDisplay.jsx**
Location: `src/components/speed-networking/InterestDisplay.jsx`

**Purpose:** Displays interests as colored chips grouped by category.

**Features:**
- Shows interests with emoji indicators (🔍 Seeking, 💼 Offering, ↔️ Both)
- Color-coded by category
- Customizable title
- Gracefully handles empty interests

**Usage in SpeedNetworkingMatch:**
```jsx
{partner?.interests && partner.interests.length > 0 && (
    <InterestDisplay interests={partner.interests} title="Their Interests" />
)}
```

### 4. **InterestCriteriaConfig.jsx**
Location: `src/components/speed-networking/InterestCriteriaConfig.jsx`

**Purpose:** UI for hosts to configure interest-based matching in the matching criteria.

**Features:**
- Enable/disable interest matching
- Set weight (0-100%) - how much interests affect match score
- Set threshold (0-100%) - minimum score if marked as required
- Choose match mode:
  - 🔄 **Complementary**: Pairs opposite interests (seek ↔ offer)
  - 🤝 **Similar**: Pairs same interests (both seeking)
  - ↔️ **Both**: Tries complementary first, then similar
- Mark as required/optional
- Helpful info box explaining how it works

**Usage in SpeedNetworkingHostPanel:**
```jsx
<InterestCriteriaConfig
    config={criteriaConfig}
    onUpdate={(newConfig) => {
        setCriteriaConfig(newConfig);
        handleSaveCriteria(newConfig);
    }}
/>
```

## User Flows

### Flow 1: Host Sets Up Interest Matching

1. Host goes to Speed Networking session
2. Clicks on "Settings" tab in Host Panel
3. **Creates Interest Tags:**
   - Clicks "Add Tag" in Interest Tags section
   - Fills in:
     - Label: "Looking for investors"
     - Category: "investment"
     - Side: "Seeking"
   - Clicks "Create"
   - Repeats for complementary tags

4. **Configures Matching Criteria:**
   - Scrolls to "Interest-Based Matching" card
   - Toggles "Enabled"
   - Adjusts:
     - Weight: 45% (how much interests matter)
     - Threshold: 50%
     - Match Mode: "Complementary"

### Flow 2: Participant Joins and Selects Interests

1. Participant opens Speed Networking session
2. Sees "Ready to Network?" screen
3. Clicks "Join Speed Networking" button
4. **Interest Selector Dialog appears:**
   - Shows all available interest tags grouped by category
   - Participant selects interests:
     - Checks "Looking for investors" (seeking)
     - Checks "Open to partnerships" (both)
   - Clicks "Join Queue (2)"
5. Participant enters lobby and waits for match

### Flow 3: Match Results Show Interests

1. Two compatible participants are matched
2. Speed Networking Match screen displays:
   - Partner's profile with avatar
   - **"Their Interests" section** showing:
     - "🔍 Looking for investors" (category: investment)
     - "↔️ Open to partnerships" (category: partnership)
   - Match Probability: 78%
   - Match Score Breakdown showing interests score: 95%

## Modified Components

### SpeedNetworkingZone.jsx

**Changes:**
- Added `InterestSelector` import
- Added `showInterestSelector` state
- Modified `handleJoinQueue()` to show interest selector instead of joining directly
- Added `handleJoinQueueWithInterests()` that:
  - Takes selected interest IDs
  - Calls backend `/join/` endpoint with `interest_ids` param
  - Handles match immediately if found
  - Otherwise puts user in lobby queue

**Key code:**
```jsx
const handleJoinQueue = () => {
    if (!session) return;
    setShowInterestSelector(true);  // Show selector instead of joining
};

const handleJoinQueueWithInterests = async (interestIds) => {
    // Call /join/ with interest_ids payload
    const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ interest_ids: interestIds })
    });
    // ...handle match
};
```

### SpeedNetworkingMatch.jsx

**Changes:**
- Added `InterestDisplay` import
- Added partner interests display after divider
- Shows partner's interests in their profile sidebar

**Key code:**
```jsx
{partner?.interests && partner.interests.length > 0 && (
    <InterestDisplay interests={partner.interests} title="Their Interests" />
)}
```

### SpeedNetworkingHostPanel.jsx

**Changes:**
- Added imports for `InterestTagManager` and `InterestCriteriaConfig`
- Added components to Settings tab with proper spacing
- Interest Tag Manager appears first
- Interest Criteria Config appears before other criteria cards
- Fully integrated with existing criteria config save flow

**Key code:**
```jsx
{selectedTab === 'settings' && (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <InterestTagManager ... />
        <Divider />
        <InterestCriteriaConfig ... />
        {/* Other criteria cards */}
    </Box>
)}
```

## API Integration

All components use the following API endpoints (already implemented in backend):

```
GET    /events/{event_id}/speed-networking/{session_id}/interest-tags/
POST   /events/{event_id}/speed-networking/{session_id}/interest-tags/
DELETE /events/{event_id}/speed-networking/{session_id}/interest-tags/{tag_id}/

POST   /events/{event_id}/speed-networking/{session_id}/join/
       Body: { interest_ids: [1, 2, 3] }

PATCH  /events/{event_id}/speed-networking/{session_id}/update_criteria/
       Body: {
           criteria_config: {
               interests: {
                   enabled: true,
                   weight: 0.45,
                   match_mode: "complementary"
               }
           }
       }
```

## Color Scheme

Interest tags are color-coded by category:

```javascript
{
    'investment': '#5a78ff',      // Blue
    'recruitment': '#10b981',     // Green
    'mentorship': '#f59e0b',      // Amber
    'partnership': '#8b5cf6',     // Purple
    'collaboration': '#06b6d4'    // Cyan
}
```

## Testing the Feature

### Test Scenario 1: Create Interest Tags
1. Host joins speed networking session
2. Goes to Settings tab
3. Creates 2-3 interest tags with different categories
4. Verify tags appear as chips with correct colors

### Test Scenario 2: Select Interests When Joining
1. Participant clicks "Join Speed Networking"
2. Interest Selector dialog appears
3. Select some interests
4. Click "Join Queue"
5. Verify user enters lobby

### Test Scenario 3: Matching with Complementary Interests
1. Create complementary interest tags:
   - "Looking for investors" (investment/seek)
   - "Offering investment" (investment/offer)
2. Host enables interests with complementary mode
3. User A joins and selects "Looking for investors"
4. User B joins and selects "Offering investment"
5. Verify they get matched with high interest score (95%+)

### Test Scenario 4: View Interests in Match
1. After two users are matched
2. Check partner profile sidebar
3. Verify "Their Interests" section shows properly
4. Check match score breakdown includes interests criterion

## Styling Notes

- All components follow the existing dark theme (#0a0f1a background)
- Use Material-UI components for consistency
- Color scheme matches existing speed networking UI
- Responsive design works on mobile and desktop
- Icons use lucide-react and @mui/icons-material

## Future Enhancements

Potential improvements not included in this release:

1. **Suggestion System** - Show recommended interest pairings
2. **Interest Analytics** - Dashboard showing which interests get matched most
3. **Custom Interest Creation** - Participants can suggest new interests
4. **Interest History** - Track which interests led to good matches
5. **Interest Presets** - Templates for common sessions (investor day, job fair, etc.)
6. **Interest Search** - Filter and find specific interests

## Troubleshooting

### Interest Selector doesn't appear
- Check that `showInterestSelector` state is being managed
- Verify API can fetch interest tags at `/interest-tags/`

### Interests not showing in match
- Verify backend is returning `interests` field on matched user data
- Check that `partner?.interests` is being passed correctly to `InterestDisplay`

### Colors not displaying
- Ensure category values match color mapping exactly (lowercase)
- Check Material-UI theme is properly applied

### Interests not affecting match score
- Verify interests are enabled in criteria config
- Check weight is > 0
- Ensure match_mode is set to one of: complementary, similar, both

---

**Version:** 1.0
**Last Updated:** February 2026
**Backend API Version:** 1.0 (matches migration 0053_add_speed_networking_interests)
