import {useMemo, useState} from 'react';
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	LabelList,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts';
import {Card, CardContent, CardFooter, CardHeader} from '@/components/ui/card';
import {formatAxisTick, formatNumber, seriesColour, sharedValueFormatter, useChartTheme, type ChartTheme} from '@/lib/chartTheme';
import {cn} from '@/lib/utils';
import type {ChartType, QueryAnswer} from '@/_shared/types';
import DataTable from './DataTable';

/**
 * The polymorphic renderer: number, bar, horizontal bar, line, area, donut, or table.
 *
 * ── Which presentations are offered is a SERVER decision ────────────────────
 *
 * The toggle is built from `answer.chartOptions`, which the reconciler computed over the
 * real rows (ADR-08). The client does not decide whether a donut is honest for this data
 * — that judgement lives in one place, and it is not this one. Re-deriving it here would
 * be two implementations of the same rule with the divergent one on the untrusted side.
 *
 * ── Chart rules applied here ────────────────────────────────────────────────
 *
 * Single series throughout, so no legend on the cartesian charts — the explanation above
 * names what is plotted, and a legend for one thing is ink with no information. The donut
 * is the exception: its slices ARE separate identities, so it carries a legend and direct
 * labels both. One y-axis, always. Grid lines horizontal only and recessive. Bars carry
 * direct value labels up to twelve.
 *
 * Colour comes from the `--series-*` custom properties via `useChartTheme()`, so light and
 * dark swap in one place and the palette that was validated is the palette that renders.
 */

interface Props {
	answer: QueryAnswer;
}

const TOGGLE_LABEL: Record<ChartType, string> = {
	kpi: 'Number',
	bar: 'Bar',
	hbar: 'Horizontal',
	line: 'Line',
	area: 'Area',
	donut: 'Donut',
	table: 'Table'
};

/**
 * ── This component MUST be keyed on `answer.queryId` by its parent ───────────
 *
 * `view` is seeded from the server's `chartType` in a `useState` initialiser, and that
 * initialiser runs at MOUNT ONLY. Without a changing key the component is reused across
 * answers and keeps the previous answer's presentation.
 *
 * That shipped as defect D-20 and it was not cosmetic: "Compare loss ratio by vehicle
 * category" returns `bar`, and asked straight after a `line` answer it rendered as a LINE
 * chart joining SUV → PICKUP → TRUCK with a smooth curve — asserting an order and a rate
 * of change over unordered categories, the exact lie the server refuses to tell. A
 * screenshot found it; the whole suite was green, because neither a unit test nor an
 * integration test can see a second render.
 */
