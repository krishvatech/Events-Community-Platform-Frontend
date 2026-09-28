import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Accordion,
  AccordionDetails,
  AccordionSummary,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

const ORANGE = "#E8532F";
const TEAL = "#0A9396";
const NAVY = "#1B2A4A";
const TEXT = "#2C3E5A";
const BORDER = "#F0EEEB";
const SOFT_BG = "#F8FAFC";

const quickGuideCards = [
  {
    id: "application-tracks",
    title: "Application Tracks",
    icon: ChecklistRoundedIcon,
    description: "Create apply categories such as Participant, Speaker, Sponsor Staff, Start-up, Investor, or Researcher.",
  },
  {
    id: "review-queue",
    title: "Review Queue",
    icon: FactCheckRoundedIcon,
    description: "Review submitted applications and accept, decline, or waitlist each selected track.",
  },
  {
    id: "pricing-tiers",
    title: "Pricing Tiers",
    icon: PaymentsRoundedIcon,
    description: "Decide whether an accepted user becomes Confirmed immediately or Payment Pending first.",
  },
  {
    id: "participant-information",
    title: "Participant Information",
    icon: AssignmentTurnedInRoundedIcon,
    description: "Collect logistics details from confirmed in-person or hybrid attendees.",
  },
  {
    id: "promotional-profiles",
    title: "Promotional Profiles",
    icon: CampaignRoundedIcon,
    description: "Collect public profile content for Speakers, Sponsors, Sponsor Staff, Start-ups, and Investors.",
  },
  {
    id: "pre-approval",
    title: "Pre-Approval",
    icon: VerifiedUserRoundedIcon,
    description: "Use codes or email allowlists for confirmed, invite-only, or special applicant flows.",
  },
];

const triggerMatrix = [
  { format: "Virtual", role: "Attendee", participantInfo: "No", promotionalProfile: "No" },
  { format: "Virtual", role: "Speaker / Sponsor / Sponsor Staff / Start-up / Investor", participantInfo: "No", promotionalProfile: "Yes" },
  { format: "In-person", role: "Attendee", participantInfo: "Yes", promotionalProfile: "No" },
  { format: "In-person", role: "Speaker / Sponsor / Sponsor Staff / Start-up / Investor", participantInfo: "Yes", promotionalProfile: "Yes" },
  { format: "Hybrid", role: "Attendee", participantInfo: "Yes", promotionalProfile: "No" },
  { format: "Hybrid", role: "Speaker / Sponsor / Sponsor Staff / Start-up / Investor", participantInfo: "Yes", promotionalProfile: "Yes" },
];

const commonScenarios = [
  {
    title: "Virtual Speaker",
    setup: "Event format: Virtual · Track: Speaker · Tier: speaker_comp = 0 · Role: Speaker",
    result: "User becomes confirmed immediately. Participant Information is not sent. Promotional Profile is sent.",
  },
  {
    title: "In-person Paid Participant",
    setup: "Event format: In-person · Track: Participant · Tier: standard = 1200 · Role: Attendee",
    result: "After acceptance user becomes Payment Pending. After admin marks paid, user becomes Confirmed and Participant Information is sent.",
  },
  {
    title: "In-person Speaker + Participant",
    setup: "Tracks: Speaker with speaker_comp = 0 and Participant with standard = 1200",
    result: "Speaker role confirms immediately and Promotional Profile is sent. Participant role remains Payment Pending until admin marks paid. Promotional Profile is not duplicated.",
  },
  {
    title: "Hybrid Sponsor Staff",
    setup: "Event format: Hybrid · Track: Sponsor Staff · Tier: sponsor_allocation = 0 · Role: Sponsor Staff",
    result: "Participant Information and Promotional Profile are both sent. Participant Information should ask whether the user attends online or in person.",
  },
];

