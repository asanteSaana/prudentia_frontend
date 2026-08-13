import {Database} from 'lucide-react';
import {useState} from 'react';
import PageWrapper from '@/components/PageWrapper';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {useSchema} from '@/_shared/queries';
import type {UserRole} from '@/_shared/types';

/**
 * What the model is shown (FR-05, FR-24) — ANALYST only.
 *
 * ── `rendered` is the literal system prompt, not a description of it ────────
 *
 * The toggle at the bottom shows the exact string `renderSchemaForLlm()` puts in the
 * prompt. That is the point: an analyst verifying how an answer was produced has to be
 * looking at the schema the model actually saw. A second, hand-maintained "human
 * friendly" copy would drift, and the drift would make the audit trail quietly wrong
 * while looking more helpful.
 *
 * The structured table above it is the same data, laid out for reading — rendered from
 * the same payload, not written out separately.
 */

interface Props {
	role: UserRole;
}

export default function SchemaView({role}: Props) {
	/**
	 * `isLoading`, NOT `isPending`.
	 *
	 * A DISABLED TanStack query reports `isPending: true` forever — it has no data and it
	 * never will, because it is not going to run. Gating the skeleton on `isPending` meant
	 * that when the role arrived wrong (defect D-25) this page showed a loading state that
	 * could never resolve, which reads as "slow" rather than "broken" and hid the real
	 * fault for far too long.
	 *
	 * `isLoading` is `isPending && isFetching`, so a disabled query falls through to the
	 * empty state below and says so.
	 */
	const {data, isLoading} = useSchema(role === 'ANALYST');
	const [showRaw, setShowRaw] = useState(false);

	return (
		<PageWrapper
			title="Schema"
			subtitle="Exactly what the model is told exists — and nothing else"
			icon={Database}>
			<div className="mx-auto min-w-0 max-w-5xl space-y-4">
				<Card>
					<CardContent className="text-sm text-muted-foreground">
						{/*
						 * ADR-06 in one sentence, where an analyst will read it. The model gets
						 * structure, never contents — so it cannot leak a row it was never shown,
						 * and the catalogue below is simultaneously what the gate permits.
						 */}
						The model receives these table and column descriptions and the metric glossary. It
						never receives table contents, sample rows or values. This same catalogue is what
						the validation gate permits — one source, so what the model is invited to write and
						what the gate will accept cannot drift apart.
					</CardContent>
				</Card>

				{isLoading ? (
					<Skeleton className="h-64 w-full" />
				) : !data ? (
					<Card>
						<CardContent className="py-10 text-center text-sm text-muted-foreground">
							The schema could not be loaded.
						</CardContent>
					</Card>
				) : (
					<>
						<div className="grid gap-4 md:grid-cols-2">
							{data.tables.map(table => (
								<Card key={table.name} className="min-w-0">
									<CardHeader>
										<CardTitle className="font-mono text-sm">{table.name}</CardTitle>
										<CardDescription>{table.description}</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="overflow-x-auto">
											<table className="w-full text-left text-xs">
												<tbody className="divide-y">
													{table.columns.map(column => (
														<tr key={column.name}>
															<td className="py-1.5 pr-3 align-top font-mono whitespace-nowrap">
																{column.name}
															</td>
															<td className="py-1.5 pr-3 align-top whitespace-nowrap text-muted-foreground">
																{column.type}
															</td>
															<td className="py-1.5 align-top text-muted-foreground">
																{column.description}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									</CardContent>
								</Card>
							))}
						</div>

						<Card>
							<CardHeader>
								<CardTitle className="text-sm">Metric glossary</CardTitle>
								<CardDescription>
									The definitions the model is held to, so "loss ratio" means one thing.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-2.5">
								{data.glossary.map(entry => (
									<div key={entry.term} className="text-sm">
										<p className="font-medium">{entry.term}</p>
										<p className="text-xs text-muted-foreground">{entry.definition}</p>
									</div>
								))}
							</CardContent>
						</Card>

						<Card className="gap-0 overflow-hidden py-0">
							<button
								type="button"
								onClick={() => setShowRaw(current => !current)}
								aria-expanded={showRaw}
								className="flex w-full items-center justify-between px-4 py-3 text-left">
								<span className="text-sm font-medium">The prompt as the model receives it</span>
								<span className="text-xs text-muted-foreground">{showRaw ? 'Hide' : 'Show'}</span>
							</button>
							{showRaw && (
								<div className="border-t px-4 py-3">
									<pre className="overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap">
										<code>{data.rendered}</code>
									</pre>
								</div>
							)}
						</Card>
					</>
				)}
			</div>
		</PageWrapper>
	);
}
