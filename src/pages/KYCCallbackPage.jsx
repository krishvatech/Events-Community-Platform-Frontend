// src/pages/KYCCallbackPage.jsx
import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiClient } from "../utils/api";

export default function KYCCallbackPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const verificationSessionId = searchParams.get("verificationSessionId");
    const status = searchParams.get("status");

    useEffect(() => {
        const run = async () => {
            try {
                const res = await apiClient.get("/users/me/");
                const user = res.data;

                if (user.is_superuser || user.is_staff) {
                    navigate("/admin/settings", { replace: true });
                } else {
                    navigate("/account/profile", { replace: true });
                }
            } catch (e) {
                // fallback
                navigate("/community", { replace: true });
            }
        };
        run();
    }, [navigate]);


    return (
        <div
            style={{
                minHeight: "70vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "2rem",
                gap: "14px",
            }}
        >
            <style>{`
      @keyframes kycSpin { to { transform: rotate(360deg); } }
    `}</style>

            <div
                aria-label="Loading"
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: "4px solid rgba(0,0,0,0.12)",
                    borderTopColor: "rgba(0,0,0,0.55)",
                    animation: "kycSpin 0.9s linear infinite",
                }}
            />

            <div style={{ fontSize: "18px", fontWeight: 600 }}>
                Updating Your Account…
            </div>

            <div style={{ fontSize: "14px", opacity: 0.75, maxWidth: 420 }}>
                Please wait. You’ll be redirected automatically.
            </div>
        </div>
    );
}
