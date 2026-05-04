/**
 * Utility functions for handling series and event display logic
 */

/**
 * Filter events based on series registration mode
 * Returns:
 * - series: Array of series to display (full_series_only)
 * - events: Array of events to display individually
 */
export const filterEventsBySeriesMode = (events) => {
  const seriesToDisplay = new Set();
  const eventsToDisplay = [];

  // Separate events by their series registration mode
  events.forEach((event) => {
    // Events without series always display individually
    if (!event.series) {
      eventsToDisplay.push(event);
      return;
    }

    // If we already marked this series for display, skip this event
    if (seriesToDisplay.has(event.series)) {
      return;
    }

    // For now, add events (we'll filter by series mode after fetching series data)
    // This is a placeholder - the actual filtering happens in the component
    eventsToDisplay.push(event);
  });

  return { seriesToDisplay: Array.from(seriesToDisplay), eventsToDisplay };
};

/**
 * Determine if an event should be displayed individually
 * based on its series registration mode
 */
export const shouldDisplayEventIndividually = (event, series) => {
  // No series = display individually
  if (!series) return true;

  // full_series_only = DON'T display individually (show series instead)
  if (series.registration_mode === 'full_series_only') return false;

  // per_session_only and both = display individually
  return true;
};

/**
 * Group events by their series
 */
export const groupEventsBySeries = (events) => {
  const grouped = {};
  const noSeries = [];

  events.forEach((event) => {
    if (event.series) {
      if (!grouped[event.series]) {
        grouped[event.series] = [];
      }
      grouped[event.series].push(event);
    } else {
      noSeries.push(event);
    }
  });

  return { grouped, noSeries };
};

/**
 * Get unique series IDs from events
 */
export const getUniqueSeries = (events) => {
  const seriesIds = new Set();
  events.forEach((event) => {
    if (event.series) {
      seriesIds.add(event.series);
    }
  });
  return Array.from(seriesIds);
};
