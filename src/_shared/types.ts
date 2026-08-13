export type ChartType = 'kpi' | 'bar' | 'hbar' | 'line' | 'area' | 'donut' | 'table';
export type UserRole = 'EXECUTIVE' | 'ANALYST';

export interface ResultColumn {
	name: string;
	type: string;
}

/**
 * The answer payload.
 *
 * `generatedSql` is OPTIONAL because for an EXECUTIVE the key is ABSENT from the JSON —
 * not null, absent (FR-05, TH-07). Typing it optional is the honest shape: the client
 * cannot rely on it existing, which is exactly the point of the server-side projection.
 */
export interface QueryAnswer {
	queryId: number;
	question: string;
	explanation: string;
	chartType: ChartType;
	/**
	 * Every presentation the SERVER judged honest for this result, `chartType` included.
	 *
	 * The client renders this list as the toggle and does not re-derive it. Whether a
	 * donut is legitimate depends on whether the values are additive and non-negative —
	 * a judgement made once, over the real rows, in `chartSelector.ts`. Deriving it again
	 * here would be two implementations of the same rule with the divergent one on the
	 * untrusted side of the wire.
	 *
	 * Optional so an older cached payload degrades to "just the one chart" rather than an
	 * empty toggle.
	 */
	chartOptions?: ChartType[];
	columns: ResultColumn[];
	rows: unknown[][];
	rowCount: number;
	durationMs: number;
	truncated: boolean;
	generatedSql?: string;
}

export interface HistoryEntry {
	id: number;
	question: string;
	validationStatus: 'PERMITTED' | 'REJECTED';
	executionStatus: string;
	rowCount: number | null;
	durationMs: number | null;
	chartType: ChartType | null;
	createdAt: string;
	generatedSql?: string | null;
	failedCheck?: string | null;
	rejectionReason?: string | null;
}

export interface HeadlineMetrics {
	lossRatio: number;
	claimFrequency: number;
	averageSeverity: number;
	earnedPremium: number;
	activePolicies: number;
	averageSettlementDays: number;
}

export interface TrendPoint {
	month: string;
	claimCount: number;
	incurredAmount: number;
}

/** One labelled magnitude — the shape every Overview breakdown returns. */
export interface Slice {
	label: string;
	value: number;
}

export interface Breakdowns {
	premiumByChannel: Slice[];
	lossRatioByRegion: Slice[];
	claimsByCause: Slice[];
	policiesByProduct: Slice[];
}

/**
 * ANALYST only. `rendered` is the LITERAL string put in the model's system prompt — not a
 * re-description for humans. An analyst verifying how an answer was produced has to be
 * looking at the schema the model actually saw, or the audit trail is quietly wrong.
 */
export interface SchemaCatalogue {
	tables: Array<{
		name: string;
		description: string;
		columns: Array<{name: string; type: string; description: string}>;
	}>;
	glossary: Array<{term: string; definition: string}>;
	rendered: string;
}
