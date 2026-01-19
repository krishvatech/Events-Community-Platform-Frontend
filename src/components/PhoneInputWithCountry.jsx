import React from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/material.css";
import { Box, Typography } from "@mui/material";
import PhoneIcon from "@mui/icons-material/Phone";

/**
 * A wrapper around react-phone-input-2 to match Material UI styling.
 */
export default function PhoneInputWithCountry({
    value,
    onChange,
    label = "Phone Number",
    error,
    helperText,
    disabled,
    viewMode = false
}) {
    return (
        <Box sx={{ width: "100%" }}>
            {viewMode ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PhoneIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    <PhoneInput
                        country={"in"}
                        value={value}
                        disabled={true}
                        disableDropdown={true} // Hides the arrow
                        specialLabel={""} // No label in view mode
                        inputStyle={{
                            width: "100%",
                            border: "none",
                            background: "transparent",
                            color: "inherit",
                            padding: "0 0 0 40px", // space for flag
                            height: "auto",
                            boxShadow: "none",
                            fontSize: "0.875rem", // Match body2 variant often used in display
                            opacity: 1, // Ensure it doesn't look disabled
                            "-webkit-text-fill-color": "inherit" // Override browser disabled text color
                        }}
                        buttonStyle={{
                            background: "transparent",
                            border: "none",
                            opacity: 1,
                            padding: 0 // Ensure no extra padding
                        }}
                        containerStyle={{
                            width: "auto", // Let it take natural width
                            margin: 0,
                            padding: 0,
                            flex: 1
                        }}
                        inputProps={{
                            readOnly: true,
                        }}
                    />
                </Box>
            ) : (
                <PhoneInput
                    country={"in"} // Default to India or auto-detect if preferred, but 'in' is safe for this user
                    value={value}
                    onChange={(phone) => {
                        // react-phone-input-2 returns the phone string directly (digits only usually)
                        // We pass it up.
                        onChange && onChange(phone);
                    }}
                    disabled={disabled}
                    specialLabel={label}
                    inputStyle={{
                        width: "100%",
                        // MUI default outlined input height is roughly 56px
                        // The library's material theme handles some of this, but we reinforce it.
                        borderColor: error ? "#d32f2f" : undefined,
                    }}
                    containerStyle={{
                        width: "100%",
                    }}
                    dropdownStyle={{
                        zIndex: 1300, // Ensure it sits above dialogs
                        textAlign: "left"
                    }}
                    inputProps={{
                        required: false,
                    }}
                />
            )}
            {/* Helper text for error messages */}
            {helperText && (
                <Typography
                    variant="caption"
                    sx={{
                        color: error ? "error.main" : "text.secondary",
                        ml: 2,
                        mt: 0.5,
                        display: "block"
                    }}
                >
                    {helperText}
                </Typography>
            )}
        </Box>
    );
}
