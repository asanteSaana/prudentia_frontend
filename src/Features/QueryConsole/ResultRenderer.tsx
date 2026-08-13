import {useMemo, useState} from 'react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	LabelList,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts';
import {Card, CardContent, CardFooter, CardHeader} from '@/components/ui/card';
import {formatNumber, seriesColour, sharedValueFormatter, useChartTheme} from '@/lib/chartTheme';
import type {ChartType, QueryAnswer} from '@/_shared/types';

/**
 * The polymorphic renderer: hero number, bar, line, or paginated table.
 *
 * ── Chart rules applied here ────────────────────────────────────────────────
 *
 * Single series throughout, so no legend box — the title (the explanation above the
 * chart) names what is plotted, and a legend for one thing is ink with no information.
 * One y-axis, always; there is no dual-axis chart in this product and there never should
 * be. Grid lines are horizontal only and recessive. Bars carry direct value labels up to
 * twelve bars, above which they collide and the Table view is the honest read — between
 * them those two discharge the light-mode contrast WARN from palette validation, which is
 * an obligation to provide labels or a table, not something that can be waved away.
 *
 * Colour comes from the `--series-*` custom properties via `useChartTheme()`, so light and
 * dark swap in one place and the palette that was validated is the palette that renders —
 * including when the reader toggles the theme with a chart already on screen.
 */

interface Props {
	answer: QueryAnswer;
}

const TOGGLE_LABEL: Record<ChartType, string> = {kpi: 'Number', bar: 'Bar', line: 'Line', table: 'Table'};

/** Which presentations are LEGITIMATE for this shape (FR-21). Never all four. */
function allowedViews(answer: QueryAnswer): ChartType[] {
	const {columns, rows} = answer;
	if (rows.length === 0) return ['table'];
	if (rows.length === 1 && columns.length === 1) return ['kpi', 'table'];
	if (columns.length >= 3) return ['table'];
	if (columns.length === 1) return ['table'];
	// Two columns, several rows: bar and line are both expressible; table always is.
	return answer.chartType === 'line' ? ['line', 'bar', 'table'] : ['bar', 'line', 'table'];
}

/**
 * ── This component MUST be keyed on `answer.queryId` by its parent ───────────
 *
 * `view` is seeded from the server's `chartType` in a `useState` initialiser, and that
 * initialiser runs at MOUNT ONLY. Without a changing key the component is reused across
 * answers and keeps the previous answer's presentation.
 *
 * That shipped as defect D-20 and it was not cosmetic. "Compare loss ratio by vehicle
 * category" returns `bar`; asked straight after a `line` answer it rendered as a LINE
 * chart joining SUV → PICKUP → TRUCK → MOTORCYCLE → BUS → SEDAN with a smooth curve —
 * asserting an order and a rate of change over unordered categories, which is the exact
 * lie `selectChartType` refuses to tell on the server ("a `line` hint over non-temporal
 * data becomes a bar"). The server was right and the client overrode it with stale state.
 *
 * A screenshot found it. The whole suite was green: the reconciliation is unit-tested,
 * the pipeline is integration-tested, and neither could see a second render.
 */
