import {AlertTriangle, ShieldAlert, Sparkles} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {Card, CardContent} from '@/components/ui/card';
import {useExamples} from '@/_shared/queries';
import type {ApiError} from '@/_shared/apiService/apiService';
import {useConversation, type Turn} from './AnswerStore';
import Composer from './Composer';
import ResultRenderer from './ResultRenderer';
import SqlPanel from './SqlPanel';

/**
 * The conversational surface — a thread with a composer pinned to the bottom.
 *
 * ── Why this is a route, and why it is a thread ─────────────────────────────
 *
 * An earlier build stacked the question box, the answer, the SQL panel, the trend chart
 * and the history into one scrolling column on the dashboard. Three problems followed:
 * an answer landed below the fold so asking appeared to do nothing; the proven figures
 * and the generated answer sat in the same visual register, which is the one distinction
 * a reader most needs to keep; and everything competed for the same width in a product
 * whose output is charts.
 *
 * Making it a thread adds the thing a single-answer view cannot do: **comparison**. An
 * analyst asks broadly, narrows, and reads both. And a refusal stays in place, above the
 * question that succeeded after it — which is where it teaches something, because the
 * pair is the lesson.
 *
 * The composer is `sticky`, not fixed: the page owns one scroll container, the thread
 * grows into it, and the composer rides the bottom edge. Nothing is measured in
 * JavaScript, so nothing can disagree with the layout.
 */
export default function Ask() {
	const {turns, busy, ask} = useConversation();
	const examples = useExamples();
	const endRef = useRef<HTMLDivElement>(null);

	// The history page hands a question over through navigation state. Reading it here
	// rather than through a store keeps the two pages independent.
	const seed = (useLocation().state as {question?: string} | null)?.question;

	// Follow the newest turn. Keyed on the count and the busy flag, so it fires when a
	// question is added and again when its answer lands.
	useEffect(() => {
		endRef.current?.scrollIntoView({behavior: 'smooth', block: 'end'});
	}, [turns.length, busy]);

	const empty = turns.length === 0;

	return (
		<div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
			{empty ? (
				<Welcome examples={examples.data ?? []} onPick={question => void ask(question)} busy={busy} />
			) : (
				<div className="flex-1 space-y-8 pt-2">
					{turns.map(turn => (
						<TurnBlock key={turn.id} turn={turn} />
					))}
				</div>
			)}

			{/*
			 * The mask under the composer is a gradient, not a solid: content scrolling
			 * beneath fades rather than being clipped at a hard line, so it stays obvious
			 * that there is more above.
			 */}
			<div className="sticky bottom-0 z-10 -mx-1 bg-gradient-to-t from-background via-background to-transparent px-1 pt-6 pb-3">
				<Composer onAsk={question => void ask(question)} busy={busy} seed={seed} autoFocus={empty} />
			</div>

			{/*
			 * The scroll sentinel sits AFTER the composer, deliberately.
			 *
			 * Placed before it, `scrollIntoView` put the last turn flush against the
			 * viewport bottom — where the sticky composer then covered it, so every answer
			 * arrived with its footer and the bottom of its chart hidden behind the input.
			 * A sticky element still occupies its place in flow, so scrolling to a point
			 * past it lands at the true bottom, with the composer resting below the last
			 * card rather than on top of it.
			 */}
			<div ref={endRef} aria-hidden="true" />
		</div>
	);
}

/** One question and whatever came back for it. */
function TurnBlock({turn}: {turn: Turn}) {
	return (
		<div className="space-y-3">
			{/*
			 * The question, right-aligned in a filled bubble. The asymmetry is doing work:
			 * what you asked and what the system answered must never be mistakable for one
			 * another, and side plus fill separates them without needing a label.
			 */}
			<div className="flex justify-end">
				<p className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-sm break-words">
					{turn.question}
				</p>
			</div>

			{turn.status === 'thinking' && <Thinking />}

			{turn.status === 'refused' && turn.failure && <Failure error={turn.failure} />}

			{turn.status === 'answered' && turn.answer && (
				<div className="space-y-3">
					{/*
					 * KEYED ON THE ANSWER (defect D-20). The renderer seeds its presentation
					 * from the server's `chartType` in a mount-only initialiser, so reusing an
					 * instance across answers carried the previous question's chart onto the
					 * new one's data — a line chart of vehicle categories, which is exactly
					 * what the server's chart reconciliation exists to prevent.
					 */}
					<ResultRenderer key={turn.answer.queryId} answer={turn.answer} />
					{/* Renders only when the key is present in the payload, which is a server
					    decision (FR-05), not a client one. */}
					<SqlPanel key={`sql-${turn.answer.queryId}`} sql={turn.answer.generatedSql} />
				</div>
			)}
		</div>
	);
}

