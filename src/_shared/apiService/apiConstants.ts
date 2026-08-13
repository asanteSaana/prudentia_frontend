/**
 * Where the API lives, and what lives on it.
 *
 * Ported from `ghcardverification_frontend/src/_shared/apiService/apiConstants.ts` so the
 * two front ends resolve their backend the same way.
 *
 * ── Why the base URL is chosen at RUNTIME, not baked in at build time ────────
 *
 * The previous version read `VITE_API_URL` and nothing else. Vite inlines
 * `import.meta.env` into the bundle at **build** time, so that made the API hostname a
 * property of the artefact: one build could only ever talk to one backend, and a variable
 * set in the Static Web Apps portal rather than in the GitHub Actions environment was
 * read *after* the bundle had already been compiled — so the deployed app called
 * `localhost` while every setting looked correct. It is the single most common way this
 * deployment goes wrong, and the runbook documents it as such.
 *
 * Selecting on `window.location.hostname` removes the trap: **one artefact serves both
 * environments**, and which backend it talks to becomes a property of the domain it was
 * served from. Promoting a build from staging to production stops being a rebuild.
 */

/**
 * ── `as const` object rather than a TypeScript `enum` ────────────────────────
 *
 * GhanaCard declares these as `enum`. This project sets `erasableSyntaxOnly` in
 * `tsconfig.app.json`, which forbids the construct — an `enum` emits a runtime object, so
 * it is not erasable by a type-stripping loader. Disabling that flag to copy the syntax
 * would be trading a real compiler guarantee for a cosmetic match.
 *
 * The `const` object plus a derived union gives the identical ergonomics — `Services.PROD`
 * as a value, `Services` as a type — with no runtime construct and better narrowing.
 */
export const Services = {
	/**
	 * TODO — fill in when the App Service hostname is known.
	 * Include the `/api` suffix: `routesCreator` mounts every route under it, and the
	 * endpoint constants below are written relative to it.
	 */
	PROD: 'https://prudential-backend-b9b8e2azh9eacsdr.westeurope-01.azurewebsites.net/api',
	/**
	 * TODO — the same App Service until a separate staging slot exists.
	 *
	 * Deliberately NOT defaulted to localhost: a deployed build silently falling back to
	 * a developer's machine fails in a way that reads as a network fault rather than as a
	 * missing setting, which is a much longer afternoon.
	 */
	STAGING: 'http://localhost:8080/api'
} as const;

export type Services = (typeof Services)[keyof typeof Services];

/**
 * Paths, relative to the `/api` already in the base URL above.
 *
 * Every one carries the `/v1` segment: `routesCreator` mounts `/api` and every route in
 * the template estate is versioned (deviation DV-4). `/health` is the exception — it is
 * registered directly on the app, outside the versioned router, so a health check never
 * depends on route discovery having worked.
 */
export const Endpoints = {
	// Auth (FR-01 – FR-07).
	LOGIN: '/v1/auth/login',
	LOGOUT: '/v1/auth/logout',
	ME: '/v1/auth/me',

	// The conversational pipeline (FR-08 – FR-17). Everything a model touches is here.
	QUERY: '/v1/query',
	QUERY_HISTORY: '/v1/query/history',
	QUERY_EXAMPLES: '/v1/query/examples',

	// Hand-written metrics (FR-22). No model in the path, which is why these keep
	// answering during a provider outage (NFR-12).
	METRICS_HEADLINE: '/v1/metrics/headline',
	METRICS_TREND: '/v1/metrics/trend',
	METRICS_BREAKDOWNS: '/v1/metrics/breakdowns',

	// ANALYST only — the server enforces it; hiding the nav item is a courtesy (FR-05).
	SCHEMA: '/v1/metrics/schema',

	// Unauthenticated, unversioned, opens no transaction.
	HEALTH: '/health'
} as const;

export type Endpoint = (typeof Endpoints)[keyof typeof Endpoints];

/**
 * True only when the app is served from the production domain.
 *
 * TODO — replace with the production hostname. Until it is set this returns false, so
 * `getBaseUrl` can never return `Services.PROD`. That is the safe direction to be wrong
 * in: a production build pointed at staging is a visible mistake, whereas staging pointed
 * at production is a silent one that writes real audit rows and spends real model credit.
 */
export const isProdDomain = (): boolean =>
	typeof window !== 'undefined' && window.location.hostname.includes('gray-river-0e4faab03.7.azurestaticapps.net');

const getBaseUrl = (): Services => {
	/**
	 * Local override, e.g. `VITE_BACKEND_STAGING_BASE_URL=http://localhost:8080/api`.
	 *
	 * Still a build-time read — unavoidable for a Vite env var — and that is fine here,
	 * because it exists for local development, where the build and the run are the same
	 * act. Deployment no longer depends on it.
	 */
	const override = import.meta.env.VITE_BACKEND_STAGING_BASE_URL as Services | undefined;

	// No window: a test or SSR context. There is no hostname to judge by, so take the
	// override if one was given and staging otherwise — never production.
	if (typeof window === 'undefined') return override || Services.STAGING;

	// The production domain wins over the override, so a stray `.env` on a build agent
	// cannot point a production deployment at a developer's machine.
	if (isProdDomain()) return Services.PROD;

	return override || Services.STAGING;
};

/**
 * Resolved ONCE, at module load.
 *
 * The hostname cannot change without a navigation, and a navigation reloads the module —
 * so re-evaluating per request would buy nothing and would make the base URL a moving
 * target while debugging.
 */
export const ApiService = {
	service: getBaseUrl()
};

/** The token lives in sessionStorage, never localStorage. */
export const SESSION_KEY = 'ACTIVE_USER';