const troubleshootingItems = [
  {
    question: "Why is the Apply button disabled?",
    answer: "Check that the event registration type is Application Required and at least one Application Track is open. If no open track exists, users should not be able to submit an application.",
  },
  {
    question: "Why is the user showing Payment Pending?",
    answer: "The admin accepted the user with a paid tier. Paid tiers do not become Confirmed automatically. Admin must use Mark Paid on the correct origin/track application.",
  },
  {
    question: "Why was Participant Information not created?",
    answer: "Participant Information only triggers for confirmed attendees of In-person or Hybrid events. It does not trigger for Virtual-only normal attendees or users still in Payment Pending.",
  },
  {
    question: "Why was Promotional Profile not created?",
    answer: "Promotional Profile only triggers for confirmed users with public roles such as Speaker, Sponsor, Sponsor Staff, Start-up, or Investor. Attendee-only users do not receive it.",
  },
  {
    question: "Why did the pre-approval code not work?",
    answer: "Pre-approval codes are scoped by event, track, and submission mode. A Speaker Confirmed code should not work for Participant or Speaker Self Nomination unless separately configured.",
  },
];

const setupChecklist = [
  "Event registration type is Application Required.",
  "At least one Application Track exists.",
  "Track status is Open.",
  "Correct submission modes are enabled.",
  "Correct role is assigned on acceptance.",
  "At least one pricing tier exists.",
  "Pre-approval code or email allowlist is configured if needed.",
  "Normal user can submit an application.",
  "Admin can see the application in Review Queue.",
];

const navigationItems = [
  ["admin-guide-top", "Overview"],
  ["start-here", "Workflow"],
  ["application-tracks", "Application Tracks"],
  ["pricing-tiers", "Pricing Tiers"],
  ["forms", "Forms"],
  ["trigger-matrix", "Trigger Matrix"],
  ["common-scenarios", "Scenarios"],
  ["troubleshooting", "Troubleshooting"],
  ["testing-checklist", "Checklist"],
];

function StatusPill({ value }) {
  const isYes = value === "Yes";
  return (
    <Chip
      size="small"
      label={value}
      sx={{
        minWidth: 54,
        fontWeight: 800,
        color: isYes ? TEAL : "#6B7280",
        bgcolor: isYes ? "rgba(10,147,150,0.10)" : "rgba(107,114,128,0.10)",
      }}
    />
  );
}

function SectionHeader({ eyebrow, title, description }) {
  return (
    <Box sx={{ mb: 2.25 }}>
      {eyebrow && (
        <Typography variant="overline" sx={{ color: ORANGE, fontWeight: 900, letterSpacing: "0.12em" }}>
          {eyebrow}
        </Typography>
      )}
      <Typography variant="h5" sx={{ color: NAVY, fontWeight: 900, mb: 0.75, letterSpacing: "-0.02em" }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: "#64748B", maxWidth: 900, lineHeight: 1.65 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}

function GuideAccordion({ id, title, children, defaultExpanded = false }) {
  return (
    <Accordion
      id={id}
      defaultExpanded={defaultExpanded}
      disableGutters
      sx={{
        border: `1px solid ${BORDER}`,
        borderRadius: "16px !important",
        mb: 1.5,
        boxShadow: "none",
        overflow: "hidden",
        scrollMarginTop: 24,
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 2.5, py: 1.1 }}>
        <Typography sx={{ fontWeight: 900, color: NAVY }}>{title}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2.5, pt: 0, pb: 2.5 }}>{children}</AccordionDetails>
    </Accordion>
  );
}

