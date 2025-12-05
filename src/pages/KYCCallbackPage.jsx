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
        <div style={{ padding: "2rem", textAlign: "center" }}>
            <h2>Verification complete</h2>
            {status && (
                <p>
                    Status reported by Didit: <strong>{status}</strong>
                </p>
            )}
            <p>You can close this tab, we’re updating your account…</p>
        </div>
    );
}
