import {Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {seriesColour, sharedValueFormatter, useChartTheme} from '@/lib/chartTheme';
import type {Slice} from '@/_shared/types';

/**
 * One Overview breakdown: a labelled set of magnitudes, drawn as a horizontal bar or a
 * donut.
 *
 * ── Fixed form, unlike the answer renderer, and deliberately so ─────────────
 *
 * A conversational answer has an unknown shape, so its presentation is reconciled at
 * runtime. These four are known at build time — the developer knows that premium by
 * channel is a composition and loss ratio by region is a comparison — so the form is
 * chosen once, here, by the person who knows what the number means. Offering a toggle
 * would imply the choice is the reader's when it is not: a donut of loss ratios would be
 * as wrong on this page as the answer reconciler refuses to let it be on the other.
 *
 * Horizontal bars throughout for comparisons, because these labels are Ghanaian region
 * and channel names and rotating them to fit a vertical axis is how a dashboard becomes
 * unreadable at the exact size it is usually viewed.
 */

interface Props {
	title: string;
	description: string;
	data: Slice[] | undefined;
	loading: boolean;
	/** `donut` only where the parts genuinely sum to a whole. */
	form: 'hbar' | 'donut';
	/** Which validated hue to start from, so two adjacent cards do not look like one series. */
	colourIndex?: number;
	/** Formats the value for labels and tooltips — percentages, money, counts. */
	format?: (value: number) => string;
	/** Highlights bars at or above this value in the critical colour, e.g. loss ratio ≥ 1. */
	alarmAbove?: number;
}

export default function BreakdownChart({
	title,
	description,
	data,
	loading,
	form,
	colourIndex = 0,
	format,
	alarmAbove
}: Props) {
	const theme = useChartTheme();
	const slices = data ?? [];
	const auto = sharedValueFormatter(slices.map(slice => slice.value));
	const formatValue = (value: unknown) =>
		format && typeof value === 'number' ? format(value) : auto(value);

	const total = slices.reduce((sum, slice) => sum + slice.value, 0);

	const tooltip = {
		contentStyle: {
			background: theme.surface,
			border: `1px solid ${theme.grid}`,
			borderRadius: 8,
			color: theme.text,
			fontSize: 12
		},
		formatter: (value: unknown) => [formatValue(value), title] as [string, string]
	};

	return (
		<Card className="min-w-0">
			<CardHeader>
				<CardTitle className="text-sm">{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				{loading ? (
					<Skeleton className="h-[200px] w-full" />
				) : slices.length === 0 ? (
					<p className="py-12 text-center text-sm text-muted-foreground">No data.</p>
				) : form === 'donut' ? (
					<div className="flex items-center gap-4">
						<div className="relative shrink-0">
							<ResponsiveContainer width={150} height={150}>
								<PieChart>
									<Pie
										data={slices}
										dataKey="value"
										nameKey="label"
										innerRadius={44}
										outerRadius={70}
										paddingAngle={2}
										stroke={theme.surface}
										strokeWidth={2}>
										{slices.map((slice, index) => (
											<Cell key={slice.label} fill={seriesColour(theme, index)} />
										))}
									</Pie>
									<Tooltip {...tooltip} />
								</PieChart>
							</ResponsiveContainer>
						</div>

						{/* The share in words and figures. Angles are not readable to a
						    percentage point; this is where the numbers live. */}
						<ul className="min-w-0 flex-1 space-y-1.5">
							{slices.map((slice, index) => (
								<li key={slice.label} className="flex items-baseline gap-2 text-xs">
									<span
										aria-hidden="true"
										className="mt-1 size-2.5 shrink-0 rounded-[3px]"
										style={{background: seriesColour(theme, index)}}
									/>
									<span className="min-w-0 flex-1 truncate">{slice.label}</span>
									<span className="tabular-nums text-muted-foreground">
										{total > 0 ? `${((slice.value / total) * 100).toFixed(1)}%` : '—'}
									</span>
								</li>
							))}
						</ul>
					</div>
				) : (
					<ResponsiveContainer width="100%" height={Math.max(170, slices.length * 26 + 20)}>
						<BarChart data={slices} layout="vertical" margin={{top: 0, right: 52, bottom: 0, left: 0}}>
							<CartesianGrid stroke={theme.grid} strokeDasharray="3 3" horizontal={false} />
							<XAxis type="number" hide />
							<YAxis
								type="category"
								dataKey="label"
								tick={{fill: theme.textMuted, fontSize: 11}}
								stroke={theme.grid}
								width={104}
								interval={0}
							/>
							<Tooltip cursor={{fill: theme.grid, fillOpacity: 0.3}} {...tooltip} />
							<Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
								{slices.map(slice => (
									<Cell
										key={slice.label}
										// The alarm colour is reserved and never doubles as a
										// series hue — a red bar here means one thing only.
										fill={
											alarmAbove !== undefined && slice.value >= alarmAbove
												? 'var(--critical)'
												: seriesColour(theme, colourIndex)
										}
									/>
								))}
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
				)}
			</CardContent>
		</Card>
	);
}
