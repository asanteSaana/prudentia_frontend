import {ArrowUp, Square} from 'lucide-react';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {cn} from '@/lib/utils';

/**
 * The composer (FR-08).
 *
 * Modelled on a modern chat composer: one rounded field that contains the textarea and
 * the send control, the textarea growing with its content up to a ceiling and then
 * scrolling internally. The border lives on the container, not the textarea, so the whole
 * thing reads as a single object and the focus ring lands around all of it.
 *
 * The 500-character cap matches the server's zod schema exactly. The client enforces it
 * so nobody is told "too long" after a round trip; the server enforces it because the
 * client's enforcement is a courtesy, not a control.
 */

const MAX_QUESTION = 500;
const MAX_HEIGHT = 200;

interface Props {
	onAsk: (question: string) => void;
	busy: boolean;
	/** A question lifted out of the history, to start from. */
	seed?: string;
	autoFocus?: boolean;
}

export default function Composer({onAsk, busy, seed, autoFocus}: Props) {
	const [question, setQuestion] = useState(seed ?? '');
	const boxRef = useRef<HTMLTextAreaElement>(null);

	// Grow to fit, then scroll. Reset to `auto` first or the box can only ever get
	// taller — scrollHeight is measured against the height already set.
	useLayoutEffect(() => {
		const box = boxRef.current;
		if (!box) return;
		box.style.height = 'auto';
		box.style.height = `${Math.min(box.scrollHeight, MAX_HEIGHT)}px`;
	}, [question]);

	// A seed arriving from another route replaces what is in the box and focuses it.
	// Guarded on `seed` alone, so ordinary typing is never overwritten.
	useEffect(() => {
		if (seed === undefined) return;
		setQuestion(seed);
		boxRef.current?.focus();
	}, [seed]);

	useEffect(() => {
		if (autoFocus) boxRef.current?.focus();
	}, [autoFocus]);

	const trimmed = question.trim();
	const canSend = trimmed.length > 0 && !busy;

	const submit = () => {
		if (!canSend) return;
		onAsk(trimmed);
		// Cleared on send, like a chat composer — the question is now in the thread above,
		// so leaving a copy in the box would be the same text twice.
		setQuestion('');
	};

	return (
		<div>
			<div
				className={cn(
					'rounded-2xl border bg-card shadow-sm transition-colors',
					'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25'
				)}>
				<textarea
					id="question"
					ref={boxRef}
					rows={1}
					value={question}
					maxLength={MAX_QUESTION}
					disabled={busy}
					placeholder="Ask about policies, claims, premiums, garages or regions…"
					onChange={event => setQuestion(event.target.value)}
					onKeyDown={event => {
						// Enter sends; Shift+Enter is a newline. A composer that cannot be
						// sent from the keyboard is one people stop using.
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault();
							submit();
						}
					}}
					className="block max-h-[200px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
				/>

				<div className="flex items-center justify-between gap-3 px-3 pb-2.5">
					<p className="truncate text-[11px] text-muted-foreground">
						{/* The budget only appears once it is worth knowing about. A counter
						    sitting at 0/500 from the first frame is noise. */}
						{question.length > MAX_QUESTION * 0.6
							? `${question.length}/${MAX_QUESTION}`
							: 'Enter to send · Shift+Enter for a new line'}
					</p>

					<button
						type="button"
						onClick={submit}
						disabled={!canSend}
						aria-label={busy ? 'Waiting for an answer' : 'Send question'}
						className={cn(
							'flex size-8 shrink-0 items-center justify-center rounded-full transition-colors',
							canSend
								? 'bg-primary text-primary-foreground hover:opacity-90'
								: 'bg-muted text-muted-foreground'
						)}>
						{busy ? <Square className="size-3 fill-current" /> : <ArrowUp className="size-4" />}
					</button>
				</div>
			</div>

			{/*
			 * Said once, under the composer, where it is read before the first question
			 * rather than discovered by being refused. The product's control is not a
			 * secret and stating it plainly is what makes a later refusal legible.
			 */}
			<p className="mt-2 px-1 text-center text-[11px] text-muted-foreground">
				Every statement is validated before it runs and executed read-only. Answers can be wrong —
				check the explanation.
			</p>
		</div>
	);
}
