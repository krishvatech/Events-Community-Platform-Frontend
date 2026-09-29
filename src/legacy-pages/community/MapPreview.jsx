// Booking.com-style map collapsed state shared by the member directory map panels.
import React from "react";
import { Box, ButtonBase, FormControlLabel, Switch } from "@mui/material";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";

const BORDER = "#e2e8f0";
const MAP_PREVIEW_ZOOM = 2;

// World tiles for a Leaflet-style URL template ({s}/{r} are CARTO-style placeholders).
function previewTiles(tileUrl) {
  const size = 2 ** MAP_PREVIEW_ZOOM;
  return Array.from({ length: size * size }, (_, i) =>
    tileUrl
      .replace("{s}", "a")
      .replace("{r}", "")
      .replace("{z}", MAP_PREVIEW_ZOOM)
      .replace("{x}", i % size)
      .replace("{y}", Math.floor(i / size))
  );
}

export function MapToggle({ checked, onChange }) {
  return (
    <FormControlLabel
      labelPlacement="start"
      control={<Switch checked={checked} onChange={(_, v) => onChange(v)} size="small" />}
      label={checked ? "Map on" : "Map off"}
      sx={{
        m: 0,
        pl: 1.5,
        pr: 0.5,
        py: 0.25,
        borderRadius: 999,
        border: `1px solid ${BORDER}`,
        bgcolor: checked ? "rgba(10, 147, 150, 0.08)" : "#f8fafc",
        "& .MuiFormControlLabel-label": { fontSize: 13, fontWeight: 600, color: "text.secondary" },
      }}
    />
  );
}

// Static world preview shown while the live map is off. Uses the live map's tile
// style but fetches no marker data.
export function MembersMapPreview({ tileUrl, onShowMap, minHeight = 300 }) {
  const tiles = React.useMemo(() => previewTiles(tileUrl), [tileUrl]);
  return (
    <ButtonBase
      onClick={onShowMap}
      aria-label="Show map"
      sx={{
        position: "relative",
        display: "block",
        width: "100%",
        flex: 1,
        minHeight,
        containerType: "size",
        borderRadius: 3,
        overflow: "hidden",
        border: `1px solid ${BORDER}`,
        bgcolor: "#b5d0d0",
        "& .map-preview-tiles": { transition: "transform 400ms ease" },
        "&:hover .map-preview-tiles": { transform: "translate(-50%, -42%) scale(1.04)" },
        "&:hover .map-preview-cta": { boxShadow: "0 6px 18px rgba(15, 23, 42, 0.28)" },
        "&.Mui-focusVisible": { outline: "3px solid", outlineColor: "primary.main", outlineOffset: 2 },
      }}
    >
      <Box
        className="map-preview-tiles"
        aria-hidden
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          // Square world tile grid scaled to cover the card (crops the poles on tall panels)
          width: "max(100cqw, 130cqh, 560px)",
          aspectRatio: "1 / 1",
          transform: "translate(-50%, -42%)",
          display: "grid",
          gridTemplateColumns: `repeat(${2 ** MAP_PREVIEW_ZOOM}, 1fr)`,
        }}
      >
        {tiles.map((src) => (
          <Box
            key={src}
            component="img"
            src={src}
            alt=""
            loading="lazy"
            draggable={false}
            sx={{ width: "100%", height: "100%", display: "block" }}
          />
        ))}
      </Box>
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.35) 100%)",
        }}
      />
      <Box
        className="map-preview-cta"
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          px: 2.5,
          py: 1.25,
          borderRadius: 2,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          fontWeight: 700,
          fontSize: 15,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.22)",
          transition: "box-shadow 200ms ease",
        }}
      >
        <PlaceRoundedIcon fontSize="small" />
        Show on map
      </Box>
    </ButtonBase>
  );
}
