import axios, {type AxiosInstance} from 'axios';
import {ApiService, SESSION_KEY, type Services} from './apiConstants';

export interface ApiEnvelope<T = unknown> {
	success: boolean;
	data: T;
	message?: string;
	count?: number;
}

export interface StoredSession {
	accessToken: string;
	email: string;
	fullName: string;
	role: 'EXECUTIVE' | 'ANALYST';
}

export const SESSION_EXPIRED_EVENT = 'session-expired';

/** Guards against a burst of concurrent 401s each firing a separate logout. */
let sessionExpiredDispatched = false;

export function resetSessionExpiredGuard(): void {
	sessionExpiredDispatched = false;
}

/**
 * sessionStorage, never localStorage. A token in localStorage survives the tab and is
 * readable by anything running on the origin; sessionStorage bounds it to the tab's
 * lifetime, which is the right ceiling for a 60-minute session (NFR-06).
 */
export function getStoredSession(): StoredSession | null {
	const raw = sessionStorage.getItem(SESSION_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as StoredSession;
	} catch {
		sessionStorage.removeItem(SESSION_KEY);
		return null;
	}
}

export function setStoredSession(session: StoredSession): void {
	sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
	resetSessionExpiredGuard();
}

export function clearStoredSession(): void {
	sessionStorage.removeItem(SESSION_KEY);
}

function handleUnauthorized(): void {
	if (sessionExpiredDispatched) return;
	sessionExpiredDispatched = true;
	clearStoredSession();
	window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

/**
 * @param service Override the base URL for one call. Present so a second backend could be
 *                reached without threading a client through every call site — the shape
 *                GhanaCard uses. PrudenTia has one API, so it is unused today.
 */
function client(service?: Services): AxiosInstance {
	const instance = axios.create({baseURL: service ?? ApiService.service, timeout: 30000});

	instance.interceptors.request.use(cfg => {
		const token = getStoredSession()?.accessToken;
		/**
		 * `Bearer <jwt>`, matching the estate. The backend's `extractJwtFromAuthString`
		 * tolerates a bare token too, but sending the conventional form means a proxy,
		 * a gateway or a log scrubber that special-cases `Authorization: Bearer` behaves
		 * as expected rather than as a surprise.
		 */
		if (token) cfg.headers.Authorization = `Bearer ${token}`;
		return cfg;
	});

	instance.interceptors.response.use(
		response => response,
		error => {
			if (error?.response?.status === 401) handleUnauthorized();
			return Promise.reject(error);
		}
	);

	return instance;
}

/** Request bodies are wrapped as `{ data: ... }` — the backend validates `req.body.data`. */
export async function apiPost<T>(url: string, data?: unknown, service?: Services): Promise<ApiEnvelope<T>> {
	const response = await client(service).post<ApiEnvelope<T>>(url, {data});
	return response.data;
}

export async function apiGet<T>(
	url: string,
	params?: Record<string, unknown>,
	service?: Services
): Promise<ApiEnvelope<T>> {
	const response = await client(service).get<ApiEnvelope<T>>(url, {params});
	return response.data;
}

export interface ApiError {
	status: number;
	message: string;
}

/**
 * Reads the server's error shape, which is `{message, httpStatusCode}` and nothing else.
 *
 * The error renderer strips `meta` before responding, so there is no field here to dig
 * for — no failed check, no rejection reason, no query id. That is deliberate (the
 * reason is an oracle) and this helper does not pretend otherwise: whatever the server
 * chose to say is the whole of what the client knows.
 */
export function apiErrorOf(error: unknown): ApiError {
	const response = (error as {response?: {status?: number; data?: {message?: unknown}}})?.response;
	const status = typeof response?.status === 'number' ? response.status : 0;
	const message = typeof response?.data?.message === 'string' ? response.data.message : '';

	if (status === 0) {
		return {status, message: 'Could not reach the server. Check that the API is running.'};
	}
	return {status, message: message || 'Something went wrong.'};
}
