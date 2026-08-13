import {Card} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import type {HeadlineMetrics} from '@/_shared/types';

/**
 * The headline figures (FR-22).
 *
 * These are stat tiles, not charts — the form heuristic's answer for "a single headline
 * number" is a number, and drawing six one-point charts here would add ink without
 * adding information.
 *
 * They come from hand-written SQL that never touches the model, so they are the part of
 * the interface the user manual says can be relied on. They also stay populated when the
 * assistant is unavailable (NFR-12).
 */

interface Props {
	metrics: HeadlineMetrics | undefined;
	loading: boolean;
}

const money = (value: number) =>
	value >= 1_000_000
		? `GHS ${(value / 1_000_000).toFixed(1)}M`
		: `GHS ${value.toLocaleString('en-GB', {maximumFractionDigits: 0})}`;

export default function KpiTiles({metrics, loading}: Props) {
	if (loading) {
		return (
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
				{Array.from({length: 6}, (_, index) => (
					<Skeleton key={index} className="h-[92px] rounded-xl" />
				))}
			</div>
		);
	}

	if (!metrics) {
		return (
			<Card className="px-4 py-3 text-sm text-muted-foreground">Headline figures are unavailable.</Card>
		);
	}

	/**
	 * Loss ratio above 1.0 renders in the critical colour: claims exceed premium earned,
	 * which is the one number on this row that carries its own alarm.
	 *
	 * The colour is never the only signal — the note beneath says the same thing in
	 * words, so a colourblind reader, a greyscale print and forced-colors mode all keep
	 * the meaning.
	 */
	const lossRatioCritical = metrics.lossRatio > 1;

	const tiles = [
		{
			label: 'Loss ratio',
			value: metrics.lossRatio.toFixed(3),
			note: lossRatioCritical ? 'Claims exceed premium earned' : 'Claims ÷ premium earned',
			critical: lossRatioCritical
		},
		{label: 'Claim frequency', value: metrics.claimFrequency.toFixed(3), note: 'Claims per policy'},
		{label: 'Average severity', value: money(metrics.averageSeverity), note: 'Mean cost per claim'},
		{label: 'Earned premium', value: money(metrics.earnedPremium), note: 'Cover already provided'},
		{label: 'Active policies', value: metrics.activePolicies.toLocaleString('en-GB'), note: 'Status ACTIVE'},
		{
			label: 'Settlement time',
			value: `${metrics.averageSettlementDays.toFixed(1)} d`,
			note: 'Notification to settlement'
		}
	];

	return (
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
			{tiles.map(tile => (
				<Card key={tile.label} className="gap-0 px-4 py-3">
					<p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
						{tile.label}
					</p>
					<p className={`mt-1.5 text-2xl font-semibold tabular-nums ${tile.critical ? 'text-critical' : ''}`}>
						{tile.value}
					</p>
					<p className="mt-1 truncate text-[11px] text-muted-foreground">{tile.note}</p>
				</Card>
			))}
		</div>
	);
}
