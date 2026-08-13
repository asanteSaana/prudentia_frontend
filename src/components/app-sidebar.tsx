import {ShieldCheck} from 'lucide-react';
import {NavLink} from 'react-router-dom';
import {navFor} from '@/_shared/routes/_routes';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	useSidebar
} from '@/components/ui/sidebar';
import {cn} from '@/lib/utils';
import type {UserRole} from '@/_shared/types';

/**
 * The sidebar (template shell: `AppSidebar` inside `SidebarProvider`).
 *
 * Collapsible to icons, which is why every item keeps its `tooltip` — collapsed, the
 * label is the only thing that identifies it.
 */

interface Props {
	role: UserRole;
}

export function AppSidebar({role}: Props) {
	const {open} = useSidebar();
	const items = navFor(role);

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<div className={cn('flex items-center gap-2', open ? 'px-2 py-1.5' : 'justify-center py-1.5')}>
					{/* Gold on navy: the one place the third brand colour carries identity rather
					    than status. */}
					<div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gold text-navy">
						<ShieldCheck className="size-4" />
					</div>
					{open && (
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-sidebar-accent-foreground">PrudenTia</p>
							<p className="truncate text-[11px] text-sidebar-foreground">Motor analytics</p>
						</div>
					)}
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Workspace</SidebarGroupLabel>
					<SidebarMenu>
						{items.map(item => (
							<SidebarMenuItem key={item.url}>
								<NavLink to={item.url} end={item.url === '/'}>
									{({isActive}) => (
										<SidebarMenuButton tooltip={item.title} isActive={isActive}>
											<item.icon />
											<span>{item.title}</span>
										</SidebarMenuButton>
									)}
								</NavLink>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				{open && (
					/*
					 * Not decoration. The product's whole claim is that generated SQL is
					 * proven safe before it runs, and a user who cannot see that control
					 * exists has to take the claim on trust. One line, always visible.
					 */
					<p className="px-2 pb-1 text-[11px] leading-relaxed text-sidebar-foreground/70">
						Every generated statement is validated before it runs, and executed
						read-only.
					</p>
				)}
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
