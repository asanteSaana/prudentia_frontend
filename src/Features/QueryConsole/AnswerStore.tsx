import {useQueryClient} from '@tanstack/react-query';
import {createContext, useCallback, useContext, useMemo, useRef, useState} from 'react';
import {ApiRoutes} from '@/_shared/apiService/apiConstants';
import {apiErrorOf, apiPost, type ApiError} from '@/_shared/apiService/apiService';
import {QueryKeys} from '@/_shared/queries';
import type {QueryAnswer} from '@/_shared/types';

/**
 * The conversation, held above the router.
 *
 * ── Why a THREAD of turns and not a single current answer ───────────────────
 *
 * The previous version kept one answer and replaced it. That made the second question
 * silently destroy the first, which is wrong for the way this product is actually used:
 * an analyst asks a broad question, reads the answer, narrows it, and wants to compare
 * the two. Throwing the first away forces them to re-ask it — and a re-ask is a second
 * model call, a second audit row, and possibly a different statement.
 *
 * Each turn carries its own status, so a refusal sits in the thread where it happened
 * rather than replacing everything above it. That matters here more than in an ordinary
 * chat: **a refusal is information about the boundary**, and its position relative to the
 * question that succeeded afterwards is most of what it teaches.
 *
 * ── Why this is a context and not a TanStack query ──────────────────────────
 *
 * Everything else the interface reads is server state that may be refetched at will. An
 * answer is not: it is a point-in-time record with an audit row behind it, and silently
 * re-running the question underneath the reader would produce a second audit entry and
 * possibly a different result while they were looking at the first one.
 *
 * It lives above the router so moving between Ask, Overview and History does not discard
 * the conversation.
 */

export interface Turn {
	id: number;
	question: string;
	status: 'thinking' | 'answered' | 'refused';
	answer?: QueryAnswer;
	failure?: ApiError;
}

interface ConversationState {
	turns: Turn[];
	busy: boolean;
	ask: (question: string) => Promise<void>;
	clear: () => void;
}

const AnswerContext = createContext<ConversationState | null>(null);

export function AnswerProvider({children}: {children: React.ReactNode}) {
	const queryClient = useQueryClient();
	const [turns, setTurns] = useState<Turn[]>([]);
	const [busy, setBusy] = useState(false);
	// A counter, not a timestamp or a random id: the key has to be stable across renders
	// and unique within the session, and nothing more is required of it.
	const nextId = useRef(1);

	const ask = useCallback(
		async (question: string) => {
			const id = nextId.current++;

			// The turn appears IMMEDIATELY, before the request resolves. The question a
			// user just pressed Enter on should be on screen while they wait for it, not
			// after — otherwise the interface looks like it lost the keystroke.
			setTurns(current => [...current, {id, question, status: 'thinking'}]);
			setBusy(true);

			try {
				const response = await apiPost<QueryAnswer>(ApiRoutes.query, {question});
				setTurns(current =>
					current.map(turn => (turn.id === id ? {...turn, status: 'answered', answer: response.data} : turn))
				);
			} catch (error) {
				setTurns(current =>
					current.map(turn =>
						turn.id === id ? {...turn, status: 'refused', failure: apiErrorOf(error)} : turn
					)
				);
			} finally {
				setBusy(false);
				/**
				 * Invalidate on EVERY outcome, including a refusal.
				 *
				 * The blocked attempt was audited on its own connection before the error was
				 * thrown, so it is already in the log — but the server strips `meta` from
				 * error responses, so its id never reaches the client (defect D-19).
				 * Refetching is how the blocked question appears in the history, and it is
				 * the right way round: the list shows what the audit log recorded rather
				 * than what the client believes it asked.
				 */
				void queryClient.invalidateQueries({queryKey: QueryKeys.history});
			}
		},
		[queryClient]
	);

	const clear = useCallback(() => setTurns([]), []);

	const value = useMemo<ConversationState>(() => ({turns, busy, ask, clear}), [turns, busy, ask, clear]);

	return <AnswerContext.Provider value={value}>{children}</AnswerContext.Provider>;
}

export function useConversation(): ConversationState {
	const context = useContext(AnswerContext);
	if (!context) throw new Error('useConversation must be used inside AnswerProvider');
	return context;
}
