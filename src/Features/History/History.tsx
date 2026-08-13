import {History as HistoryIcon, RotateCcw} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import PageWrapper from '@/components/PageWrapper';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {useHistory} from '@/_shared/queries';
import type {HistoryEntry} from '@/_shared/types';

/**
 * The caller's own last 25 questions (FR-25).
 *
 * ── Blocked questions are SHOWN, not hidden (docs §8.3) ─────────────────────
 *
 * The instinct is to list successes and quietly drop the rest, because a list of failures
 * looks like a broken product. It is the opposite: the control is only trustworthy if it
 * is visible operating. A user who watches a question get blocked, rephrases it, and
 * watches the next one succeed has learnt something true about the system. A user shown
 * only successes has been told the gate never fires.
 *
 * Status is never colour alone — every row carries a word as well as a dot, so the
 * distinction survives a colourblind reader, a greyscale print and forced-colors mode.
 */

type Tone = 'ok' | 'warning' | 'critical';

function statusOf(entry: HistoryEntry): {label: string; tone: Tone} {
	if (entry.validationStatus === 'REJECTED') {
		if (entry.executionStatus === 'PROVIDER_UNAVAILABLE') return {label: 'Unavailable', tone: 'warning'};
		return {label: 'Blocked', tone: 'critical'};
	}
	if (entry.executionStatus === 'TIMEOUT') return {label: 'Timed out', tone: 'warning'};
	if (entry.executionStatus === 'ERROR') return {label: 'Failed', tone: 'critical'};
	return {label: 'Answered', tone: 'ok'};
}

const DOT: Record<Tone, string> = {ok: 'bg-ok', warning: 'bg-warning', critical: 'bg-critical'};
const TEXT: Record<Tone, string> = {ok: 'text-ok', warning: 'text-warning', critical: 'text-critical'};

export default function History() {
	const navigate = useNavigate();
	const {data: entries, isLoading} = useHistory();

	const reuse = (question: string) => navigate('/ask', {state: {question}});

	return (
		<PageWrapper
			title="History"
			subtitle="Every question you have asked — answered or blocked"
			icon={HistoryIcon}>
			<Card className="mx-auto min-w-0 max-w-4xl gap-0 overflow-hidden py-0">
				<div className="border-b px-4 py-3">
					<p className="text-xs text-muted-foreground">
						Blocked questions are listed too — the control is meant to be seen working.
					</p>
				</div>

				{isLoading ? (
					<CardContent className="space-y-2 py-4">
						{Array.from({length: 5}, (_, index) => (
							<Skeleton key={index} className="h-12 w-full" />
						))}
					</CardContent>
				) : (entries?.length ?? 0) === 0 ? (
					<CardContent className="py-14 text-center">
						<p className="text-sm text-muted-foreground">Nothing yet.</p>
						<Button variant="outline" className="mt-3" onClick={() => navigate('/ask')}>
							Ask your first question
						</Button>
					</CardContent>
				) : (
					<ul className="divide-y">
						{entries?.map(entry => {
							const status = statusOf(entry);
							return (
								<li key={entry.id} className="group flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
									<span
										aria-hidden="true"
										className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[status.tone]}`}
									/>

									<div className="min-w-0 flex-1">
										<p className="text-sm">{entry.question}</p>
										<p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
											<span className={TEXT[status.tone]}>{status.label}</span>
											{entry.rowCount !== null && (
												<span>
													{entry.rowCount.toLocaleString('en-GB')}{' '}
													{entry.rowCount === 1 ? 'row' : 'rows'}
												</span>
											)}
											{entry.durationMs !== null && <span>{entry.durationMs} ms</span>}
											<span>
												{new Date(entry.createdAt).toLocaleString('en-GB', {
													day: '2-digit',
													month: 'short',
													hour: '2-digit',
													minute: '2-digit'
												})}
											</span>
										</p>

										{/*
										 * ANALYST only — and the keys are simply ABSENT for
										 * everyone else, so this renders or it does not, with no
										 * role check on the client. `failedCheck` names which of
										 * the ten gate checks fired and `rejectionReason` says
										 * why, which together are exactly the oracle an executive
										 * must not be handed and exactly what an analyst is for.
										 *
										 * ── The reason was being fetched and discarded (D-36) ──
										 *
										 * Only the check was shown. That is the least useful half:
										 * `provider_declined` says a refusal happened, while the
										 * reason says the question asked for a forecast the schema
										 * cannot support and names the descriptive question that
										 * would have worked. Since the user sees one deliberately
										 * generic sentence at the point of refusal (TD-Q, so the
										 * message cannot be used to probe the boundary), this row
										 * is the ONLY place an analyst can find out why — and it
										 * was dropping the answer on the floor.
										 */}
										{(entry.failedCheck || entry.rejectionReason) && (
											<div className="mt-1.5 rounded-md border border-border/70 bg-muted/40 px-2.5 py-1.5">
												{entry.failedCheck && (
													<p className="font-mono text-[11px] text-muted-foreground">
														check: {entry.failedCheck}
													</p>
												)}
												{entry.rejectionReason && (
													<p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
														{entry.rejectionReason}
													</p>
												)}
											</div>
										)}
									</div>

									{/*
									 * Always visible, not hover-revealed. A control that only
									 * appears on hover does not exist on a touch screen, and
									 * this is the one action on the page.
									 */}
									<Button
										variant="ghost"
										size="sm"
										className="shrink-0 text-muted-foreground hover:text-foreground"
										onClick={() => reuse(entry.question)}>
										<RotateCcw className="size-3.5" />
										Reuse
									</Button>
								</li>
							);
						})}
					</ul>
				)}
			</Card>
		</PageWrapper>
	);
}
