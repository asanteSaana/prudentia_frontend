import {useQuery} from '@tanstack/react-query';
import {ApiRoutes} from './apiService/apiConstants';
import {apiGet} from './apiService/apiService';
import type {Breakdowns, HeadlineMetrics, HistoryEntry, SchemaCatalogue, TrendPoint} from './types';

/**
 * Server state, through TanStack Query (template convention).
 *
 * Everything here is a READ that can be refetched safely and shared between routes: the
 * headline figures appear on the overview and the ask page, and the history is written
 * by one route and read by another. Caching them centrally is what stops four components
 * each holding their own copy and disagreeing.
 *
 * The one thing deliberately NOT here is the answer to a question — see
 * `Features/QueryConsole/AnswerStore.tsx`. An answer is a point-in-time record with an
 * audit row behind it, not a cache entry to be silently refreshed under the reader.
 */

export const QueryKeys = {
	headline: ['metrics', 'headline'] as const,
	trend: ['metrics', 'trend'] as const,
	breakdowns: ['metrics', 'breakdowns'] as const,
	history: ['query', 'history'] as const,
	examples: ['query', 'examples'] as const,
	schema: ['metrics', 'schema'] as const
};

/**
 * The dashboard reads (FR-22, NFR-12).
 *
 * These are hand-written SQL that never touches the model, which is why an assistant
 * outage degrades the product instead of stopping it: these two keep resolving while
 * `/query` returns 503.
 */
export function useHeadlineMetrics() {
	return useQuery({
		queryKey: QueryKeys.headline,
		queryFn: async () => (await apiGet<HeadlineMetrics>(ApiRoutes.headlineMetrics)).data
	});
}

export function useTrend() {
	return useQuery({
		queryKey: QueryKeys.trend,
		queryFn: async () => (await apiGet<TrendPoint[]>(ApiRoutes.trendMetrics)).data
	});
}

/** FR-22 — the Overview's breakdowns. Hand-written SQL, no model in the path. */
export function useBreakdowns() {
	return useQuery({
		queryKey: QueryKeys.breakdowns,
		queryFn: async () => (await apiGet<Breakdowns>(ApiRoutes.breakdowns)).data
	});
}

/** FR-25 — the caller's own history, never anyone else's (enforced server-side). */
export function useHistory() {
	return useQuery({
		queryKey: QueryKeys.history,
		queryFn: async () => (await apiGet<HistoryEntry[]>(ApiRoutes.queryHistory)).data
	});
}

/** FR-23 — the suggested questions, offered as one-click chips. */
export function useExamples() {
	return useQuery({
		queryKey: QueryKeys.examples,
		queryFn: async () => (await apiGet<string[]>(ApiRoutes.queryExamples)).data,
		// Fixed on the server. Refetching them is pure noise.
		staleTime: Infinity
	});
}

/**
 * ANALYST only (FR-05). `enabled` keeps an executive from firing a request that would
 * only 403 — the guard itself is server-side and this is merely not being rude about it.
 */
export function useSchema(enabled: boolean) {
	return useQuery({
		queryKey: QueryKeys.schema,
		queryFn: async () => (await apiGet<SchemaCatalogue>(ApiRoutes.schema)).data,
		enabled,
		staleTime: Infinity
	});
}
