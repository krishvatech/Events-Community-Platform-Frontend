import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Box, CircularProgress, Alert } from "@mui/material";
import { init } from "@templatical/editor";
import "@templatical/editor/style.css";

const STARTER_VERSION = 5;
const EMAIL_GREEN = "#28a745";
const EMAIL_TEAL = "#10b8a6";
const EMAIL_BLUE = "#007bff";
const EMAIL_DARK = "#2c3e50";
const EMAIL_TEXT = "#333333";
const EMAIL_MUTED = "#6c757d";
const EMAIL_PANEL = "#f8f9fa";
const EMAIL_INFO = "#f0f7ff";

const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tpl-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const spacing = (top = 10, right = 10, bottom = 10, left = 10) => ({
  top,
  right,
  bottom,
  left,
});

const baseStyles = (padding = spacing(), margin = spacing(0, 0, 0, 0)) => ({
  padding,
  margin,
});

const mergeTagHtml = (template, fallbackTag, fallbackLabel) => {
  const tag = (template?.merge_tags || []).find((item) => item.tag === fallbackTag || item.value === fallbackTag);
  const value = tag?.value || tag?.tag || fallbackTag;
  const label = tag?.label || fallbackLabel || value.replace(/[{}]/g, "").trim();
  return `<span data-merge-tag="${value}">${label}</span>`;
};

const findTag = (template, names) => {
  const wanted = names.map((name) => name.toLowerCase());
  return (template?.merge_tags || []).find((tag) => {
    const label = String(tag.label || "").toLowerCase();
    const value = String(tag.value || tag.tag || "").toLowerCase();
    return wanted.some((name) => label.includes(name) || value.includes(name.replace(/\s+/g, "_")));
  });
};

const tagForPlaceholder = (template, placeholder) => {
  const tag = (template?.merge_tags || []).find((item) => item.tag === placeholder || item.value === placeholder);
  return mergeTagHtml(template, placeholder, tag?.label);
};

const requiredLine = (template) => {
  const required = template?.required_placeholders || [];
  const handled = new Set(["{{ first_name }}", "{{ app_name }}", "{{ support_email }}"]);
  const remaining = required.filter((placeholder) => !handled.has(placeholder));
  if (!remaining.length) return "";
  return remaining
    .map((placeholder) => {
      const tag = (template?.merge_tags || []).find((item) => item.tag === placeholder || item.value === placeholder);
      const label = tag?.label || placeholder.replace(/[{}]/g, "").trim().replace(/_/g, " ");
      return `${label}: ${tagForPlaceholder(template, placeholder)}`;
    })
    .join("<br>");
};

const createTitleBlock = (content, options = {}) => ({
  id: makeId(),
  type: "title",
  content,
  level: options.level || 1,
  color: options.color || EMAIL_DARK,
  textAlign: "left",
  fontFamily: "Arial",
  styles: baseStyles(options.padding || spacing(16, 24, 8, 24)),
});

const createParagraphBlock = (content, padding = spacing(6, 24, 6, 24)) => ({
  id: makeId(),
  type: "paragraph",
  content,
  styles: baseStyles(padding),
});

const createListBlock = (items) =>
  createParagraphBlock(`<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`);

const createButtonBlock = (text, url, backgroundColor = EMAIL_BLUE) => ({
  id: makeId(),
  type: "button",
  text,
  url,
  openInNewTab: false,
  backgroundColor,
  textColor: "#ffffff",
  borderRadius: 5,
  fontSize: 14,
  buttonPadding: spacing(14, 28, 14, 28),
  fontFamily: "Arial",
  styles: baseStyles(spacing(18, 24, 18, 24)),
});

const createDividerBlock = () => ({
  id: makeId(),
  type: "divider",
  lineStyle: "solid",
  color: "#e5e7eb",
  thickness: 1,
  width: "full",
  styles: baseStyles(spacing(12, 24, 12, 24)),
});

const createFooterBlock = (template) => {
  const appName = mergeTagHtml(template, "{{ app_name }}", "App Name");
  const supportEmail = mergeTagHtml(template, "{{ support_email }}", "Support Email");
  return createParagraphBlock(
    `<span style="color:#6b7280;font-size:13px;">Questions? Contact us at ${supportEmail}.</span><br>` +
      `<span style="color:#9ca3af;font-size:12px;">${appName} © 2026 | All rights reserved</span>`
  );
};

