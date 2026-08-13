import {BarChart3, Database, History, MessageSquare, ShieldCheck, type LucideIcon} from 'lucide-react';
import type {UserRole} from '../types';

/**
 * The navigation table, in one place (template convention: `_shared/routes/`).
 *
 * ── Why `analystOnly` here is presentation and NOT authorisation ─────────────
 *
 * Hiding the schema link from an executive is a courtesy — it removes a page that would
 * only 403. It is not the control. `GET /api/v1/metrics/schema` is guarded server-side by
 * `@route({requiredRole: 'ANALYST'})`, and the generated SQL is DELETED from the payload
 * before serialisation rather than hidden by the client.
 *
 * Stating that here matters, because a nav table with a role flag is exactly the place a
 * later reader might conclude the client is enforcing something.
 */

export interface NavItem {
	title: string;
	url: string;
	icon: LucideIcon;
	description: string;
	analystOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
	{
		title: 'Overview',
		url: '/',
		icon: BarChart3,
		description: 'Headline figures and the monthly claim series'
	},
	{
		title: 'Ask',
		url: '/ask',
		icon: MessageSquare,
		description: 'Put a question to the portfolio in plain English'
	},
	{
		title: 'History',
		url: '/history',
		icon: History,
		description: 'Every question you have asked, answered or blocked'
	},
	{
		title: 'How it works',
		url: '/how-it-works',
		icon: ShieldCheck,
		description: 'What each answer had to pass before it reached you'
	},
	{
		title: 'Schema',
		url: '/schema',
		icon: Database,
		description: 'Exactly what the model is shown about the database',
		analystOnly: true
	}
];

export function navFor(role: UserRole): NavItem[] {
	return NAV_ITEMS.filter(item => !item.analystOnly || role === 'ANALYST');
}
