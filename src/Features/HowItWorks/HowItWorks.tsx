import {CheckCircle2, Database, Lock, MessageSquare, ShieldCheck, Table2, XCircle} from 'lucide-react';
import PageWrapper from '@/components/PageWrapper';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';

/**
 * How an answer is produced — its own section.
 *
 * ── Why this is a page and not a card ───────────────────────────────────────
 *
 * It began as a panel beside the trend chart on the Overview, where it competed with the
 * numbers for attention and had room for six one-line summaries. But this is the
 * product's actual argument: a user is being asked to trust figures written by a language
 * model, and the only honest basis for that trust is understanding what checks the figure
 * passed on its way to the screen. Six lines squeezed into a sidebar states the claim;
 * it does not let anyone verify it.
 *
 * Given a page, the same content can say what each stage refuses, why the read-only role
 * exists even though the gate should already have caught everything, and what the system
 * cannot do — which is the part a reader most needs and the part a marketing panel always
 * omits.
 */

const STAGES = [
	{
		icon: MessageSquare,
		title: 'Your question',
		detail:
			'Capped at 500 characters and written to the audit log before anything else happens. Every attempt is recorded — answered, refused or failed — because the refused ones are the security-relevant records.'
	},
	{
		icon: Database,
		title: 'Schema context',
		detail:
			'The model is shown table names, column names, their descriptions and a glossary of what each metric means. It is never shown a single row of data, so it cannot repeat back a value it was not supposed to see.'
	},
	{
		icon: MessageSquare,
		title: 'A proposed statement',
		detail:
			'The model must reply by calling one of exactly two tools: propose a SELECT, or decline. Free prose is not rejected — it is structurally impossible, because the request forces a tool call. Declining is a correct answer, not a failure.'
	},
	{
		icon: ShieldCheck,
		title: 'Validation',
		detail:
			'The proposed statement is parsed by PostgreSQL’s own parser — the same one the server uses, so the validator and the database cannot disagree about what a statement means. It must be exactly one SELECT over whitelisted tables and columns, with no comments, no writes, no locks, and no functions outside a short allowed list. Anything else is refused.'
	},
	{
		icon: Lock,
		title: 'Guarded execution',
		detail:
			'Only then does it run — through a database role that holds SELECT on the eight analytics tables and no permission at all on the user or audit tables, under a 10-second statement timeout, wrapped in a 1,000-row ceiling. If the validation gate somehow let something through, this role still cannot write, and still cannot read a password.'
	},
	{
		icon: Table2,
		title: 'The result',
		detail:
			'The shape that actually came back decides the presentation, not the model’s guess. One number is a number. Categories are bars, never a line. Three or more columns is a table, because a chart of three columns has to drop one.'
	}
];

const REFUSALS = [
	'Anything that writes, deletes or alters — the role could not do it anyway',
	'Tables outside the eight analytics tables, including the user and audit tables',
	'SQL comments, which are stripped by parsers and can hide a second statement',
	'Questions about a named individual — the schema holds no personal data to answer with',
	'Predictions and forecasts, which this data cannot support'
];

export default function HowItWorks() {
	return (
		<PageWrapper
			title="How an answer is produced"
			subtitle="Six stages, one of which can refuse"
			icon={ShieldCheck}>
			<div className="mx-auto min-w-0 max-w-4xl space-y-4">
				<Card>
					<CardContent className="text-sm">
						<p>
							{/* The thesis, stated once, plainly. Everything below is evidence for it. */}
							A language model writes the SQL for your question. It is treated as an{' '}
							<strong className="font-semibold">untrusted component</strong> — its output is
							proven safe before it runs, never assumed safe. That proof is what the stages
							below describe.
						</p>
						<p className="mt-3 text-muted-foreground">
							The figures on the Overview take none of this path. They are computed by SQL
							written by hand and reviewed, which is why they keep working when the assistant
							does not.
						</p>
					</CardContent>
				</Card>

				<ol className="space-y-3">
					{STAGES.map((stage, index) => (
						<li key={stage.title}>
							<Card>
								<CardContent className="flex gap-4">
									<div className="flex flex-col items-center">
										<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
											<stage.icon className="size-[18px]" />
										</div>
										{/* A connector, so the six read as a sequence rather than six
										    unrelated cards. Not drawn after the last one. */}
										{index < STAGES.length - 1 && (
											<div className="mt-2 w-px flex-1 bg-border" aria-hidden="true" />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-baseline gap-2">
											<span className="text-xs tabular-nums text-muted-foreground">
												{index + 1}
											</span>
											<h2 className="font-medium">{stage.title}</h2>
										</div>
										<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
											{stage.detail}
										</p>
									</div>
								</CardContent>
							</Card>
						</li>
					))}
				</ol>

				<div className="grid gap-4 md:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm">
								<XCircle className="size-4 text-critical" />
								What is always refused
							</CardTitle>
							<CardDescription>
								A refusal is recorded in your history with its reason.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="space-y-2 text-sm text-muted-foreground">
								{REFUSALS.map(item => (
									<li key={item} className="flex gap-2">
										<span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-critical" />
										<span>{item}</span>
									</li>
								))}
							</ul>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm">
								<CheckCircle2 className="size-4 text-ok" />
								What this does not protect you from
							</CardTitle>
							<CardDescription>
								The honest limits. Read these before relying on an answer.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{/*
							 * The most important card on the page, and the one a product page
							 * would leave out. The gate proves a statement is SAFE. It cannot
							 * prove the statement answers the question that was asked — and a
							 * confident answer to the wrong question is the failure mode this
							 * system is most likely to produce.
							 */}
							<ul className="space-y-2 text-sm text-muted-foreground">
								<li className="flex gap-2">
									<span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-warning" />
									<span>
										<strong className="font-medium text-foreground">
											A safe query can still be the wrong query.
										</strong>{' '}
										The checks prove a statement cannot harm the database. They cannot
										prove it answers what you meant. Read the explanation above each
										answer — that is what it is for.
									</span>
								</li>
								<li className="flex gap-2">
									<span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-warning" />
									<span>
										Joins can inflate totals. A common pattern understates loss ratio by
										a small margin; the Overview avoids it, a generated query may not.
									</span>
								</li>
								<li className="flex gap-2">
									<span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-warning" />
									<span>
										Results are capped at 1,000 rows. A capped answer says so beneath
										the chart.
									</span>
								</li>
							</ul>
						</CardContent>
					</Card>
				</div>
			</div>
		</PageWrapper>
	);
}