const createEventDetailsBlocks = (template) => {
  const eventTitle = mergeTagHtml(template, "{{ event_title }}", "Event Title");
  const eventDate = mergeTagHtml(template, "{{ event_date_str }}", "Event Date");
  const eventStart = mergeTagHtml(template, "{{ event_start_str }}", "Event Start Time");
  const eventEnd = mergeTagHtml(template, "{{ event_end_str }}", "Event End Time");
  const eventTimezone = mergeTagHtml(template, "{{ event_timezone }}", "Event Timezone");

  return [
    createParagraphBlock(
      `<div style="background-color:#ffffff;border-left:4px solid ${EMAIL_GREEN};padding:20px;border-radius:5px;">` +
        `<h2 style="margin:0 0 14px 0;color:${EMAIL_DARK};font-size:22px;line-height:1.3;">${eventTitle}</h2>` +
        `<p style="margin:5px 0;color:${EMAIL_TEXT};"><strong>Date:</strong> ${eventDate}</p>` +
        `<p style="margin:5px 0;color:${EMAIL_TEXT};"><strong>Time:</strong> ${eventStart} - ${eventEnd}</p>` +
        `<p style="margin:5px 0;color:${EMAIL_TEXT};"><strong>Timezone:</strong> ${eventTimezone}</p>` +
      `</div>`,
      spacing(14, 24, 14, 24)
    ),
  ];
};

const createInfoPanelBlock = (title, items, titleColor = EMAIL_GREEN) =>
  createParagraphBlock(
    `<div style="background-color:${EMAIL_INFO};padding:20px;border-radius:5px;">` +
      `<h3 style="margin:0 0 10px 0;color:${titleColor};font-size:17px;">${title}</h3>` +
      `<ul style="margin:10px 0;padding-left:20px;color:${EMAIL_TEXT};">` +
        items.map((item) => `<li>${item}</li>`).join("") +
      `</ul>` +
    `</div>`,
    spacing(14, 24, 14, 24)
  );

const createPanelBlock = ({ title, body, background = "#ffffff", border = "#dee2e6", titleColor = EMAIL_DARK }) =>
  createParagraphBlock(
    `<div style="background-color:${background};border:1px solid ${border};padding:20px;border-radius:5px;">` +
      `<h3 style="margin:0 0 10px 0;color:${titleColor};font-size:17px;">${title}</h3>` +
      body +
    `</div>`,
    spacing(14, 24, 14, 24)
  );

const createAccentPanelBlock = ({ title, body, color, background }) =>
  createParagraphBlock(
    `<div style="background-color:${background};border-left:4px solid ${color};padding:20px;border-radius:5px;">` +
      `<h3 style="margin:0 0 10px 0;color:${color};font-size:17px;">${title}</h3>` +
      `<p style="margin:5px 0;color:${EMAIL_TEXT};">${body}</p>` +
    `</div>`,
    spacing(14, 24, 14, 24)
  );

