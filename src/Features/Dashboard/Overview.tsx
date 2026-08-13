import {BarChart3, MessageSquare} from 'lucide-react';
import {Link} from 'react-router-dom';
import PageWrapper from '@/components/PageWrapper';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {useHeadlineMetrics, useTrend} from '@/_shared/queries';
import KpiTiles from './KpiTiles';
import TrendChart from './TrendChart';

/**
 * The overview (FR-22).
 *
 * Deliberately contains NO conversational surface. The dashboard's job is to be the part
 * of the product that is always right and always available: hand-written SQL, no model in
 * the path, unaffected by a provider outage (NFR-12). Mixing the question box in here
 * blurred that line in the previous build — a reader could not tell at a glance which
 * numbers came from a proven query and which from a generated one.
 */
export default function Overview() {
	const metrics = useHeadlineMetrics();
	const trend = useTrend();

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

			<div className="grid gap-4 lg:grid-cols-3">
				<div className="min-w-0 lg:col-span-2">
					<TrendChart points={trend.data} loading={trend.isLoading} />
				</div>

				<Card className="min-w-0">
					<CardHeader>
						<CardTitle className="text-sm">How an answer is produced</CardTitle>
						<CardDescription>Six stages, one of which can refuse.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 text-sm">
						{/*
						 * This is the product's argument, stated where a reader will meet it.
						 * A user who does not know the gate exists cannot calibrate how much
						 * to trust an answer, and a user who is only told "it is safe" has
						 * been asked to take it on faith.
						 */}
						{[
							['Your question', 'Capped at 500 characters and recorded before anything runs.'],
							['Schema context', 'The model is shown table and column descriptions — never any data.'],
							['A proposed statement', 'Returned as structured output, so it can only be SQL or a refusal.'],
							['Validation', 'Parsed by PostgreSQL’s own parser. One SELECT, whitelisted tables, or it is refused.'],
							['Guarded execution', 'A read-only role, a statement timeout and a 1,000-row ceiling.'],
							['The result', 'Shown as a number, a chart or a table — whichever the data actually supports.']
						].map(([title, detail], index) => (
							<div key={title} className="flex gap-3">
								<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium tabular-nums">
									{index + 1}
								</span>
								<div className="min-w-0">
									<p className="font-medium">{title}</p>
									<p className="text-xs text-muted-foreground">{detail}</p>
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</PageWrapper>
	);
}
