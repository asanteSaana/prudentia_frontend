import {useState} from 'react';
import {Card} from '@/components/ui/card';

/**
 * The generated SQL, for an ANALYST (FR-05, FR-24).
 *
 * ── Why this component takes `sql?: string` and renders nothing when absent ──
 *
 * The server DELETES the `generatedSql` key for an EXECUTIVE — it is not null, it is
 * absent from the JSON. So this component does not decide who may see the SQL; it
 * renders what arrived. There is deliberately no `role` prop and no `if (isAnalyst)`
 * here: a client-side role check would suggest the payload contains the SQL and the
 * interface is politely declining to show it, which is exactly the wrong mental model
 * for anyone maintaining this later.
 *
 * Collapsed by default because the SQL is verification, not the answer. An analyst opens
 * it to check the system did what they meant; an analyst who is not checking should not
 * have to scroll past it.
 */

interface Props {
	sql?: string;
}

export default function SqlPanel({sql}: Props) {
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);

	if (!sql) return null;

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(sql);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1500);
		} catch {
			// Clipboard access is permission-gated and can simply be refused. The SQL is
			// on screen and selectable; a failed copy is not worth an error state.
		}
	};

	return (
		<Card className="gap-0 overflow-hidden py-0">
			<button
				type="button"
				onClick={() => setOpen(current => !current)}
				aria-expanded={open}
				className="flex w-full items-center justify-between px-4 py-2.5 text-left">
				<span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Generated SQL
				</span>
				<span className="text-xs text-muted-foreground">{open ? 'Hide' : 'Show'}</span>
			</button>

			{open && (
				<div className="border-t px-4 py-3">
					{/*
					 * This is `normalisedSql` — the WRAPPED statement, exactly as executed:
					 *
					 *   SELECT * FROM ( <the model's SELECT> ) AS _guarded LIMIT 1000
					 *
					 * The wrapper is shown, not stripped. An analyst verifying an answer
					 * needs the statement the database actually ran, and the row ceiling is
					 * part of what ran — hiding it would make the transparency panel a
					 * prettier version of the truth rather than the truth. It also makes the
					 * ceiling visible as a possible explanation for a short result.
					 *
					 * It scrolls in its own box; the page never scrolls sideways.
					 */}
					<pre className="overflow-x-auto text-xs leading-relaxed whitespace-pre">
						<code>{sql}</code>
					</pre>

					<div className="mt-3 flex items-center gap-3">
						<button
							type="button"
							onClick={() => void copy()}
							className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:border-foreground/30">
							{copied ? 'Copied' : 'Copy'}
						</button>
						<p className="text-xs text-muted-foreground">
							Validated as a single SELECT, then executed under a read-only role.
						</p>
					</div>
				</div>
			)}
		</Card>
	);
}