const createStarterVisualContent = (template) => {
  const firstName = mergeTagHtml(template, "{{ first_name }}", "First Name");
  const guestName = mergeTagHtml(template, "{{ guest_name }}", "Guest Name");
  const applicantName = mergeTagHtml(template, "{{ applicant_name }}", "Applicant Name");
  const appName = mergeTagHtml(template, "{{ app_name }}", "App Name");
  const eventTitle = mergeTagHtml(template, "{{ event_title }}", "Event Title");
  const role = mergeTagHtml(template, "{{ role }}", "Role");
  const changedAt = mergeTagHtml(template, "{{ changed_at }}", "Changed At");
  const temporaryPassword = mergeTagHtml(template, "{{ temporary_password }}", "Temporary Password");
  const otpCode = mergeTagHtml(template, "{{ otp_code }}", "OTP Code");
  const groupName = mergeTagHtml(template, "{{ group_name }}", "Group Name");
  const inviterName = mergeTagHtml(template, "{{ inviter_name }}", "Inviter Name");
  const requesterName = mergeTagHtml(template, "{{ requester_name }}", "Requester Name");
  const otherPartyName = mergeTagHtml(template, "{{ other_party_name }}", "Other Party Name");
  const meetingTime = mergeTagHtml(template, "{{ meeting_time }}", "Meeting Time");
  const reminderMinutes = mergeTagHtml(template, "{{ reminder_minutes }}", "Reminder Minutes");
  const answerText = mergeTagHtml(template, "{{ answer_text }}", "Answer Text");
  const questionText = mergeTagHtml(template, "{{ question_text }}", "Question Text");
  const newName = mergeTagHtml(template, "{{ new_name }}", "New Name");
  const userEmail = mergeTagHtml(template, "{{ user_email }}", "User Email");
  const requestId = mergeTagHtml(template, "{{ request_id }}", "Request ID");
  const supportEmail = mergeTagHtml(template, "{{ support_email }}", "Support Email");
  const primaryUrl = findTag(template, ["forgot password", "join link", "event url", "invite url", "replay url", "login url", "signup url", "companion url"]);
  const urlValue = primaryUrl?.value || primaryUrl?.tag || "#";
  const requiredValues = new Set(template?.required_placeholders || []);
  const key = template?.template_key || "";
  const title = template?.label || "Email update";
  const extraRequiredLine = requiredLine(template);

  let heading = title;
  let headingColor = EMAIL_DARK;
  let greetingName = firstName;
  let intro = `Here is an update from ${appName}.`;
  let buttonLabel = primaryUrl?.label || "Open Link";
  let buttonColor = EMAIL_BLUE;
  let blocks = [];

  if (key === "welcome") {
    heading = `Welcome, ${firstName}`;
    headingColor = EMAIL_DARK;
    intro = `Welcome to ${appName}. We're glad you're here.`;
  } else if (key === "password_changed") {
    heading = "Password changed";
    headingColor = EMAIL_DARK;
    intro = `This is a security alert. Your ${appName} password was changed on ${changedAt}.`;
    buttonLabel = "Reset password";
    buttonColor = "#dc3545";
  } else if (key.includes("credentials")) {
    heading = title;
    intro = `Your ${appName} account credentials are ready.<br><strong>Temporary password:</strong> ${temporaryPassword}`;
    buttonLabel = "Sign in";
  } else if (key === "event_confirmation") {
    heading = "You're Confirmed!";
    headingColor = EMAIL_GREEN;
    intro = `Great news! You're confirmed as <strong>${role}</strong> for:`;
    buttonLabel = "View Event Page";
    buttonColor = EMAIL_GREEN;
  } else if (key === "user_registration_acknowledgement") {
    heading = "You're Registered!";
    headingColor = EMAIL_GREEN;
    intro = `Thank you for registering for:`;
    buttonLabel = "View Event Details";
    buttonColor = EMAIL_GREEN;
  } else if (key === "guest_registration_acknowledgement") {
    heading = "You're Registered!";
    headingColor = EMAIL_GREEN;
    greetingName = guestName;
    intro = `Thank you for registering for:`;
    buttonLabel = "View Event Details";
    buttonColor = EMAIL_GREEN;
  } else if (key === "application_acknowledgement") {
    heading = "Application received";
    greetingName = applicantName;
    intro = `Thank you for applying for:`;
    buttonLabel = "View Event Details";
  } else if (key === "application_approved") {
    heading = "Congratulations!";
    headingColor = EMAIL_GREEN;
    greetingName = applicantName;
    intro = `Great news! Your application has been <strong>approved</strong> for:`;
    buttonLabel = "View Event";
    buttonColor = EMAIL_GREEN;
  } else if (key === "application_declined") {
    heading = "Application update";
    greetingName = applicantName;
    intro = `Thank you for applying for ${eventTitle}. We have an update about your application.`;
  } else if (key === "event_cancelled") {
    heading = "Event cancelled";
    headingColor = "#dc3545";
    intro = `${eventTitle} has been cancelled.`;
    buttonLabel = "View Event Details";
  } else if (key === "event_invite") {
    heading = "You're invited!";
    greetingName = inviterName;
    intro = `${inviterName} invited you to join ${eventTitle} on ${appName}.`;
    buttonLabel = "Accept invitation";
  } else if (key === "event_starting_soon") {
    heading = "Starting soon";
    intro = `${eventTitle} starts in 1 hour.`;
    buttonLabel = "Join Event";
  } else if (key === "event_join_confirmation") {
    heading = "✅ You're Now Attending!";
    headingColor = EMAIL_TEAL;
    intro = `Thank you for joining <strong>${eventTitle}</strong>! We're excited to have you here. Your participation and engagement make our community stronger.`;
    buttonLabel = "View Event Details";
    buttonColor = EMAIL_TEAL;
  } else if (requiredValues.has("{{ event_title }}")) {
    heading = `${eventTitle}`;
    intro = `Here is an update for ${eventTitle}.`;
  } else if (requiredValues.has("{{ otp_code }}")) {
    heading = "Verification code";
    greetingName = guestName;
    intro = `Use this verification code to continue:<br><strong style="font-size:28px;letter-spacing:4px;">${otpCode}</strong>`;
  } else if (key === "group_invite") {
    heading = "Group invitation";
    greetingName = inviterName;
    intro = `${inviterName} invited you to join <strong>${groupName}</strong> on ${appName}.`;
    buttonLabel = "Join Group";
  } else if (key.includes("networking_meeting")) {
    heading = title;
    intro = `Meeting update for ${eventTitle}.<br><strong>Person:</strong> ${requesterName || otherPartyName}<br><strong>Time:</strong> ${meetingTime}`;
    if (key.includes("reminder")) {
      intro = `Reminder: your meeting with ${otherPartyName} starts in ${reminderMinutes} minutes.<br><strong>Time:</strong> ${meetingTime}`;
    }
    buttonLabel = "Open Networking";
  } else if (key === "post_event_qna_answer") {
    heading = "Your question was answered";
    intro = `<strong>Question:</strong> ${questionText}<br><strong>Answer:</strong> ${answerText}`;
  } else if (key.includes("name_change")) {
    heading = title;
    intro = `There is an update for name change request ${requestId}.<br><strong>User:</strong> ${userEmail}<br><strong>New name:</strong> ${newName}`;
  } else if (key.includes("kyc") || key.includes("name_change")) {
    heading = title;
    intro = `There is an update for your profile verification.`;
  }

  blocks = [
    createTitleBlock(heading, { color: headingColor }),
    createParagraphBlock(`Hello ${greetingName},`),
    createParagraphBlock(extraRequiredLine ? `${intro}<br>${extraRequiredLine}` : intro),
  ];

  if (
    [
      "event_confirmation",
      "event_cancelled",
      "event_starting_soon",
      "application_acknowledgement",
      "application_approved",
      "user_registration_acknowledgement",
      "guest_registration_acknowledgement",
    ].includes(key)
  ) {
    blocks.push(...createEventDetailsBlocks(template));
  }

  if (key === "event_confirmation") {
    blocks.push(
      createInfoPanelBlock("What You Can Do Now", [
        "Update your bio and photo",
        "View your profile on the event page",
        "Communicate with other speakers and attendees",
        "Access event materials and resources",
      ], EMAIL_DARK)
    );
  }

  if (key === "user_registration_acknowledgement" || key === "guest_registration_acknowledgement") {
    blocks.push(
      createParagraphBlock("Your registration is confirmed and you're all set to join. Here's what you need to know:"),
      createInfoPanelBlock("Ready to go:", [
        "✅ Your registration is confirmed",
        "✅ You're all set to join the event",
        "✅ Watch for event reminders and updates",
        "✅ Access event materials when it starts",
      ])
    );
  }

  if (key === "event_join_confirmation") {
    blocks.push(
      createAccentPanelBlock({
        title: "You're all set!",
        body: "Your live session connection has been confirmed. You can now enjoy the event and connect with other participants.",
        color: EMAIL_TEAL,
        background: "#e8f7f5",
      }),
      createPanelBlock({
        title: "During the Event",
        body:
          `<ul style="margin:10px 0;padding-left:20px;color:${EMAIL_TEXT};">` +
            "<li>Engage in discussions with other participants</li>" +
            "<li>Use the networking lounge to make connections</li>" +
            "<li>Ask questions in the Q&A session</li>" +
            "<li>Take notes on key insights shared</li>" +
          "</ul>",
      })
    );
  }

  if (primaryUrl) {
    blocks.push(createButtonBlock(buttonLabel, urlValue, buttonColor));
  }

  if (key === "event_join_confirmation") {
    blocks.push(
      createPanelBlock({
        title: "Feedback Welcome",
        body: `<p style="margin:5px 0;color:#004085;">We'd love to hear about your experience! After the event ends, you'll have the opportunity to share your feedback and help us improve.</p>`,
        background: "#f0f8ff",
        border: "#f0f8ff",
        titleColor: "#004085",
      })
    );
  }

  blocks.push(createDividerBlock(), createFooterBlock(template));

  return {
    blocks,
    settings: {
      width: 600,
      backgroundColor: EMAIL_PANEL,
      fontFamily: "Arial",
      locale: "en",
      templaticalTemplateKey: template?.template_key || "",
      templaticalStarterVersion: STARTER_VERSION,
    },
  };
};

