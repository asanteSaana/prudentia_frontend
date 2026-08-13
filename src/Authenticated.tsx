import {Outlet} from 'react-router-dom';
import {AppSidebar} from '@/components/app-sidebar';
import {NavUser} from '@/components/nav-user';
import {Separator} from '@/components/ui/separator';
import {SidebarInset, SidebarProvider, SidebarTrigger} from '@/components/ui/sidebar';
import {useAuth} from '@/hooks/useAuth';
import Login from '@/Features/SignIn/Login';

/**
 * The authenticated shell (template convention: `Authenticated.tsx` wrapping an `Outlet`).
 *
 * `SidebarProvider` → `AppSidebar` + `SidebarInset`, with the routed page rendered inside
 * the inset. Adopted from the template unchanged, because it is the arrangement its
 * `sidebar.tsx` is built for — collapse state, the mobile sheet, and the keyboard
 * shortcut all live in that provider.
 *
 * ── Authentication is a STATE, not a route ──────────────────────────────────
 *
 * There is no `/login` path and no redirect. With no session, the login screen replaces
 * the whole shell; with one, the shell renders. A route would add a URL that has to be
 * guarded, a redirect that has to preserve `from`, and a window in which a protected page
 * mounts and fires its requests before the guard resolves. None of that buys anything
 * here: the product is one authenticated workspace.
 */
export default function Authenticated() {
	const {session, expired, signIn, signOut} = useAuth();

	if (!session) return <Login onSignIn={signIn} expired={expired} />;

	return (
		/*
		 * `h-svh` on the provider, `overflow-hidden` on the inset.
		 *
		 * shadcn's `SidebarProvider` sets `min-h-svh` — a MINIMUM. So the inset grows with
		 * its content, the document becomes the scroll container, and an inner
		 * `flex-1 overflow-y-auto` has no bounded height to scroll inside. The visible
		 * symptom was the header scrolling off the top of a long conversation, which is
		 * the opposite of what a sticky app header is for.
		 *
		 * Fixing the height here rather than making the header `sticky` is the more
		 * durable choice: the Ask page's composer sticks to the BOTTOM of this container,
		 * and a bottom-sticky element needs a scroll box that ends where the viewport
		 * ends. One bounded box gives both behaviours; document scrolling gives neither
		 * reliably.
		 */
		<SidebarProvider className="h-svh">
			<AppSidebar role={session.role} />
			<SidebarInset className="min-h-0 overflow-hidden">
				<header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 !h-4" />
					{/*
					 * The header carries no page title. Each page states its own in
					 * `PageWrapper`, and repeating it here would be the same words twice —
					 * or, worse, a fixed strapline that contradicts the page under it, which
					 * is what "Ask questions in plain English" did while sitting above the
					 * Overview, the one page that deliberately has no model in the path.
					 */}
					<div className="flex-1" />
					<NavUser
						name={session.fullName}
						email={session.email}
						role={session.role}
						onSignOut={() => void signOut()}
					/>
				</header>

				{/*
				 * THE page's scroll container, and the only one.
				 *
				 * `min-h-0` is what makes `flex-1` actually bounded inside a flex column —
				 * without it the child grows past the viewport and the browser scrolls the
				 * document instead, which would put the Ask composer's `sticky bottom-0`
				 * against the wrong box and leave it floating mid-page.
				 *
				 * `min-w-0` for the same family of reason on the other axis: the pages hold
				 * charts and code blocks with their own minimum widths, and a flex child
				 * defaults to `min-width: auto` — which is how an earlier build ended up
				 * 986px wide at a 390px viewport (defect D-21).
				 */}
				<div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