export default function ResultRenderer({answer}: Props) {
	const options = answer.chartOptions?.length ? answer.chartOptions : [answer.chartType];
	const [view, setView] = useState<ChartType>(options.includes(answer.chartType) ? answer.chartType : options[0]);
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

	const tooltip = {
		contentStyle: {
			background: theme.surface,
			border: `1px solid ${theme.grid}`,
			borderRadius: 8,
			color: theme.text,
			fontSize: 12
		},
		formatter: (value: unknown) => [formatValue(value), valueName] as [string, string]
	};

	const axisTick = {fill: theme.textMuted, fontSize: 11};

	return (
		<Card className="gap-0 overflow-hidden py-0">
			<CardHeader className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
				<div className="min-w-0 flex-1">
					<h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Answer</h2>
					{/* Read this. It is how you check the system understood the question you
					    meant to ask rather than a different one it found easier. */}
					<p className="mt-1 text-sm">{answer.explanation}</p>
				</div>

				{options.length > 1 && (
					<div role="group" aria-label="Presentation" className="flex shrink-0 flex-wrap gap-1">
						{options.map(candidate => (
							<button
								key={candidate}
								type="button"
								onClick={() => setView(candidate)}
								aria-pressed={view === candidate}
								className={cn(
									'rounded-md border px-2 py-1 text-xs transition-colors',
									view === candidate
										? 'border-foreground/40 bg-muted font-medium text-foreground'
										: 'text-muted-foreground hover:border-foreground/30 hover:text-foreground'
								)}>
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
					<DataTable answer={answer} />
				) : view === 'hbar' ? (
					/*
					 * Horizontal bars grow DOWNWARD, so the container gets taller with the
					 * category count rather than wider — which is the whole reason this
					 * orientation exists: long labels get a full column of room instead of
					 * being rotated to 35° and read sideways.
					 */
					<ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 34 + 40)}>
						<BarChart data={chartData} layout="vertical" margin={{top: 4, right: 56, bottom: 4, left: 8}}>
							<CartesianGrid stroke={theme.grid} strokeDasharray="3 3" horizontal={false} />
							<XAxis type="number" tick={axisTick} stroke={theme.grid} tickFormatter={formatAxisTick} />
							<YAxis
								type="category"
								dataKey="label"
								tick={axisTick}
								stroke={theme.grid}
								width={Math.min(220, Math.max(90, longestLabel(chartData) * 7))}
								interval={0}
							/>
							<Tooltip cursor={{fill: theme.grid, fillOpacity: 0.3}} {...tooltip} />
							<Bar dataKey="value" name={valueName} fill={seriesColour(theme, 0)} radius={[0, 4, 4, 0]} maxBarSize={26}>
								<LabelList
									dataKey="value"
									position="right"
									fill={theme.textMuted}
									fontSize={11}
									formatter={(value: unknown) => formatValue(value)}
								/>
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				) : view === 'donut' ? (
					<Donut data={chartData} theme={theme} formatValue={formatValue} valueName={valueName} tooltip={tooltip} />
				) : (
					/* Charts scroll horizontally rather than compressing labels into
					   illegibility — the ≥360px rule from the responsive spec. */
					<div className="overflow-x-auto">
						<div style={{minWidth: Math.max(320, chartData.length * 44)}}>
							<ResponsiveContainer width="100%" height={300}>
								{view === 'line' ? (
									<LineChart data={chartData} margin={{top: 8, right: 16, bottom: 8, left: 8}}>
										<CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
										<XAxis dataKey="label" tick={axisTick} stroke={theme.grid} />
										<YAxis tick={axisTick} stroke={theme.grid} width={64} tickFormatter={formatAxisTick} />
										<Tooltip {...tooltip} />
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
								) : view === 'area' ? (
									<AreaChart data={chartData} margin={{top: 8, right: 16, bottom: 8, left: 8}}>
										{/*
										 * The fill is a gradient to near-transparent, not a flat
										 * wash: an area's job is to carry the eye along the top
										 * edge, and a solid block competes with it for attention
										 * while implying the space below is itself a quantity.
										 */}
										<defs>
											<linearGradient id="prudentia-area" x1="0" y1="0" x2="0" y2="1">
												<stop offset="0%" stopColor={seriesColour(theme, 0)} stopOpacity={0.35} />
												<stop offset="100%" stopColor={seriesColour(theme, 0)} stopOpacity={0.02} />
											</linearGradient>
										</defs>
										<CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
										<XAxis dataKey="label" tick={axisTick} stroke={theme.grid} />
										<YAxis tick={axisTick} stroke={theme.grid} width={64} tickFormatter={formatAxisTick} />
										<Tooltip {...tooltip} />
										<Area
											type="monotone"
											dataKey="value"
											name={valueName}
											stroke={seriesColour(theme, 0)}
											strokeWidth={2}
											fill="url(#prudentia-area)"
										/>
									</AreaChart>
								) : (
									<BarChart data={chartData} margin={{top: 16, right: 16, bottom: 8, left: 8}}>
										<CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
										<XAxis
											dataKey="label"
											tick={axisTick}
											stroke={theme.grid}
											interval={0}
											angle={chartData.length > 6 ? -35 : 0}
											textAnchor={chartData.length > 6 ? 'end' : 'middle'}
											height={chartData.length > 6 ? 64 : 30}
										/>
										<YAxis tick={axisTick} stroke={theme.grid} width={64} tickFormatter={formatAxisTick} />
										<Tooltip cursor={{fill: theme.grid, fillOpacity: 0.3}} {...tooltip} />
										<Bar
											dataKey="value"
											name={valueName}
											fill={seriesColour(theme, 0)}
											radius={[4, 4, 0, 0]}
											maxBarSize={44}>
											{/*
											 * Direct value labels, SELECTIVELY — up to 12 bars,
											 * above which they collide and the Table view is the
											 * honest read. The label wears MUTED INK, not the
											 * series colour: a coloured mark beside text carries
											 * the identity, the text stays legible ink.
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

const longestLabel = (data: Array<{label: string}>) =>
	data.reduce((longest, point) => Math.max(longest, point.label.length), 0);

/**
 * The donut.
 *
 * Offered only where the server judged the parts genuinely sum to a whole — additive,
 * non-negative, and few enough that angles remain comparable. The centre carries the
 * TOTAL, which is the one number a reader of a part-to-whole chart always wants and the
 * reason to prefer a donut over a pie: the hole is not empty space, it is where the sum
 * goes.
 *
 * Slices take the categorical palette in FIXED ORDER — the same order, and the same four
 * validated hues, as every other chart in the product.
 */
function Donut({
	data,
	theme,
	formatValue,
	valueName,
	tooltip
}: {
	data: Array<{label: string; value: number}>;
	theme: ChartTheme;
	formatValue: (value: unknown) => string;
	valueName: string;
	tooltip: Record<string, unknown>;
}) {
	const total = data.reduce((sum, point) => sum + point.value, 0);

	return (
		<div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-center">
			<div className="relative">
				<ResponsiveContainer width={260} height={260}>
					<PieChart>
						<Pie
							data={data}
							dataKey="value"
							nameKey="label"
							innerRadius={72}
							outerRadius={110}
							paddingAngle={2}
							stroke={theme.surface}
							strokeWidth={2}>
							{data.map((point, index) => (
								<Cell key={point.label} fill={seriesColour(theme, index)} />
							))}
						</Pie>
						<Tooltip {...tooltip} />
					</PieChart>
				</ResponsiveContainer>

				{/* The total, in the hole. `pointer-events-none` so it never intercepts a
				    hover meant for the slice beneath it. */}
				<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
					<span className="text-[11px] tracking-wide text-muted-foreground uppercase">Total</span>
					{/* The series formatter, not the general one: the total must carry the same
					    precision as the slices beside it, or the hole says `.68` while every
					    number around it is whole. */}
					<span className="text-lg font-semibold tabular-nums">{formatValue(total)}</span>
				</div>
			</div>

			{/*
			 * A written legend, not just colour: each slice gets its name, its value and its
			 * share. Angles are hard to compare and impossible to read exactly — this is
			 * where the donut's numbers actually live.
			 */}
			<ul className="w-full max-w-xs space-y-1.5">
				{data.map((point, index) => (
					<li key={point.label} className="flex items-baseline gap-2 text-sm">
						<span
							aria-hidden="true"
							className="mt-1.5 size-2.5 shrink-0 rounded-[3px]"
							style={{background: seriesColour(theme, index)}}
						/>
						<span className="min-w-0 flex-1 truncate" title={point.label}>
							{point.label}
						</span>
						<span className="tabular-nums">{formatValue(point.value)}</span>
						<span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
							{total > 0 ? `${((point.value / total) * 100).toFixed(1)}%` : '—'}
						</span>
					</li>
				))}
				<li className="border-t pt-1.5 text-[11px] text-muted-foreground">{valueName}</li>
			</ul>
		</div>
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
