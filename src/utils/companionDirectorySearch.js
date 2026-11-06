// The same fields the companion-directory API searches. badge_label is included
// so searching "accepted" still finds accepted applications with no visible chip.
const SEARCH_FIELDS = ['display_name', 'job_title', 'company', 'badge_label'];

export const filterCompanionParticipants = (participants, query) => {
  const needle = (query || '').trim().toLowerCase();
  if (!needle) return participants;

  return participants.filter((participant) =>
    SEARCH_FIELDS.some((field) =>
      String(participant?.[field] ?? '').toLowerCase().includes(needle)
    )
  );
};
