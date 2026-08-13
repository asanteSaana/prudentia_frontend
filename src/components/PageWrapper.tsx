import type {LucideIcon} from 'lucide-react';

/**
 * The page header used by the routed sections (template convention).
 *
 * ── The icon and the title are aligned BY CONSTRUCTION, not by eye ──────────
 *
 * The first version centred the icon disc against the whole two-line text block with
 * `items-center`. Geometrically that is correct and it looked wrong, because the title is
 * far heavier than the subtitle: the block's optical centre sits well above its
 * geometric one, so the disc read as hanging low.
 *
 * The fix is to stop aligning against the block at all. The disc is `size-9` (36px) and
 * the title's line box is `leading-9` (36px), so with `items-start` the two boxes are
 * exactly the same height and share a top edge — the disc is centred on the TITLE, and
 * the subtitle hangs beneath both. It cannot drift, because nothing is being estimated.
 */

interface Props {
	title: string;
	subtitle: string;
	icon: LucideIcon;
	actions?: React.ReactNode;
	children: React.ReactNode;
}

export default function PageWrapper({title, subtitle, icon: Icon, actions, children}: Props) {
	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 items-start gap-3">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
						<Icon className="size-[18px]" />
					</div>
					<div className="min-w-0">
						<h1 className="truncate text-xl leading-9 font-semibold tracking-tight">{title}</h1>
						<p className="text-sm text-muted-foreground">{subtitle}</p>
					</div>
				</div>
				{actions && <div className="shrink-0">{actions}</div>}
			</div>

			{children}
		</div>
	);
}