/**
 * What the question is actually going through, in the product's own words.
 *
 * ── These are PACED, not measured — and the wording is chosen accordingly ────
 *
 * The whole pipeline is one HTTP request, so the client cannot observe the boundary
 * between generation, validation and execution. Advancing on a timer is therefore the
 * only option, and it means the labels must be defensible **as a description of the
 * journey** rather than as a claim about where the request is right now. Nothing here
 * renders a percentage or a "step 3 of 5", because that would assert a precision the
 * client does not have.
 *
 * The wording is the product's own stage names (see `/how-it-works`), which is what keeps
 * it honest. Two phrasings were specifically avoided:
 *
 *   "Analysing your data"  — the model is NEVER shown table contents (ADR-06). Saying
 *                            this in the one moment the user is watching would undercut
 *                            the product's central claim to sell a loading spinner.
 *   "Thinking"             — invites the reader to over-read what is happening.
 *
 * The sequence HOLDS on the last label rather than looping. Looping back to the first
 * would read as "it started over", which is exactly the wrong thing to suggest to someone
 * already waiting.
 */
const STAGES = [
	'Reading the schema…',
	'Writing a query…',
	'Checking it is safe to run…',
	'Running it read-only…',
	'Preparing the result…'
] as const;

/** Roughly the shape of a real request: generation dominates, the rest is fast. */
const STAGE_MS = 1500;

function Thinking() {
	const [stage, setStage] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setStage(current => (current < STAGES.length - 1 ? current + 1 : current));
		}, STAGE_MS);
		return () => clearInterval(timer);
	}, []);

	return (
		<div className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground">
			<span className="flex gap-1" aria-hidden="true">
				{[0, 1, 2].map(index => (
					<span
						key={index}
						className="size-1.5 rounded-full bg-current"
						style={{animation: `prudentia-pulse 1.2s ${index * 0.15}s infinite ease-in-out`}}
					/>
				))}
			</span>
			{/*
			 * `aria-live="polite"` so a screen reader is told the wait is progressing, but
			 * only between utterances — an assertive region would interrupt the reader
			 * every 1.5 seconds to say nothing they can act on.
			 */}
			<span role="status" aria-live="polite">
				{STAGES[stage]}
			</span>
		</div>
	);
}

/** The empty state: what this is for, and eight ways in. */
function Welcome({examples, onPick, busy}: {examples: string[]; onPick: (q: string) => void; busy: boolean}) {
	return (
		<div className="flex flex-1 flex-col justify-center py-10">
			<div className="flex size-10 items-center justify-center rounded-xl bg-navy text-white">
				<Sparkles className="size-5" />
			</div>
			<h1 className="mt-4 text-2xl font-semibold tracking-tight">Ask the portfolio a question</h1>
			<p className="mt-1.5 max-w-lg text-sm text-muted-foreground">
				Plain English becomes a PostgreSQL <code className="font-mono text-[13px]">SELECT</code>, which is
				checked against a whitelist before anything runs. Questions outside the schema are refused, and the
				refusal is recorded.
			</p>

			{examples.length > 0 && (
				<div className="mt-7">
					<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Try one</p>
					<div className="mt-3 grid gap-2 sm:grid-cols-2">
						{examples.map(example => (
							<button
								key={example}
								type="button"
								disabled={busy}
								onClick={() => onPick(example)}
								className="rounded-xl border bg-card px-3.5 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent disabled:opacity-50">
								{example}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * The failure states.
 *
 * A 503 reads as a WARNING, not an error: the assistant is down, the overview and the
 * history are not, and the message says so. Rendering it in the same alarming red as a
 * blocked question would tell the reader the product is broken when most of it is
 * working one click away.
 *
 * The text is whatever the server sent, verbatim. It is one fixed sentence by design —
 * the client must not elaborate, because any elaboration would be the client inventing a
 * distinction the server deliberately refused to make (CLAUDE.md §4 rule 7).
 */
function Failure({error}: {error: ApiError}) {
	const unavailable = error.status === 503;
	const Icon = unavailable ? AlertTriangle : ShieldAlert;

	return (
		<Card
			role="alert"
			className={unavailable ? 'border-warning/40 bg-warning/5' : 'border-critical/40 bg-critical/5'}>
			<CardContent className="flex gap-3">
				<Icon className={`mt-0.5 size-5 shrink-0 ${unavailable ? 'text-warning' : 'text-critical'}`} />
				<div className="min-w-0">
					<p className={`text-sm font-medium ${unavailable ? 'text-warning' : 'text-critical'}`}>
						{unavailable ? 'Assistant unavailable' : 'Question not answered'}
					</p>
					<p className="mt-1 text-sm">{error.message}</p>
				</div>
			</CardContent>
		</Card>
	);
}