export default function AdminGuidePage() {
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCards = useMemo(() => {
    if (!normalizedQuery) return quickGuideCards;
    return quickGuideCards.filter((card) =>
      `${card.title} ${card.description}`.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    document.documentElement.style.overflowX = "hidden";
    document.body.style.overflowX = "hidden";

    return () => {
      document.documentElement.style.overflowX = "";
      document.body.style.overflowX = "";
    };
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (!element) return;

    const top = element.getBoundingClientRect().top + window.scrollY - 18;
    window.scrollTo({ top: Math.max(top, 0), left: 0, behavior: "smooth" });

    window.requestAnimationFrame(() => {
      if (window.scrollX !== 0) {
        window.scrollTo({ top: window.scrollY, left: 0 });
      }
    });
  };

  return (
    <Box
      id="admin-guide-top"
      sx={{
        width: "100%",
        maxWidth: "1180px",
        mx: "auto",
        pb: 6,
        px: { xs: 1.5, md: 0 },
        overflowX: "hidden",
        scrollMarginTop: 24,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 4 },
          mb: 2.5,
          borderRadius: 4,
          border: `1px solid ${BORDER}`,
          overflow: "hidden",
          background: "linear-gradient(135deg, rgba(10,147,150,0.10), rgba(232,83,47,0.08))",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Chip label="Admin Help Center" size="small" sx={{ mb: 1.5, bgcolor: "#fff", color: ORANGE, fontWeight: 900 }} />
            <Typography variant="h3" sx={{ color: NAVY, fontWeight: 950, letterSpacing: "-0.04em", mb: 1, lineHeight: 1.05 }}>
              Admin Guide
            </Typography>
            <Typography variant="body1" sx={{ color: TEXT, maxWidth: 760, lineHeight: 1.65 }}>
              Understand how Application Tracks, Review Queue, Pricing Tiers, Participant Information, and Promotional Profiles work.
            </Typography>
          </Box>

          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search guide..."
            size="small"
            sx={{
              width: { xs: "100%", md: 340 },
              flexShrink: 0,
              bgcolor: "#fff",
              borderRadius: 2,
              "& .MuiOutlinedInput-root": { borderRadius: 2 },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 1.25,
          mb: 2.5,
          border: `1px solid ${BORDER}`,
          borderRadius: 3,
          bgcolor: "#fff",
        }}
      >
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {navigationItems.map(([id, label]) => (
            <Button
              key={id}
              size="small"
              onClick={() => scrollToSection(id)}
              sx={{
                px: 1.5,
                borderRadius: 2,
                color: TEXT,
                textTransform: "none",
                fontWeight: 800,
                "&:hover": { bgcolor: "rgba(232,83,47,0.08)", color: ORANGE },
              }}
            >
              {label}
            </Button>
          ))}
        </Stack>
      </Paper>

      <Stack spacing={2.5} sx={{ minWidth: 0 }}>
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <SectionHeader
            eyebrow="Quick Guide"
            title="Choose what you want to understand"
            description="Use these cards as shortcuts. Each card explains one part of the admin workflow in simple language."
          />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "1fr 1fr 1fr" }, gap: 2 }}>
            {filteredCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card
                  key={card.id}
                  variant="outlined"
                  onClick={() => scrollToSection(card.id)}
                  sx={{
                    borderColor: BORDER,
                    borderRadius: 3,
                    cursor: "pointer",
                    height: "100%",
                    transition: "all 0.18s ease",
                    "&:hover": {
                      borderColor: ORANGE,
                      transform: "translateY(-2px)",
                      boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.25 }}>
                    <Box sx={{ width: 42, height: 42, borderRadius: 2, bgcolor: "rgba(232,83,47,0.10)", display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>
                      <Icon sx={{ color: ORANGE }} />
                    </Box>
                    <Typography sx={{ color: NAVY, fontWeight: 900, mb: 0.75 }}>{card.title}</Typography>
                    <Typography variant="body2" sx={{ color: "#64748B", lineHeight: 1.55 }}>{card.description}</Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Paper>

        <Paper id="start-here" elevation={0} sx={{ p: { xs: 2, md: 3 }, border: `1px solid ${BORDER}`, borderRadius: 3, scrollMarginTop: 24 }}>
          <SectionHeader
            eyebrow="Start Here"
            title="Full workflow in one simple flow"
            description="Application Required events move users from application to review, then to attendee status and post-acceptance forms."
          />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "stretch" }}>
            {["User Applies", "Admin Reviews", "Accept with Tier", "Create Attendee", "Free = Confirmed", "Paid = Payment Pending", "Forms Trigger"].map((step, index) => (
              <Paper
                key={step}
                elevation={0}
                sx={{
                  flex: "1 1 135px",
                  minWidth: 135,
                  p: 1.75,
                  borderRadius: 3,
                  border: `1px solid ${BORDER}`,
                  bgcolor: index === 6 ? "rgba(10,147,150,0.08)" : SOFT_BG,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                  <Chip size="small" label={`Step ${index + 1}`} sx={{ height: 22, color: ORANGE, bgcolor: "rgba(232,83,47,0.10)", fontWeight: 900 }} />
                  {index < 6 && <RouteRoundedIcon sx={{ color: "#CBD5E1", fontSize: 18 }} />}
                </Stack>
                <Typography sx={{ color: NAVY, fontWeight: 900, lineHeight: 1.35 }}>{step}</Typography>
              </Paper>
            ))}
          </Box>
          <Alert severity="info" sx={{ mt: 2.5, borderRadius: 2 }}>
            Post-acceptance forms are created only after the correct attendee origin becomes <strong>Confirmed</strong>.
          </Alert>
        </Paper>

        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, border: `1px solid ${BORDER}`, borderRadius: 3 }}>
          <GuideAccordion id="application-tracks" title="Application Tracks" defaultExpanded>
            <Typography variant="body2" sx={{ color: TEXT, mb: 2, lineHeight: 1.65 }}>
              A track is the category a user applies for. Example: Participant, Speaker, Sponsor Staff, Start-up, Investor, or Researcher.
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 1.5 }}>
              {[
                ["Track", "What the user applies for"],
                ["Mode", "How the user applies"],
                ["Tier", "Price/payment outcome"],
                ["Role", "What user becomes after acceptance"],
              ].map(([title, body]) => (
                <Paper key={title} elevation={0} sx={{ p: 2, bgcolor: SOFT_BG, borderRadius: 2 }}>
                  <Typography sx={{ color: NAVY, fontWeight: 900 }}>{title}</Typography>
                  <Typography variant="body2" sx={{ color: "#64748B" }}>{body}</Typography>
                </Paper>
              ))}
            </Box>
          </GuideAccordion>

          <GuideAccordion id="review-queue" title="Review Queue">
            <Typography variant="body2" sx={{ color: TEXT, mb: 1.5, lineHeight: 1.65 }}>
              The Review Queue is where event creators check submitted applications and decide the outcome.
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">• <strong>Accept</strong>: creates or updates the attendee record and applies the selected tier.</Typography>
              <Typography variant="body2">• <strong>Decline</strong>: no registration is created and no post-acceptance form is sent.</Typography>
              <Typography variant="body2">• <strong>Waitlist</strong>: keeps the application pending for later decision. No confirmed registration is created.</Typography>
            </Stack>
          </GuideAccordion>

          <GuideAccordion id="pricing-tiers" title="Pricing Tiers" defaultExpanded>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <Alert icon={<PaymentsRoundedIcon />} severity="success" sx={{ borderRadius: 2 }}>
                <strong>Tier price = 0</strong><br />User becomes Confirmed immediately after admin accepts.
              </Alert>
              <Alert icon={<WarningAmberRoundedIcon />} severity="warning" sx={{ borderRadius: 2 }}>
                <strong>Tier price &gt; 0</strong><br />User becomes Payment Pending. Admin must mark paid to confirm.
              </Alert>
            </Box>
            <Typography variant="body2" sx={{ color: TEXT, mt: 2, lineHeight: 1.65 }}>
              For paid tiers, Participant Information and Promotional Profile should not be triggered until the specific paid origin is marked as paid and becomes Confirmed.
            </Typography>
          </GuideAccordion>

          <GuideAccordion id="pre-approval" title="Pre-Approval Codes and Email Allowlist">
            <Typography variant="body2" sx={{ color: TEXT, mb: 1.5, lineHeight: 1.65 }}>
              Pre-approval is useful for invite-only or already confirmed users. Codes and allowlist records are scoped to a specific event, track, and submission mode.
            </Typography>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Example: a Speaker + Confirmed code should not work for Participant or Speaker Self Nomination unless you create another code for that exact scope.
            </Alert>
          </GuideAccordion>

          <GuideAccordion id="forms" title="Post-Acceptance Forms" defaultExpanded>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <Paper id="participant-information" elevation={0} sx={{ p: 2, bgcolor: SOFT_BG, borderRadius: 2, scrollMarginTop: 24 }}>
                <Typography sx={{ color: NAVY, fontWeight: 900, mb: 0.75 }}>Participant Information</Typography>
                <Typography variant="body2" sx={{ color: "#64748B", lineHeight: 1.65 }}>
                  Used for logistics such as accessibility, dietary needs, emergency contact, travel information, and consent. It is for confirmed in-person or hybrid attendees.
                </Typography>
              </Paper>
              <Paper id="promotional-profiles" elevation={0} sx={{ p: 2, bgcolor: SOFT_BG, borderRadius: 2, scrollMarginTop: 24 }}>
                <Typography sx={{ color: NAVY, fontWeight: 900, mb: 0.75 }}>Promotional Profile</Typography>
                <Typography variant="body2" sx={{ color: "#64748B", lineHeight: 1.65 }}>
                  Used for public-facing profile content such as speaker bio, headshot, talk title, sponsor logo, start-up pitch, or investor display details.
                </Typography>
              </Paper>
            </Box>
          </GuideAccordion>
        </Paper>

        <Paper id="trigger-matrix" elevation={0} sx={{ p: { xs: 2, md: 3 }, border: `1px solid ${BORDER}`, borderRadius: 3, scrollMarginTop: 24 }}>
          <SectionHeader
            eyebrow="Rules"
            title="Expected Form Trigger Matrix"
            description="Use this table when an admin asks why a form was or was not created."
          />
          <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${BORDER}`, borderRadius: 3, overflowX: "auto" }}>
            <Table size="small" sx={{ minWidth: 760 }}>
              <TableHead sx={{ bgcolor: SOFT_BG }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, color: NAVY }}>Event Format</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: NAVY }}>Accepted Role</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: NAVY }}>Participant Information</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: NAVY }}>Promotional Profile</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {triggerMatrix.map((row) => (
                  <TableRow key={`${row.format}-${row.role}`}>
                    <TableCell>{row.format}</TableCell>
                    <TableCell>{row.role}</TableCell>
                    <TableCell><StatusPill value={row.participantInfo} /></TableCell>
                    <TableCell><StatusPill value={row.promotionalProfile} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper id="common-scenarios" elevation={0} sx={{ p: { xs: 2, md: 3 }, border: `1px solid ${BORDER}`, borderRadius: 3, scrollMarginTop: 24 }}>
          <SectionHeader
            eyebrow="Examples"
            title="Common Scenarios"
            description="These examples help admins verify that their event setup gives the expected result."
          />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            {commonScenarios.map((item) => (
              <Paper key={item.title} elevation={0} sx={{ p: 2, bgcolor: SOFT_BG, borderRadius: 3, border: `1px solid ${BORDER}` }}>
                <Typography sx={{ color: NAVY, fontWeight: 900, mb: 1 }}>{item.title}</Typography>
                <Typography variant="caption" sx={{ display: "block", color: ORANGE, fontWeight: 900, mb: 0.75 }}>Setup</Typography>
                <Typography variant="body2" sx={{ color: TEXT, mb: 1.25, lineHeight: 1.6 }}>{item.setup}</Typography>
                <Divider sx={{ mb: 1.25 }} />
                <Typography variant="caption" sx={{ display: "block", color: TEAL, fontWeight: 900, mb: 0.75 }}>Expected Result</Typography>
                <Typography variant="body2" sx={{ color: TEXT, lineHeight: 1.6 }}>{item.result}</Typography>
              </Paper>
            ))}
          </Box>
        </Paper>

        <Paper id="troubleshooting" elevation={0} sx={{ p: { xs: 2, md: 3 }, border: `1px solid ${BORDER}`, borderRadius: 3, scrollMarginTop: 24 }}>
          <SectionHeader
            eyebrow="Troubleshooting"
            title="Common admin questions"
            description="Use this section when something looks missing or incorrect."
          />
          {troubleshootingItems.map((item, index) => (
            <Accordion key={item.question} disableGutters defaultExpanded={index === 0} sx={{ boxShadow: "none", border: `1px solid ${BORDER}`, mb: 1, borderRadius: "12px !important", overflow: "hidden", "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <HelpOutlineRoundedIcon sx={{ color: ORANGE }} fontSize="small" />
                  <Typography sx={{ fontWeight: 900, color: NAVY }}>{item.question}</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" sx={{ color: TEXT, lineHeight: 1.65 }}>{item.answer}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>

        <Paper id="testing-checklist" elevation={0} sx={{ p: { xs: 2, md: 3 }, border: `1px solid ${BORDER}`, borderRadius: 3, scrollMarginTop: 24 }}>
          <SectionHeader
            eyebrow="Checklist"
            title="Setup checklist before testing"
            description="Run through these checks before asking a normal user to apply."
          />
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.25 }}>
            {setupChecklist.map((item, index) => (
              <Stack key={item} direction="row" spacing={1.25} alignItems="flex-start" sx={{ p: 1.5, bgcolor: SOFT_BG, borderRadius: 2 }}>
                <Chip label={index + 1} size="small" sx={{ bgcolor: "rgba(10,147,150,0.12)", color: TEAL, fontWeight: 900 }} />
                <Typography variant="body2" sx={{ color: TEXT, lineHeight: 1.55 }}>{item}</Typography>
              </Stack>
            ))}
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}
