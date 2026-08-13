/**
 * API base URL and endpoint constants.
 *
 * `VITE_API_URL` is read at BUILD time — Vite inlines `import.meta.env` into the bundle
 * rather than reading it at runtime. This matters for the Azure Static Web Apps
 * deployment: the variable must be present in the GitHub Actions workflow environment,
 * not only in the portal, or the built bundle calls localhost in production. It is the
 * single most common way this deployment goes wrong (Phase 8 runbook).
 */
export const API_BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080';

/** Paths carry the /v1 segment: routesCreator mounts /api and every route is versioned. */
export const ApiRoutes = {
	login: '/api/v1/auth/login',
	logout: '/api/v1/auth/logout',
	me: '/api/v1/auth/me',

	query: '/api/v1/query',
	queryHistory: '/api/v1/query/history',
	queryExamples: '/api/v1/query/examples',

	headlineMetrics: '/api/v1/metrics/headline',
	trendMetrics: '/api/v1/metrics/trend',
	schema: '/api/v1/metrics/schema',

	health: '/api/health'
} as const;

/** The token lives in sessionStorage, never localStorage. */
export const SESSION_KEY = 'ACTIVE_USER';
