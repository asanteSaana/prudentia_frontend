import {ChevronDown, LogOut, Monitor, Moon, Sun} from 'lucide-react';
import {Avatar, AvatarFallback} from '@/components/ui/avatar';
import {Button} from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {useTheme} from '@/theme-provider';
import type {UserRole} from '@/_shared/types';

/**
 * The account menu in the header.
 *
 * The ROLE is shown, not just the name, because in this product the role changes what
 * the interface contains — an analyst sees the generated SQL and the schema, an executive
 * does not. A user who cannot see which role they are in cannot tell the difference
 * between "this system has no SQL view" and "I am not permitted to see it".
 */

interface Props {
	name: string;
	email: string;
	role: UserRole;
	onSignOut: () => void;
}

const initialsOf = (name: string) =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map(part => part[0]?.toUpperCase() ?? '')
		.join('') || '?';

export function NavUser({name, email, role, onSignOut}: Props) {
	const {theme, setTheme} = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-auto gap-2 px-2 py-1.5">
					<Avatar className="size-7">
						<AvatarFallback className="text-[11px]">{initialsOf(name)}</AvatarFallback>
					</Avatar>
					<span className="hidden text-left sm:block">
						<span className="block text-sm leading-tight font-medium">{name}</span>
						<span className="block text-[11px] leading-tight text-muted-foreground">{role}</span>
					</span>
					<ChevronDown className="size-3.5 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuLabel className="font-normal">
					<p className="text-sm font-medium">{name}</p>
					<p className="truncate text-xs text-muted-foreground">{email}</p>
					<p className="mt-1 text-[11px] tracking-wide text-muted-foreground uppercase">{role}</p>
				</DropdownMenuLabel>

				<DropdownMenuSeparator />

				<DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
					Appearance
				</DropdownMenuLabel>
				{(
					[
						['light', 'Light', Sun],
						['dark', 'Dark', Moon],
						['system', 'System', Monitor]
					] as const
				).map(([value, label, Icon]) => (
					<DropdownMenuItem key={value} onClick={() => setTheme(value)}>
						<Icon className="size-4" />
						<span>{label}</span>
						{theme === value && <span className="ml-auto text-xs text-muted-foreground">✓</span>}
					</DropdownMenuItem>
				))}

				<DropdownMenuSeparator />

				<DropdownMenuItem onClick={onSignOut}>
					<LogOut className="size-4" />
					<span>Sign out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
