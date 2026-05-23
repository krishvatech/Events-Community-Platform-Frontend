import React from 'react';

/**
 * EventManageLayout - Layout wrapper for event management pages.
 *
 * When EventManageApplications is rendered as a standalone route, this provides
 * the surrounding layout. When rendered inside EventManagePage as a tab, this
 * acts as a simple passthrough so it doesn't double-wrap the UI.
 */
const EventManageLayout = ({ children }) => {
  return <>{children}</>;
};

export default EventManageLayout;