export default function ResultRenderer({answer}: Props) {
	const views = allowedViews(answer);
	const [view, setView] = useState<ChartType>(views.includes(answer.chartType) ? answer.chartType : views[0]);
	// Reactive: re-read when the theme class changes, so a dark toggle repaints the chart
	// instead of leaving the light palette on a dark card.
	const theme = useChartTheme();

	const chartData = useMemo(
		() =>
			answer.rows.map(row => ({
				label: String(row[0] ?? ''),
				value: typeof row[1] === 'number' ? row[1] : Number(row[1]) || 0
			})),
		[answer.rows]
	);

	const valueName = answer.columns[1]?.name ?? 'value';

	// One precision across the whole series — labels and tooltip alike, so hovering a bar
	// never shows a different number of digits from the label printed above it.
	const formatValue = useMemo(() => sharedValueFormatter(chartData.map(point => point.value)), [chartData]);

	return (
		<Card className="gap-0 overflow-hidden py-0">
			<CardHeader className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
				<div className="min-w-0 flex-1">
					<h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Answer</h2>
					{/* Read this. It is how you check the system understood the question you
					    meant to ask rather than a different one it found easier. */}
					<p className="mt-1 text-sm">{answer.explanation}</p>
				</div>

				{views.length > 1 && (
					<div role="group" aria-label="Presentation" className="flex shrink-0 gap-1">
						{views.map(candidate => (
							<button
								key={candidate}
								type="button"
								onClick={() => setView(candidate)}
								aria-pressed={view === candidate}
								className={`rounded-md border px-2 py-1 text-xs transition-colors ${
									view === candidate
										? 'border-foreground/40 bg-muted font-medium text-foreground'
										: 'text-muted-foreground hover:border-foreground/30 hover:text-foreground'
								}`}>
								{TOGGLE_LABEL[candidate]}
							</button>
						))}
					</div>
				)}
			</CardHeader>

			<CardContent className="px-4 py-4">
				{answer.rows.length === 0 ? (
					<p className="py-8 text-center text-sm text-muted-foreground">
						That question returned no rows. It ran correctly — there is simply nothing matching.
					</p>
				) : view === 'kpi' ? (
					<HeroNumber answer={answer} />
				) : view === 'table' ? (
					<ResultTable answer={answer} />
				) : (
					/* Charts scroll horizontally rather than compressing labels into
					   illegibility — the ≥360px rule from the responsive spec. */
					<div className="overflow-x-auto">
						<div style={{minWidth: Math.max(320, chartData.length * 44)}}>
							<ResponsiveContainer width="100%" height={300}>
								{view === 'line' ? (
									<LineChart data={chartData} margin={{top: 8, right: 16, bottom: 8, left: 8}}>
										<CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
										<XAxis
											dataKey="label"
											tick={{fill: theme.textMuted, fontSize: 11}}
											stroke={theme.grid}
										/>
										<YAxis
											tick={{fill: theme.textMuted, fontSize: 11}}
											stroke={theme.grid}
											width={64}
										/>
										<Tooltip
											contentStyle={{
												background: theme.surface,
												border: `1px solid ${theme.grid}`,
												borderRadius: 8,
												color: theme.text,
												fontSize: 12
											}}
											formatter={(value: unknown) => [formatValue(value), valueName] as [string, string]}
										/>
										<Line
											type="monotone"
											dataKey="value"
											name={valueName}
											stroke={seriesColour(theme, 0)}
											strokeWidth={2}
											dot={{r: 3, strokeWidth: 0, fill: seriesColour(theme, 0)}}
											activeDot={{r: 5}}
										/>
									</LineChart>
								) : (
									<BarChart data={chartData} margin={{top: 16, right: 16, bottom: 8, left: 8}}>
										<CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
										<XAxis
											dataKey="label"
											tick={{fill: theme.textMuted, fontSize: 11}}
											stroke={theme.grid}
											interval={0}
											angle={chartData.length > 6 ? -35 : 0}
											textAnchor={chartData.length > 6 ? 'end' : 'middle'}
											height={chartData.length > 6 ? 64 : 30}
										/>
										<YAxis
											tick={{fill: theme.textMuted, fontSize: 11}}
											stroke={theme.grid}
											width={64}
										/>
										<Tooltip
											cursor={{fill: theme.grid, fillOpacity: 0.3}}
											contentStyle={{
												background: theme.surface,
												border: `1px solid ${theme.grid}`,
												borderRadius: 8,
												color: theme.text,
												fontSize: 12
											}}
											formatter={(value: unknown) => [formatValue(value), valueName] as [string, string]}
										/>
										<Bar
											dataKey="value"
											name={valueName}
											fill={seriesColour(theme, 0)}
											radius={[4, 4, 0, 0]}
											maxBarSize={44}>
											{/*
											 * Direct value labels, SELECTIVELY — up to 12
											 * bars, above which they collide and become
											 * noise, and the Table view is the honest read.
											 *
											 * This is not decoration. Palette validation
											 * returned a light-mode contrast WARN on the
											 * later series steps, and a WARN is discharged
											 * by visible labels or a table view, never
											 * dismissed. Shipping both is why the palette
											 * is usable as validated. The label wears MUTED
											 * INK, not the series colour — a coloured mark
											 * beside text carries the identity; the text
											 * itself stays legible ink.
											 */}
											{chartData.length <= 12 && (
												<LabelList
													dataKey="value"
													position="top"
													fill={theme.textMuted}
													fontSize={11}
													formatter={(value: unknown) => formatValue(value)}
												/>
											)}
										</Bar>
									</BarChart>
								)}
							</ResponsiveContainer>
						</div>
					</div>
				)}
			</CardContent>

			<CardFooter className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-xs text-muted-foreground">
				{/* Pluralised. "1 rows" was a real defect in the reference build. */}
				<span>
					{answer.rowCount.toLocaleString('en-GB')} {answer.rowCount === 1 ? 'row' : 'rows'}
				</span>
				<span>{answer.durationMs} ms</span>
				{answer.truncated && <span className="text-warning">Capped at 1,000 rows</span>}
			</CardFooter>
		</Card>
	);
}

function HeroNumber({answer}: {answer: QueryAnswer}) {
	const value = answer.rows[0]?.[0];
	return (
		<div className="py-8 text-center">
			<p className="text-5xl font-semibold tabular-nums sm:text-6xl">{formatNumber(value)}</p>
			<p className="mt-2 text-xs tracking-wide text-muted-foreground uppercase">{answer.columns[0]?.name}</p>
		</div>
	);
}

const PAGE_SIZE = 15;

function ResultTable({answer}: {answer: QueryAnswer}) {
	const [page, setPage] = useState(0);
	const pages = Math.max(1, Math.ceil(answer.rows.length / PAGE_SIZE));
	const slice = answer.rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

	return (
		<div>
			{/* Wide tables scroll inside their own container; the page body never does. */}
			<div className="overflow-x-auto">
				<table className="w-full min-w-[320px] text-left text-sm">
					<thead>
						<tr className="border-b border-border">
							{answer.columns.map(column => (
								<th key={column.name} className="py-2 pr-4 text-xs font-medium text-muted-foreground">
									{column.name}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{slice.map((row, rowIndex) => (
							<tr key={rowIndex} className="border-b border-border/60">
								{row.map((cell, cellIndex) => (
									<td key={cellIndex} className="py-1.5 pr-4 tabular-nums">
										{formatNumber(cell)}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{pages > 1 && (
				<div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
					<button
						type="button"
						disabled={page === 0}
						onClick={() => setPage(current => current - 1)}
						className="rounded-md border border-border px-2 py-1 disabled:opacity-40">
						Previous
					</button>
					<span>
						Page {page + 1} of {pages}
					</span>
					<button
						type="button"
						disabled={page >= pages - 1}
						onClick={() => setPage(current => current + 1)}
						className="rounded-md border border-border px-2 py-1 disabled:opacity-40">
						Next
					</button>
				</div>
			)}
		</div>
	);
}
