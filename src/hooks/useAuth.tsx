import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {ApiRoutes} from '../_shared/apiService/apiConstants';
import {
	apiPost,
	clearStoredSession,
	getStoredSession,
	SESSION_EXPIRED_EVENT,
	setStoredSession,
	type StoredSession
} from '../_shared/apiService/apiService';

/**
 * The session — ONE copy of it, shared through context.
 *
 * ── Why this is a provider and not a plain hook (defect D-25) ───────────────
 *
 * It was a plain hook holding `useState`. Two components called it — `App`, to decide
 * what to pass the schema page, and `Authenticated`, to render the shell — and each got
 * its OWN state. Signing in through the second one set that copy's session; the first
 * copy still held `null` and had no reason to re-read anything.
 *
 * The visible symptom was oddly specific: an analyst signed in, the shell rendered
 * correctly (that component had the session), but the Schema page sat on a loading
 * skeleton forever, because `App` still believed the role was EXECUTIVE and left the
 * query disabled. It fixed itself on a page reload, which is the signature of exactly
 * this bug — reload re-reads sessionStorage into both copies.
 *
 * A session is one fact about the application. Two components asking "who is signed in?"
 * must not be able to get different answers.
 *
 * sessionStorage, never localStorage: a token in localStorage survives the tab and is
 * readable by anything running on the origin; sessionStorage bounds it to the tab, which
 * is the right ceiling for a 60-minute session (NFR-06).
 */

interface AuthState {
	session: StoredSession | null;
	expired: boolean;
	isAnalyst: boolean;
	signIn: (email: string, password: string) => Promise<StoredSession>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({children}: {children: React.ReactNode}) {
	const [session, setSession] = useState<StoredSession | null>(() => getStoredSession());
	const [expired, setExpired] = useState(false);

	useEffect(() => {
		const onExpired = () => {
			setSession(null);
			setExpired(true);
		};
		window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
		return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
	}, []);

	const signIn = useCallback(async (email: string, password: string) => {
		const response = await apiPost<StoredSession>(ApiRoutes.login, {email, password});
		setStoredSession(response.data);
		setSession(response.data);
		setExpired(false);
		return response.data;
	}, []);

	const signOut = useCallback(async () => {
		try {
			await apiPost(ApiRoutes.logout, {});
		} catch {
			// The token is stateless, so signing out is a client-side discard. A failed
			// call must not leave the user stuck in a session they asked to leave.
		}
		clearStoredSession();
		setSession(null);
	}, []);

	const value = useMemo<AuthState>(
		() => ({session, expired, isAnalyst: session?.role === 'ANALYST', signIn, signOut}),
		[session, expired, signIn, signOut]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
	const context = useContext(AuthContext);
	if (!context) throw new Error('useAuth must be used inside AuthProvider');
	return context;
}
