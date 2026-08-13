import {BarChart3, MessageSquare} from 'lucide-react';
import {Link} from 'react-router-dom';
import PageWrapper from '@/components/PageWrapper';
import {Button} from '@/components/ui/button';
import {useBreakdowns, useHeadlineMetrics, useTrend} from '@/_shared/queries';
import BreakdownChart from './BreakdownChart';
import KpiTiles from './KpiTiles';
import TrendChart from './TrendChart';

/**
 * The overview (FR-22).
 *
 * Deliberately contains NO conversational surface. The dashboard's job is to be the part
 * of the product that is always right and always available: hand-written SQL, no model in
 * the path, unaffected by a provider outage (NFR-12). Mixing the question box in here
 * blurred that line in an earlier build — a reader could not tell at a glance which
 * numbers came from a proven query and which from a generated one.
 *
 * Every figure and every chart on this page is computed by SQL written by hand and read
 * in review. That is why the page can carry a claim the Ask page never makes: these
 * numbers are right.
 */
export default function Overview() {
	const metrics = useHeadlineMetrics();
	const trend = useTrend();
	const breakdowns = useBreakdowns();

	const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

	return (
		<PageWrapper
			title="Overview"
			subtitle="Portfolio position, computed from hand-written SQL"
			icon={BarChart3}
			actions={
				<Button asChild>
					<Link to="/ask">
						<MessageSquare className="size-4" />
						Ask a question
					</Link>
				</Button>
			}>
			<KpiTiles metrics={metrics.data} loading={metrics.isLoading} />

			<TrendChart points={trend.data} loading={trend.isLoading} />

			<div className="grid gap-4 md:grid-cols-2">
				{/*
				 * Loss ratio first, and alarmed: it is the one figure on this page that can
				 * be bad rather than merely large. A region at or above 1.0 is paying out
				 * more than it earns, and it wears the reserved critical colour — never a
				 * series hue — with the number printed beside it so the meaning survives
				 * greyscale and colourblindness.
				 */}
				<BreakdownChart
					title="Loss ratio by region"
					description="Incurred claims ÷ earned premium. At or above 100% the region loses money."
					data={breakdowns.data?.lossRatioByRegion}
					loading={breakdowns.isLoading}
					form="hbar"
					colourIndex={0}
					format={percent}
					alarmAbove={1}
				/>

				<BreakdownChart
					title="Earned premium by channel"
					description="Where the book is written. Parts of one total, so a composition."
					data={breakdowns.data?.premiumByChannel}
					loading={breakdowns.isLoading}
					form="donut"
				/>

				<BreakdownChart
					title="Claims by cause"
					description="What is actually driving frequency."
					data={breakdowns.data?.claimsByCause}
					loading={breakdowns.isLoading}
					form="hbar"
					colourIndex={3}
				/>

				<BreakdownChart
					title="Policies by product"
					description="Cover mix across the in-force book."
					data={breakdowns.data?.policiesByProduct}
					loading={breakdowns.isLoading}
					form="donut"
				/>
			</div>

			<p className="text-center text-xs text-muted-foreground">
				{/* Says plainly what separates this page from the Ask page. A user who does
				    not know which numbers are proven cannot calibrate either. */}
				Every figure above comes from SQL written by hand and reviewed — no model is
				involved, and none of it stops working when the assistant does.{' '}
				<Link to="/how-it-works" className="underline underline-offset-2 hover:text-foreground">
					How an answer is produced
				</Link>
			</p>
		</PageWrapper>
	);
}
