import { SvgIcon } from "@mui/material";

/** DASHBOARD — slim chevron roof with subtle double line (outlined only) */
export const CustomDashboardIcon = (props) => (
  <SvgIcon
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path
      d="M3 12l2-2m0 0l7-7 7 7M6 7l7-7 7 7"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </SvgIcon>
);

/** EVENTS — your custom arrow icon (outlined only) */
export const CustomEventIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      d="M8 7h12m0 0l-4-4m4 4l-4 4m6-4h-4m0 0V4m0 6V7"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      style={{ vectorEffect: "non-scaling-stroke" }}
    />
  </SvgIcon>
);



export const CustomCommunityIcon = (props) => (
  <SvgIcon
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path
      d="M17 20h5v-2a2 2 0 00-2-2h-5a2 2 0 00-2 2v2zm0-7a2 2 0 012-2h5a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2v-5z"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </SvgIcon>
);


/** CUSTOM ICON — based on provided path */
export const CustomResourcesIcon = (props) => (
  <SvgIcon
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path
      d="M12 15v2m-6 4h12a2 2 0 002-2v-4a2 2 0 00-2-2H6a2 2 0 00-2 2v4a2 2 0 002 2zM8 3h8a2 2 0 012 2v1a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2z"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </SvgIcon>
);


/** CUSTOM DOTS/SHAPES ICON — based on provided path */
export const CustomSettingsIcon = (props) => (
  <SvgIcon
    {...props}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
  >
    <path
      d="M10.325 4.315c.552-3.361 5.522-3.361 6.074 0 .552 3.361-5.522 3.361-6.074 0zM1.325 11.315c.552-3.361 5.522-3.361 6.074 0 .552 3.361-5.522 3.361-6.074 0zM20.325 11.315c-.552-3.361-5.522-3.361-6.074 0-.552 3.361 5.522 3.361 6.074 0zM3.325 19.315c.552-3.361 5.522-3.361 6.074 0 .552-3.361-5.522 3.361-6.074 0zM10.325 19.315c-.552-3.361-5.522-3.361-6.074 0-.552 3.361 5.522 3.361 6.074 0zM17.325 19.315c-.552-3.361-5.522-3.361-6.074 0z"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </SvgIcon>
);

export const CustomDiscussionIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </SvgIcon>
);

export const CustomAccessIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      d="M11 3a1 1 0 100 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L15 6.414V11a1 1 0 102 0V6.414l1.293 1.293a1 1 0 101.414-1.414L19 3.586V3a1 1 0 10-2 0v2.586l-1.293-1.293a1 1 0 00-1.414 0L13 6.414V3a1 1 0 00-2 0V6.414l-1.293-1.293a1 1 0 00-1.414 0L7 6.414V3a1 1 0 10-2 0v2.586l-1.293-1.293A1 1 0 003 6.414V3a1 1 0 10-2 0v2.586l-1.293-1.293a1 1 0 00-1.414 0L3 6.414V3a1 1 0 10-2 0v2.586l-1.293-1.293a1 1 0 00-1.414 0L3 6.414V3a1 1 0 10-2 0v2.586l-1.293-1.293a1 1 0 00-1.414 0L3 6.414V3a1 1 0 10-2 0z"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </SvgIcon>
);

export const CustomProfile = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-6m7-7l-3.586-3.586a2 2 0 00-1.414-.586h-6a2 2 0 00-2 2v3.586a2 2 0 00.586 1.414L15 12h2a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2v-2"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </SvgIcon>
);

export const CustomRegisterIcon = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      d="M3 8l7-5 7 5M3 12l7-5 7 5m-7 5a4 4 0 01-8 0v-1a4 4 0 108 0v1z"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </SvgIcon>
);