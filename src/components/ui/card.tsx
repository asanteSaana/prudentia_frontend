import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card"
			className={cn("bg-card text-card-foreground flex flex-col gap-6 rounded-lg p-6 border border-border/50 shadow-xs", className)}
			{...props}
		/>
	);
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				"@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
				className
			)}
			{...props}
		/>
	);
}

interface CardTitleProps extends React.ComponentProps<"div"> {
	variant?: "success" | "default";
}

function CardTitle({ className, variant = "default", ...props }: CardTitleProps) {
	/**
	 * `default` INHERITS the card's own ink rather than wearing `text-secondary`.
	 *
	 * The template this came from used `--secondary` as a dark navy TEXT colour. shadcn's
	 * convention — and PrudenTia's palette — treat `--secondary` as a light SURFACE with
	 * `--secondary-foreground` as its text, so the ported class rendered every card title
	 * in near-white on white: present in the DOM, invisible on screen (defect D-24).
	 *
	 * Inheriting is the fix rather than swapping in `text-card-foreground`, because a
	 * title should never be a different colour from the card it titles.
	 */
	const variantClass = variant === "success" ? "text-emerald-500" : "";
	return (
		<div
			data-slot="card-title"
			className={cn("leading-none font-semibold text-lg", variantClass, className)}
			{...props}
		/>
	);
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="card-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="card-action"
			className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return <div data-slot="card-content" className={cn("px-2", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div data-slot="card-footer" className={cn("flex items-center px-6 [.border-t]:pt-6", className)} {...props} />
	);
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
