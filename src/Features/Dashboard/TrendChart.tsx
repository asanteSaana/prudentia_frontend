import {CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {formatAxisTick, formatNumber, seriesColour, useChartTheme} from '@/lib/chartTheme';
import type {TrendPoint} from '@/_shared/types';

/**
 * Monthly claim counts.
 *
 * A line, because the x-axis is time and the space between points means something — the
 * one case where connecting points asserts something true. One series, so no legend box:
 * the card title names what is plotted, and a legend for one thing is ink with no
 * information.
 *
 * Like the tiles, this is hand-written SQL that never touches the model, so it stays up
 * when the assistant is down (NFR-12).
 */

interface Props {
	points: TrendPoint[] | undefined;
	loading: boolean;
}

export default function TrendChart({points, loading}: Props) {
	const theme = useChartTheme();
	const data = points ?? [];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm">Claims by month</CardTitle>
				<CardDescription>Counted on incident date, not notification date.</CardDescription>
			</CardHeader>
			<CardContent>
				{loading ? (
					<Skeleton className="h-[240px] w-full" />
				) : data.length === 0 ? (
					<p className="py-14 text-center text-sm text-muted-foreground">No claims recorded.</p>
				) : (
					/* Wide content scrolls inside its own container; the page body never does. */
					<div className="overflow-x-auto">
						{/*
						 * 12px per month, not 26. A dense line does not need a slot per point
						 * to stay readable — `minTickGap` already thins the labels — and at 26
						 * a three-year series forced 936px of inner width, so on a normal
						 * desktop the card silently scrolled and the last eighteen months sat
						 * off-screen with nothing indicating they existed.
						 */}
						<div style={{minWidth: Math.max(320, data.length * 12)}}>
							<ResponsiveContainer width="100%" height={240}>
								<LineChart data={data} margin={{top: 8, right: 12, bottom: 4, left: 4}}>
									<CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
									<XAxis
										dataKey="month"
										tick={{fill: theme.textMuted, fontSize: 10}}
										stroke={theme.grid}
										minTickGap={16}
									/>
									<YAxis tick={{fill: theme.textMuted, fontSize: 10}} stroke={theme.grid} width={44} tickFormatter={formatAxisTick} />
									<Tooltip
										contentStyle={{
											background: theme.surface,
											border: `1px solid ${theme.grid}`,
											borderRadius: 8,
											color: theme.text,
											fontSize: 12
										}}
										formatter={(value: unknown) => [formatNumber(value), 'claims'] as [string, string]}
									/>
									<Line
										type="monotone"
										dataKey="claimCount"
										name="claims"
										stroke={seriesColour(theme, 0)}
										strokeWidth={2}
										dot={false}
										activeDot={{r: 5}}
									/>
								</LineChart>
							</ResponsiveContainer>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
