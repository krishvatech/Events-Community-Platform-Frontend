import React, { useState } from "react";
import HeroSection from "../components/HeroSection.jsx";
import AuthToggle from "../components/AuthToggle.jsx";
import FeaturesSection from "../components/FeaturesSection.jsx";
import { API_BASE } from "../utils/api";
import { cognitoSignIn } from "../utils/cognitoAuth";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { cognitoSignUp, cognitoConfirmSignUp } from "../utils/cognitoAuth";


import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Divider,
  Stack,
  CssBaseline,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 1, // pill-ish inputs like Figma
  },
};

const SignUpPage = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState("signup"); // "signup" | "confirm"
  const [verifyCode, setVerifyCode] = useState("");
  const [pendingUsername, setPendingUsername] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    // username: "", // auto-generated
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const filterInput = (value, field) => {
    switch (field) {
      case "username":
        return value.replace(/[^a-zA-Z0-9]/g, "");
      case "firstName":
      case "lastName":
        return value.replace(/[^a-zA-Z]/g, "");
      case "email":
        return value.replace(/\s/g, "");
      case "password":
      case "confirmPassword":
        return value.replace(/\s/g, "");
      default:
        return value;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const filteredValue = filterInput(value, name);
    setFormData((prev) => ({ ...prev, [name]: filteredValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    // if (!/^[A-Za-z0-9]{3,20}$/.test(formData.username || "")) {
    //   next.username = "3–20 letters/numbers, no spaces";
    // }
    if (!/^[A-Za-z]{2,}$/.test(formData.firstName || "")) {
      next.firstName = "First name must be at least 2 letters";
    }
    if (!/^[A-Za-z]{2,}$/.test(formData.lastName || "")) {
      next.lastName = "Last name must be at least 2 letters";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email || "")) {
      next.email = "Enter a valid email address";
    }
    const strongPwd = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[^\s]{8,}$/;
    if (!strongPwd.test(formData.password || "")) {
      next.password = "Min 8 chars, 1 uppercase, 1 number, 1 special";
    }
    if (formData.password !== formData.confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const normalizeApiErrors = (err) => {
    const data = err?.response?.data ?? err?.data ?? {};
    const fieldErrors = {};
    const items = [];

    const add = (field, message) => {
      const msg = Array.isArray(message) ? message.join(" ") : String(message);
      if (field && field !== "non_field_errors") {
        // friendlier messages
        let pretty = msg;
        if (/unique/i.test(msg) && field === "email") pretty = "Email already is exists";
        if (/unique/i.test(msg) && field === "username") pretty = "Username already taken";

        fieldErrors[field] = pretty;
        items.push(`${field[0].toUpperCase() + field.slice(1)}: ${pretty}`);
      } else {
        items.push(msg);
      }
    };

    if (data && typeof data === "object") {
      if (data.detail) add(null, data.detail);
      Object.entries(data).forEach(([k, v]) => {
        if (k === "detail") return;
        if (v && typeof v === "object" && !Array.isArray(v)) {
          Object.entries(v).forEach(([k2, v2]) => add(k2, v2)); // nested dict
        } else {
          add(k, v);
        }
      });
    } else {
      add(null, err?.message || "Signup failed");
    }
    return { fieldErrors, items };
  };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setErrors({});
  //   if (!validate()) return;
  //   setLoading(true);

  //   try {
  //     const username =
  //       (formData.username && formData.username.toLowerCase().trim()) ||
  //       `${(formData.firstName || "user").toLowerCase()}${Date.now()}`;

  //     const firstName = (formData.firstName || "").trim();
  //     const lastName = (formData.lastName || "").trim();

  //     // 👇 IMPORTANT: keys must be firstName / lastName here,
  //     // NOT first_name / last_name
  //     await registerUser({
  //       username,
  //       firstName,
  //       lastName,
  //       email: (formData.email || "").toLowerCase().trim(),
  //       password: formData.password,
  //     });

  //     toast.success("✅ Account created! You can now sign in.");
  //     navigate("/signin", {
  //       replace: true,
  //       state: { email: (formData.email || "").toLowerCase().trim(), justSignedUp: true },
  //     });
  //   } catch (err) {
  //     const { fieldErrors, items } = normalizeApiErrors(err);

  //     if (Object.keys(fieldErrors).length) {
  //       setErrors((prev) => ({ ...prev, ...fieldErrors }));
  //     }

  //     toast.error(
  //       <div>
  //         <strong>Could not create account</strong>
  //         <ul style={{ margin: "6px 0 0 18px" }}>
  //           {items.map((t, i) => (
  //             <li key={i}>{t}</li>
  //           ))}
  //         </ul>
  //       </div>
  //     );
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // ✅ Confirm stage: only verifyCode is needed
    if (stage === "confirm") {
      if (!verifyCode.trim()) {
        setErrors((prev) => ({ ...prev, verifyCode: "Verification code is required" }));
        return;
      }

      setLoading(true);
      try {
        await cognitoConfirmSignUp({ username: pendingUsername, code: verifyCode.trim() });

        /**
         * ✅ DB sync at signup time (no other logic changes):
         * 1) silently sign-in to get Cognito Access Token
         * 2) call backend /api/auth/users/me/ once with Bearer token
         *    -> backend creates auth_user + profile + community membership via existing logic
         */
        try {
          if (formData.password) {
            const session = await cognitoSignIn({
              usernameOrEmail: pendingUsername,
              password: formData.password,
            });

            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            await fetch(`${API_BASE}/auth/cognito/bootstrap/`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.idToken}`,
              },
              body: JSON.stringify({
                username: pendingUsername, // Send the generated username
                email: (formData.email || "").trim().toLowerCase(),
                firstName: (formData.firstName || "").trim(),
                lastName: (formData.lastName || "").trim(),
                timezone: tz,
              }),
            });
          }
        } catch (e) {
          // Don't block signup UX if sync fails; user can still sign in normally
          console.warn("Signup DB sync skipped/failed:", e);
        }

        toast.success("✅ Account verified! You can now sign in.");
        navigate("/signin", {
          replace: true,
          state: { email: (formData.email || "").toLowerCase().trim(), justSignedUp: true },
        });
      } catch (err) {
        const msg =
          err?.code === "AliasExistsException"
            ? "Email already taken"
            : err?.code === "CodeMismatchException"
              ? "Invalid verification code"
              : err?.code === "ExpiredCodeException"
                ? "Verification code expired"
                : (err?.message || "Verification failed");

        toast.error(`❌ ${msg}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ✅ Signup stage: validate full form first
    if (!validate()) return;

    setLoading(true);
    try {
      // Auto-generate username from email prefix + random suffix
      let emailPrefix = (formData.email || "").split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (!emailPrefix) emailPrefix = "user";
      const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
      const username = `${emailPrefix}${randomSuffix}`;

      await cognitoSignUp({
        username,
        email: (formData.email || "").toLowerCase().trim(),
        firstName: (formData.firstName || "").trim(),
        lastName: (formData.lastName || "").trim(),
        password: formData.password,
      });

      toast.info("📩 Verification code sent to your email.");
      setPendingUsername(username);
      setStage("confirm");
    } catch (err) {
      // Friendly common messages
      const msg =
        err?.code === "UsernameExistsException" ? "Username already taken" :
          err?.code === "InvalidPasswordException" ? "Password does not match Cognito policy" :
            err?.code === "InvalidParameterException" ? (err?.message || "Invalid input") :
              (err?.message || "Signup failed");

      toast.error(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CssBaseline />

      {/* FULL-PAGE SCROLL (no fixed/inset). The whole screen scrolls, including the hero image. */}
      <Box
        component="main"
        sx={{
          width: 1,
          minHeight: "100svh",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          bgcolor: "#F5F7FB",
        }}
      >
        {/* LEFT: Gradient hero — add top space before the logo (pt) and keep minHeight like Figma */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            flexBasis: { md: "50%" },
            flexShrink: 0,
            alignItems: "stretch",
            justifyContent: "center",
            bgcolor: "transparent",
            p: 0,
          }}
        >
          <HeroSection />
        </Box>

        {/* RIGHT: Content column (scrolls with page) */}
        <Box
          sx={{
            flexGrow: 1,
            width: { xs: "100%", md: "50%" },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            p: { xs: 2.5, md: 3 },
            gap: 4,
          }}
        >
          {/* Heading like in Figma */}
          <Box sx={{ width: "100%", maxWidth: 560, textAlign: "center", mt: { md: 2 } }}>
            <Typography
              variant="h5"
              fontWeight={400}
              sx={{ letterSpacing: "-0.2px" }}
              gutterBottom
            >
              Welcome Back
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sign in to access your learning journey
            </Typography>
          </Box>

          {/* Card */}
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              maxWidth: 460,
              p: { xs: 2.5, md: 3 },
              borderRadius: 1, // big rounded like Figma
              border: "1px solid #E6EAF2",
              boxShadow:
                "0 12px 28px rgba(22,93,255,0.10), 0 2px 6px rgba(0,0,0,0.05)",
              bgcolor: "#fff",
            }}
          >
            {/* Pill tabs */}
            <Box sx={{ mb: 3 }}>
              <AuthToggle />
            </Box>

            {/* Form (compact) */}
            <Box component="form" noValidate onSubmit={handleSubmit}>
              <Stack spacing={1.5}>
                {/* Username */}
                {/* Username field removed - auto-generated from email */}

                {/* First/Last name row */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 1, // tighter gap
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ mb: 0.25, fontWeight: 600, color: "#374151", fontSize: 12 }}>
                      First Name
                    </Typography>
                    <TextField
                      name="firstName"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={handleChange}
                      size="small"
                      error={Boolean(errors.firstName)}
                      helperText={errors.firstName}
                      fullWidth
                      sx={{
                        ...inputSx,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 0.5,
                          "& fieldset": { borderColor: "#d1d5db" }, // default
                          "&:hover fieldset": { borderColor: "#155dfc" }, // hover
                          "&.Mui-focused fieldset": { borderColor: "#155dfc" }, // focus
                        },
                        "& .MuiInputBase-input": { paddingTop: "8px", paddingBottom: "8px", fontSize: 14 },
                        "& .MuiFormHelperText-root": { fontSize: 11, mt: 0.5 },
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ mb: 0.25, fontWeight: 600, color: "#374151", fontSize: 12 }}>
                      Last Name
                    </Typography>
                    <TextField
                      name="lastName"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={handleChange}
                      size="small"
                      error={Boolean(errors.lastName)}
                      helperText={errors.lastName}
                      fullWidth
                      sx={{
                        ...inputSx,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 0.5,
                          "& fieldset": { borderColor: "#d1d5db" }, // default
                          "&:hover fieldset": { borderColor: "#155dfc" }, // hover
                          "&.Mui-focused fieldset": { borderColor: "#155dfc" }, // focus
                        },
                        "& .MuiInputBase-input": { paddingTop: "8px", paddingBottom: "8px", fontSize: 14 },
                        "& .MuiFormHelperText-root": { fontSize: 11, mt: 0.5 },
                      }}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ mb: 0.25, fontWeight: 600, color: "#374151", fontSize: 12 }}>
                    Email Address
                  </Typography>
                  <TextField
                    name="email"
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleChange}
                    size="small"
                    error={Boolean(errors.email)}
                    helperText={errors.email}
                    fullWidth
                    sx={{
                      ...inputSx,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 0.5,
                        "& fieldset": { borderColor: "#d1d5db" }, // default
                        "&:hover fieldset": { borderColor: "#155dfc" }, // hover
                        "&.Mui-focused fieldset": { borderColor: "#155dfc" }, // focus
                      },
                      "& .MuiInputBase-input": { paddingTop: "8px", paddingBottom: "8px", fontSize: 14 },
                      "& .MuiFormHelperText-root": { fontSize: 11, mt: 0.5 },
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ mb: 0.25, fontWeight: 600, color: "#374151", fontSize: 12 }}>
                    Password
                  </Typography>
                  <TextField
                    name="password"
                    type={showPwd ? "text" : "password"}
                    placeholder="Create a secure password"
                    value={formData.password}
                    onChange={handleChange}
                    size="small"
                    error={Boolean(errors.password)}
                    helperText={errors.password}
                    fullWidth
                    sx={{
                      ...inputSx,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 0.5,
                        "& fieldset": { borderColor: "#d1d5db" }, // default
                        "&:hover fieldset": { borderColor: "#155dfc" }, // hover
                        "&.Mui-focused fieldset": { borderColor: "#155dfc" }, // focus
                      },
                      "& .MuiInputBase-input": { paddingTop: "8px", paddingBottom: "8px", fontSize: 14 },
                      "& .MuiFormHelperText-root": { fontSize: 11, mt: 0.5 },
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowPwd((v) => !v)} edge="end" sx={{ p: 0.5 }}>
                            {showPwd ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ mb: 0.25, fontWeight: 600, color: "#374151", fontSize: 12 }}>
                    Confirm Password
                  </Typography>
                  <TextField
                    name="confirmPassword"
                    type={showPwd2 ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    size="small"
                    error={Boolean(errors.confirmPassword)}
                    helperText={errors.confirmPassword}
                    fullWidth
                    sx={{
                      ...inputSx,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 0.5,
                        "& fieldset": { borderColor: "#d1d5db" }, // default
                        "&:hover fieldset": { borderColor: "#155dfc" }, // hover
                        "&.Mui-focused fieldset": { borderColor: "#155dfc" }, // focus
                      },
                      "& .MuiInputBase-input": { paddingTop: "8px", paddingBottom: "8px", fontSize: 14 },
                      "& .MuiFormHelperText-root": { fontSize: 11, mt: 0.5 },
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowPwd2((v) => !v)} edge="end" sx={{ p: 0.5 }}>
                            {showPwd2 ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {stage === "confirm" && (
                  <Box>
                    <Typography variant="caption" sx={{ mb: 0.25, fontWeight: 600, color: "#374151", fontSize: 12 }}>
                      Verification Code
                    </Typography>
                    <TextField
                      name="verifyCode"
                      placeholder="Enter code from email"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\s/g, ""))}
                      size="small"
                      fullWidth
                      sx={{
                        ...inputSx,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 0.5,
                          "& fieldset": { borderColor: "#d1d5db" },
                          "&:hover fieldset": { borderColor: "#155dfc" },
                          "&.Mui-focused fieldset": { borderColor: "#155dfc" },
                        },
                      }}
                    />
                  </Box>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  disableElevation
                  fullWidth
                  disabled={loading}
                  sx={{
                    py: 0.7,                  // slimmer button
                    borderRadius: 0.75,       // smaller radius
                    bgcolor: "#155dfc",
                    "&:hover": { bgcolor: "#165DFF" },
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {loading ? (stage === "confirm" ? "Verifying..." : "Creating...") : (stage === "confirm" ? "Verify Code" : "Create Your Account")}
                </Button>
              </Stack>
            </Box>



            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2, textAlign: "center", fontSize: 12 }}
            >
              By joining, you agree to our{" "}
              <Box component="span" sx={{ color: "#155dfc", fontWeight: 600 }}>
                Terms of Service
              </Box>{" "}
              and{" "}
              <Box component="span" sx={{ color: "#155dfc", fontWeight: 600 }}>
                Privacy Policy
              </Box>
            </Typography>



            {/* Feature tiles like your screenshot */}

          </Paper>
          <Box sx={{ width: 460, mt: 0, px: { xs: 1, md: 0 } }}>
            <FeaturesSection />
          </Box>

          {/* bottom spacer so the card shadow doesn't touch the edge */}

        </Box>
      </Box>

      <ToastContainer position="top-center" autoClose={2000} theme="colored" />
    </>
  );
};

export default SignUpPage;
