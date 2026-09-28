import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import ContactsRoundedIcon from "@mui/icons-material/ContactsRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import FlagRoundedIcon from "@mui/icons-material/FlagRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import ManageSearchRoundedIcon from "@mui/icons-material/ManageSearchRounded";
import SegmentRoundedIcon from "@mui/icons-material/SegmentRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import ViewModuleRoundedIcon from "@mui/icons-material/ViewModuleRounded";

export const MARKETING_HOME_PATH = "/admin/newsletter";
export const MARKETING_AUDIT_PATH = "/admin/marketing/activity";
// Segment/list newsletter emails (ECP NewsletterCampaign). Distinct from
// automation campaigns, which live under `${MARKETING_HOME_PATH}/campaigns`.
export const MARKETING_BROADCASTS_PATH = `${MARKETING_HOME_PATH}/broadcasts`;
export const MARKETING_BROADCAST_NEW_PATH = `${MARKETING_HOME_PATH}/new`;
export const CONNECT_HOME_PATH = "/community?view=home";

export const marketingNavigationGroups = [
  {
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        path: MARKETING_HOME_PATH,
        icon: InsightsRoundedIcon,
        exact: true,
        match: [MARKETING_HOME_PATH],
      },
    ],
  },
  {
    label: "Campaigns",
    items: [
      {
        id: "campaigns",
        label: "Automation Campaigns",
        path: `${MARKETING_HOME_PATH}/campaigns`,
        icon: AccountTreeRoundedIcon,
        match: [`${MARKETING_HOME_PATH}/campaigns`, `${MARKETING_HOME_PATH}/builder`],
      },
      {
        id: "broadcasts",
        label: "Email Broadcasts",
        path: MARKETING_BROADCASTS_PATH,
        icon: EmailRoundedIcon,
        match: [MARKETING_BROADCASTS_PATH, MARKETING_BROADCAST_NEW_PATH],
      },
      {
        id: "templates",
        label: "Templates",
        path: `${MARKETING_HOME_PATH}/templates`,
        icon: ViewModuleRoundedIcon,
        match: [`${MARKETING_HOME_PATH}/templates`],
      },
    ],
  },
  {
    label: "Audience",
    items: [
      {
        id: "contacts",
        label: "Contacts",
        path: `${MARKETING_HOME_PATH}/contacts`,
        icon: ContactsRoundedIcon,
        match: [`${MARKETING_HOME_PATH}/contacts`],
      },
      {
        id: "companies",
        label: "Companies",
        path: `${MARKETING_HOME_PATH}/companies`,
        icon: ApartmentRoundedIcon,
        match: [`${MARKETING_HOME_PATH}/companies`],
      },
      {
        id: "lists",
        label: "Subscription Lists",
        path: `${MARKETING_HOME_PATH}/lists`,
        icon: ListAltRoundedIcon,
        match: [`${MARKETING_HOME_PATH}/lists`],
      },
      {
        id: "segments",
        label: "Segments",
        path: `${MARKETING_HOME_PATH}/segments`,
        icon: SegmentRoundedIcon,
        match: [`${MARKETING_HOME_PATH}/segments`],
      },
    ],
  },
  {
    label: "Automation",
    items: [
      {
        id: "stages",
        label: "Stages",
        path: `${MARKETING_HOME_PATH}/stages`,
        icon: FlagRoundedIcon,
        match: [`${MARKETING_HOME_PATH}/stages`],
      },
      {
        id: "points",
        label: "Points",
        path: `${MARKETING_HOME_PATH}/points`,
        icon: StarsRoundedIcon,
        match: [`${MARKETING_HOME_PATH}/points`],
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        id: "analytics",
        label: "Analytics",
        path: `${MARKETING_HOME_PATH}/analytics`,
        icon: AnalyticsRoundedIcon,
        match: [`${MARKETING_HOME_PATH}/analytics`],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        id: "activity",
        label: "Audit & Activity",
        path: MARKETING_AUDIT_PATH,
        icon: ManageSearchRoundedIcon,
        match: [MARKETING_AUDIT_PATH],
      },
      {
        id: "settings",
        label: "Settings",
        path: `${MARKETING_HOME_PATH}/settings`,
        icon: SettingsRoundedIcon,
        match: [`${MARKETING_HOME_PATH}/settings`],
      },
    ],
  },
];

export const marketingNavigationItems = marketingNavigationGroups.flatMap((group) => group.items);

export function isMarketingHubPath(pathname = "") {
  return pathname === MARKETING_HOME_PATH ||
    pathname.startsWith(`${MARKETING_HOME_PATH}/`) ||
    pathname === MARKETING_AUDIT_PATH ||
    pathname.startsWith(`${MARKETING_AUDIT_PATH}/`);
}

export function getMarketingSectionFromPath(pathname = "") {
  const normalized = pathname.replace(/\/+$/, "") || MARKETING_HOME_PATH;
  if (normalized === MARKETING_AUDIT_PATH) return "activity";
  if (normalized === MARKETING_HOME_PATH) return "dashboard";
  // The campaign builder belongs to automation campaigns; the broadcast
  // composer at /new belongs to email broadcasts.
  if (normalized.startsWith(`${MARKETING_HOME_PATH}/builder`)) return "campaigns";
  if (normalized.startsWith(MARKETING_BROADCAST_NEW_PATH)) return "broadcasts";

  const directMatch = marketingNavigationItems
    .filter((item) => item.id !== "dashboard")
    .find((item) => item.match?.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)));

  // The only unmatched path left under the hub is /admin/newsletter/:uuid,
  // which is a single broadcast.
  return directMatch?.id || "broadcasts";
}

export function isMarketingNavItemActive(item, pathname = "") {
  const normalized = pathname.replace(/\/+$/, "") || MARKETING_HOME_PATH;
  return item.match?.some((prefix) => (
    item.exact ? normalized === prefix : normalized === prefix || normalized.startsWith(`${prefix}/`)
  )) || false;
}
