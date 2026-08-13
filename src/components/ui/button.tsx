import * as React from "react";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";

const buttonVariants = cva(
	"inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 font-semibold",
				destructive:
					"bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
				outline:
					"border bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
				secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
				link: "text-primary underline-offset-4 hover:underline"
			},
			size: {
				default: "h-9 px-4 py-2 has-[>svg]:px-3 text-sm",
				sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
				lg: "h-10 rounded-md px-6 has-[>svg]:px-4 text-base",
				icon: "size-9"
			}
		},
		defaultVariants: {
			variant: "default",
			size: "sm"
		}
	}
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	icon?: LucideIcon;
	iconPosition?: "left" | "right";
	iconClassName?: string;
	loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant,
			size,
			asChild = false,
			icon: Icon,
			iconPosition = "left",
			iconClassName,
			loading = false,
			children,
			...props
		},
		ref
	) => {
		/**
		 * `asChild` renders ONLY `children`, with the icon and loading affordances
		 * deliberately skipped.
		 *
		 * Ported as-is from the template this component came from, the branch below always
		 * emitted four child slots — two of which are `false`/`null` when no icon is set.
		 * Radix's `Slot` requires exactly one child and counts those empty slots, so any
		 * `<Button asChild><Link/></Button>` threw "Slot failed to slot onto its children"
		 * and took the whole page down with it (defect D-23).
		 *
		 * Skipping them is also the correct semantics rather than a workaround: with
		 * `asChild` the caller supplies the element and composes its own contents, so a
		 * second icon injected by the button would be an icon the caller did not ask for
		 * and cannot position.
		 */
		if (asChild) {
			return (
				<Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
					{children}
				</Slot>
			);
		}

		return (
			<button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
				{iconPosition === "left" && Icon && !loading && <Icon className={cn("h-4 w-4 mr-2", iconClassName)} />}
				{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
				{children}
				{iconPosition === "right" && Icon && !loading && <Icon className={cn("h-4 w-4 ml-2", iconClassName)} />}
			</button>
		);
	}
);
Button.displayName = "Button";

export { Button, buttonVariants };
