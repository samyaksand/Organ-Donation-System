/** Centralised TanStack Query keys so invalidation stays consistent across features. */
export const queryKeys = {
  session: ['session'] as const,
  donor: {
    all: ['donor'] as const,
    profile: ['donor', 'profile'] as const,
    dashboard: ['donor', 'dashboard'] as const,
    organs: ['donor', 'organs'] as const,
    withdrawals: ['donor', 'withdrawals'] as const,
  },
  organs: {
    all: ['organs'] as const,
    availability: (params: object) => ['organs', 'availability', params] as const,
    summary: ['organs', 'summary'] as const,
    admin: (params: object) => ['organs', 'admin', params] as const,
  },
  hospitals: {
    all: ['hospitals'] as const,
    list: (params: object) => ['hospitals', 'list', params] as const,
    options: ['hospitals', 'options'] as const,
    cities: ['hospitals', 'cities'] as const,
  },
  admin: {
    all: ['admin'] as const,
    overview: ['admin', 'overview'] as const,
    donors: (params: object) => ['admin', 'donors', params] as const,
    donor: (id: string) => ['admin', 'donor', id] as const,
    withdrawals: (params: object) => ['admin', 'withdrawals', params] as const,
  },
  recovery: {
    status: ['recovery', 'status'] as const,
  },
};
