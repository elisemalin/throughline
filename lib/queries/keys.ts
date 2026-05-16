// Canonical query keys. Kept in one file so invalidation in mutations
// stays in sync with the queries that produced the cached data. Names
// mirror the /contracts/api.ts API_ROUTES entries.

export const QK = {
  applications: ['applications'] as const,
  applicationEvents: (id: string) => ['applications', id, 'events'] as const,
  documents: ['documents'] as const,
  skills: ['skills'] as const,
  watchlist: ['watchlist'] as const,
  discovery: ['discovery'] as const,
};
