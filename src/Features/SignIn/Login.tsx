import {Loader2, ShieldCheck} from 'lucide-react';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

/**
 * Sign in (FR-01, FR-03).
 *
 * ── There are deliberately NO demonstration-account buttons here ────────────
 *
 * An earlier version offered one-click Executive and Analyst logins, which made the role
 * difference easy to explore. On a deployed instance those buttons are working
 * credentials printed on the front door of a system that spends money per question: any
 * visitor could sign in and run the model at the operator's expense, and every question
 * they asked would be audited against a shared account, so the log would no longer
 * identify who did anything.
 *
 * Convenience during development is not worth either of those. Credentials for the
 * demonstration accounts live in the seed and the runbook, where the person who deployed
 * the system can read them and nobody else can.
 *
 * ── The error message is fixed, and that is a control ───────────────────────
 *
 * The server answers an unknown account and a wrong password identically (TH-08). The
 * client must not invent a distinction the API deliberately refused to make — "no such
 * user" would turn this form into an account-enumeration oracle.
 */

interface Props {
	onSignIn: (email: string, password: string) => Promise<unknown>;
	expired: boolean;
}

export default function Login({onSignIn, expired}: Props) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (busy) return;

		setBusy(true);
		setError(null);
		try {
			await onSignIn(email, password);
		} catch {
			setError('Those credentials were not accepted.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<main className="flex min-h-full items-center justify-center bg-background p-6">
			<div className="w-full max-w-sm">
				<div className="mb-6 flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
						<ShieldCheck className="size-5" />
					</div>
					<div>
						<h1 className="text-xl font-semibold tracking-tight">PrudenTia</h1>
						<p className="text-sm text-muted-foreground">Motor insurance analytics</p>
					</div>
				</div>

				{expired && (
					<Card className="mb-4 border-warning/40 bg-warning/5">
						<CardContent className="py-3 text-sm">
							Your session expired. Sign in again — nothing was lost.
						</CardContent>
					</Card>
				)}

				<Card>
					<CardContent>
						<form className="space-y-4" onSubmit={submit}>
							<div className="space-y-1.5">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									autoComplete="username"
									required
									value={email}
									onChange={event => setEmail(event.target.value)}
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									autoComplete="current-password"
									required
									value={password}
									onChange={event => setPassword(event.target.value)}
								/>
							</div>

							{error && (
								<p role="alert" className="text-sm text-critical">
									{error}
								</p>
							)}

							<Button type="submit" className="w-full" disabled={busy}>
								{busy && <Loader2 className="size-4 animate-spin" />}
								{busy ? 'Signing in…' : 'Sign in'}
							</Button>
						</form>
					</CardContent>
				</Card>

				<p className="mt-6 text-center text-xs text-muted-foreground">
					Accounts are issued by the administrator. Sessions last 60 minutes.
				</p>
			</div>
		</main>
	);
}
