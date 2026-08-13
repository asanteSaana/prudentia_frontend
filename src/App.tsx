import {Route, Routes} from 'react-router-dom';
import Authenticated from '@/Authenticated';
import Overview from '@/Features/Dashboard/Overview';
import History from '@/Features/History/History';
import Ask from '@/Features/QueryConsole/Ask';
import {AnswerProvider} from '@/Features/QueryConsole/AnswerStore';
import SchemaView from '@/Features/SchemaView/SchemaView';
import {useAuth} from '@/hooks/useAuth';

/**
 * The route table (template convention: routes composed at the app root, the shell
 * supplied by `Authenticated`).
 *
 * Four sections, because they answer four different questions and mixing them was the
 * problem with the previous single-page build:
 *
 *   /         what the portfolio looks like — proven SQL, no model in the path
 *   /ask      put a question to it
 *   /history  what you have asked, including what was refused
 *   /schema   what the model is shown  (ANALYST only)
 *
 * ── `/schema` is not conditionally routed ───────────────────────────────────
 *
 * It is registered for everyone and passed the role. Hiding the ROUTE would look like
 * authorisation and is not — the endpoint behind it is guarded server-side by
 * `@route({requiredRole: 'ANALYST'})`, which is where the decision belongs. What the
 * client does is avoid firing a request that would only 403, and avoid advertising a
 * page in the sidebar that an executive cannot use.
 */
export default function App() {
	const {session} = useAuth();

	return (
		<AnswerProvider>
			<Routes>
				<Route element={<Authenticated />}>
					<Route index element={<Overview />} />
					<Route path="ask" element={<Ask />} />
					<Route path="history" element={<History />} />
					<Route path="schema" element={<SchemaView role={session?.role ?? 'EXECUTIVE'} />} />
					{/* Unknown paths land on the overview rather than a dead end. */}
					<Route path="*" element={<Overview />} />
				</Route>
			</Routes>
		</AnswerProvider>
	);
}