const createLegacyHtmlContent = (template) => ({
  blocks: [
    {
      id: makeId(),
      type: "html",
      content:
        template?.html_body ||
        `<p>${String(template?.text_body || "Start editing this email template.").replace(/\n/g, "<br />")}</p>`,
      styles: {
        padding: { top: 10, right: 10, bottom: 10, left: 10 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      },
    },
  ],
  settings: {
    width: 600,
    backgroundColor: "#ffffff",
    fontFamily: "Arial",
    locale: "en",
  },
});

const parseBoolean = (value) => {
  if (value === true || value === false) return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

const resolveKnownDjangoBlocksForEditor = (html = "", editorContext = {}) => {
  let output = String(html || "");
  const isMultiDay = parseBoolean(editorContext?.is_multi_day);
  const templateKey = editorContext?.template_key || editorContext?.templateKey || "";

  // The visual editor cannot preserve Django control blocks. Because this editor
  // customizes a template for one event, resolve the known multi-day/single-day
  // branch before removing Django tags. This keeps the saved HTML identical to
  // what the recipient preview shows for that event.
  //
  // Keep this limited to the event reminder template so other templates with
  // nested Django conditions are not changed by this parser.
  if (templateKey === "event_starting_soon" && typeof isMultiDay === "boolean") {
    output = output.replace(
      /{%\s*if\s+is_multi_day\s*%}([\s\S]*?)(?:{%\s*else\s*%}([\s\S]*?))?{%\s*endif\s*%}/g,
      (_match, multiDayContent = "", singleDayContent = "") =>
        isMultiDay ? multiDayContent : singleDayContent
    );
  }

  return output;
};

const stripDjangoBlocks = (html = "", editorContext = {}) =>
  resolveKnownDjangoBlocksForEditor(html, editorContext)
    .replace(/{#.*?#}/gs, "")
    .replace(/{%\s*(?:if|elif|else|endif|for|endfor|with|endwith|block|endblock|extends|include)[^%]*%}/g, "");

const extractBodyMarkup = (html = "", editorContext = {}) => {
  if (typeof DOMParser === "undefined") return stripDjangoBlocks(html, editorContext);

  const cleaned = stripDjangoBlocks(html, editorContext);
  const parsed = new DOMParser().parseFromString(cleaned, "text/html");
  const body = parsed.body;
  const outerContainer = Array.from(body.children).find((child) => child.tagName?.toLowerCase() === "div");

  return outerContainer?.innerHTML || body.innerHTML || cleaned;
};

const createHtmlDerivedVisualContent = (template, editorContext = {}) => {
  if (!template?.html_body || typeof DOMParser === "undefined") return null;

  const markup = extractBodyMarkup(template.html_body, editorContext);
  const parsed = new DOMParser().parseFromString(`<div>${markup}</div>`, "text/html");
  const root = parsed.body.firstElementChild;
  const blocks = [];

  Array.from(root?.children || []).forEach((node) => {
    const tagName = node.tagName?.toLowerCase();
    const html = node.outerHTML;
    const inner = node.innerHTML;
    const link = node.querySelector?.("a[href]");
    const onlyButtonLink =
      tagName === "div" &&
      link &&
      node.textContent?.trim() === link.textContent?.trim() &&
      /text-align:\s*center/i.test(node.getAttribute("style") || "");

    if (tagName === "h1" || tagName === "h2" || tagName === "h3") {
      const colorMatch = (node.getAttribute("style") || "").match(/color:\s*([^;]+)/i);
      blocks.push(
        createTitleBlock(inner, {
          level: tagName === "h1" ? 1 : tagName === "h2" ? 2 : 3,
          color: colorMatch?.[1]?.trim() || EMAIL_DARK,
        })
      );
    } else if (tagName === "p") {
      blocks.push(createParagraphBlock(inner));
    } else if (tagName === "hr") {
      blocks.push(createDividerBlock());
    } else if (onlyButtonLink) {
      const backgroundMatch = (link.getAttribute("style") || "").match(/background-color:\s*([^;]+)/i);
      blocks.push(createButtonBlock(link.textContent?.trim() || "Open", link.getAttribute("href") || "#", backgroundMatch?.[1]?.trim() || EMAIL_BLUE));
    } else if (tagName === "ul" || tagName === "ol") {
      blocks.push(createParagraphBlock(html));
    } else if (html?.trim()) {
      blocks.push(createParagraphBlock(html, spacing(12, 24, 12, 24)));
    }
  });

  return {
    blocks: blocks.length ? blocks : createLegacyHtmlContent(template).blocks,
    settings: {
      width: 600,
      backgroundColor: EMAIL_PANEL,
      fontFamily: "Arial",
      locale: "en",
      templaticalTemplateKey: template.template_key || "",
      templaticalStarterVersion: STARTER_VERSION,
      templaticalSource: "html_template",
    },
  };
};

const getInitialContent = (template, editorContext = {}) => {
  if (template?.editor_json) {
    const savedTemplateKey = template.editor_json?.settings?.templaticalTemplateKey;
    const starterVersion = template.editor_json?.settings?.templaticalStarterVersion || 0;
    const source = template.editor_json?.settings?.templaticalSource;
    const serialized = JSON.stringify(template.editor_json || {});
    const hasRequiredTags = (template.required_placeholders || []).every((placeholder) =>
      serialized.includes(placeholder)
    );

    if (
      (!savedTemplateKey || savedTemplateKey === template.template_key) &&
      hasRequiredTags &&
      starterVersion >= STARTER_VERSION &&
      source === "html_template"
    ) {
      return template.editor_json;
    }
  }
  const htmlDerived = createHtmlDerivedVisualContent(template, editorContext);
  if (htmlDerived) return htmlDerived;
  if (template?.merge_tags?.length) return createStarterVisualContent(template);
  if (template?.html_body || template?.text_body) return createLegacyHtmlContent(template);
  return undefined;
};

const normalizeMergeTags = (template) => ({
  syntax: "liquid",
  tags: (template?.merge_tags || []).map((tag) => ({
    label: tag.label,
    value: tag.value || tag.tag,
  })),
});

const TemplaticalEmailEditor = forwardRef(function TemplaticalEmailEditor(
  { template, editorContext = {}, onContentChange, onReady },
  ref
) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const readyRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useImperativeHandle(ref, () => ({
    getContent: () => editorRef.current?.getContent() || null,
    toMjml: () => editorRef.current?.toMjml(),
  }));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const mountEditor = async () => {
      if (!containerRef.current) return;

      if (editorRef.current) {
        editorRef.current.unmount();
        editorRef.current = null;
      }

      try {
        readyRef.current = false;
        const editor = await init({
          container: containerRef.current,
          content: getInitialContent(template, editorContext),
          mergeTags: normalizeMergeTags(template),
          branding: false,
          uiTheme: "light",
          onChange(content) {
            onContentChange?.(content, { initial: !readyRef.current });
          },
        });

        if (cancelled) {
          editor.unmount();
          return;
        }

        editorRef.current = editor;
        onContentChange?.(editor.getContent(), { initial: true });
        onReady?.(editor.getContent());
        readyRef.current = true;
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load email editor.");
          setLoading(false);
        }
      }
    };

    mountEditor();

    return () => {
      cancelled = true;
      readyRef.current = false;
      if (editorRef.current) {
        editorRef.current.unmount();
        editorRef.current = null;
      }
    };
  }, [template?.template_key, editorContext?.is_multi_day]);

  return (
    <Box sx={{ position: "relative" }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && (
        <Box
          sx={{
            minHeight: 700,
            display: "grid",
            placeItems: "center",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            bgcolor: "background.paper",
          }}
        >
          <CircularProgress />
        </Box>
      )}
      <Box
        ref={containerRef}
        sx={{
          minHeight: 700,
          height: 700,
          display: loading ? "none" : "block",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: "background.paper",
        }}
      />
    </Box>
  );
});

export default TemplaticalEmailEditor;