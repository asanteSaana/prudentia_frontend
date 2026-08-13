import {useEffect, useState} from 'react';

/**
 * Chart colours, read from CSS custom properties at runtime.
 *
 * Recharts takes colours as JavaScript values, so they have to reach JS somehow. Reading
 * them from the same custom properties the rest of the interface uses means light and
 * dark swap in ONE place (`index.css`) instead of a TypeScript palette drifting out of
 * step with the stylesheet.
 *
 * ── Palette provenance ──────────────────────────────────────────────────────
 *
 * Validated with the six-checks validator against the **card** surface, which is where
 * charts actually sit — not against the page background, which is a shade different and
 * would have been the wrong thing to measure:
 *
 *   light (card #ffffff): ALL FIVE PASS · worst CVD ΔE 16.6 · worst normal ΔE 21.7
 *   dark  (card #111d2b): ALL FIVE PASS · worst CVD ΔE 17.4 · worst normal ΔE 20.6
 *
 * ── Derived from the brand, and better for it ────────────────────────────────
 *
 * The slots are teal, gold, a mid navy-blue and a coral — the first three straight from
 * the brand, the fourth chosen to open the largest gap from them. That was done so the
 * charts read as part of the product rather than a separate colour system, and it turned
 * out to be the stronger palette on every measure: the previous one carried a permanent
 * light-mode contrast WARN (two slots under 3:1 on white) and a worst-case CVD separation
 * of 9.1. This one clears 3:1 in both modes with no warning at all, at nearly twice the
 * colourblind separation.
 *
 * Bar charts still carry direct value labels up to twelve bars and every result still
 * ships a Table toggle. Those were required relief while the WARN stood; they are kept
 * because they are good practice, not because the palette now depends on them.
 */

/** Fixed order. NEVER cycled — a 5th series folds into "Other" rather than reusing a hue. */
const SERIES_VARS = ['--series-1', '--series-2', '--series-3', '--series-4'] as const;

/**
 * The LIGHT steps, duplicated here as a last resort if a custom property fails to
 * resolve. They must be kept in step with `index.css` — a stale fallback would quietly
 * paint a palette nobody validated, in the one situation where nobody is looking.
 */
const FALLBACK_SERIES = ['#0e8fa0', '#b8850f', '#2d6cb5', '#d1553f'];

function readVar(name: string, fallback: string): string {
	if (typeof window === 'undefined') return fallback;
	const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return value || fallback;
}

export interface ChartTheme {
	series: string[];
	text: string;
	textMuted: string;
	grid: string;
	surface: string;
}

export function readChartTheme(): ChartTheme {
	return {
		series: SERIES_VARS.map((name, index) => readVar(name, FALLBACK_SERIES[index])),
		text: readVar('--foreground', '#12283c'),
		textMuted: readVar('--muted-foreground', '#5b6b7c'),
		grid: readVar('--border', '#dbe3ea'),
		surface: readVar('--card', '#ffffff')
	};
}

/**
 * The theme, re-read when it changes.
 *
 * ── Why an observer and not just `useMemo(readChartTheme, [])` ──────────────
 *
 * That is what this file did before, and it was wrong the moment theming moved to a
 * class on `<html>`: the values were read once at mount, so toggling to dark left every
 * chart painted in the light palette on a dark card — the one combination neither mode
 * was validated for.
 *
 * Depending on the theme *setting* would not fix it either, because "system" is a
 * setting that can change without the setting changing. Watching the class attribute
 * catches every path — explicit toggle, system change, and first paint — because the
 * provider's only mechanism is to write that class.
 */
export function useChartTheme(): ChartTheme {
	const [theme, setTheme] = useState<ChartTheme>(() => readChartTheme());

	useEffect(() => {
		const refresh = () => setTheme(readChartTheme());
		refresh();

		const observer = new MutationObserver(refresh);
		observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});

		// `system` mode follows the OS without touching the setting, so the media query
		// has to be watched as well as the class.
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		media.addEventListener('change', refresh);

		return () => {
			observer.disconnect();
			media.removeEventListener('change', refresh);
		};
	}, []);

	return theme;
}

/**
 * Colour for series N.
 *
 * Indexed by the series' POSITION IN THE DATA, not by its rank — a filter that changes
 * the series count must not repaint the survivors. Beyond four, the caller is expected
 * to fold the tail into "Other"; returning muted ink rather than a generated hue makes
 * that omission visible instead of inventing a fifth colour nobody validated.
 */
export function seriesColour(theme: ChartTheme, index: number): string {
	return theme.series[index] ?? theme.textMuted;
}

/**
 * Compact magnitudes, for AXIS TICKS.
 *
 * An axis exists to give the eye a scale, not to be read digit by digit — so `14M` beats
 * `14000000`, which is eight unseparated characters the reader has to count. The exact
 * figures live on the direct labels, in the tooltip and in the table, all of which use
 * the full formatter above.
 */
export function formatAxisTick(value: unknown): string {
	if (typeof value !== 'number' || !Number.isFinite(value)) return String(value ?? '');
	const magnitude = Math.abs(value);
	if (magnitude >= 1_000_000_000) return `${trimZero(value / 1_000_000_000)}B`;
	if (magnitude >= 1_000_000) return `${trimZero(value / 1_000_000)}M`;
	if (magnitude >= 1_000) return `${trimZero(value / 1_000)}k`;
	// Below a thousand the raw number is already short, and rounding it would misrepresent
	// a ratio axis running 0 to 1.
	return value.toLocaleString('en-GB', {maximumFractionDigits: 2});
}

const trimZero = (value: number): string => {
	const fixed = value.toFixed(1);
	return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
};

export function formatNumber(value: unknown): string {
	if (typeof value !== 'number') return String(value ?? '');
	if (Number.isInteger(value)) return value.toLocaleString('en-GB');
	return value.toLocaleString('en-GB', {maximumFractionDigits: 3});
}

/**
 * One precision for a whole series, chosen once from the data.
 *
 * `formatNumber` decides per value, which is right for a table cell and wrong for a set
 * of labels a reader compares by eye: a loss-ratio series came out as
 * `0.94  0.89  0.652  0.642  0.618  0.53` — same quantity, three different widths,
 * because trailing zeros are dropped value by value. Ragged decimals make two numbers
 * look more different than they are, which is the chart telling a small lie about its
 * own precision.
 *
 * So the scale is picked from the series and applied to every member of it.
 */
export function sharedValueFormatter(values: unknown[]): (value: unknown) => string {
	const finite = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

	const allIntegers = finite.length > 0 && finite.every(Number.isInteger);
	const magnitude = finite.reduce((largest, value) => Math.max(largest, Math.abs(value)), 0);

	/**
	 * Precision follows MAGNITUDE, because significant figures are what a reader compares.
	 *
	 * A first version stopped at `>= 100 ? 1 : 3`, which rendered earned premium as
	 * `12,582,723.4` — nine significant figures, the last of which is a tenth of a cedi on
	 * a twelve-million-cedi total. It is not precision, it is noise, and it makes two
	 * adjacent bars harder to compare rather than easier. Past ten thousand the decimal
	 * carries no information anyone reading a chart can use.
	 */
	const decimals = allIntegers ? 0 : magnitude >= 10_000 ? 0 : magnitude >= 100 ? 1 : 3;

	return (value: unknown) => {
		if (typeof value !== 'number' || !Number.isFinite(value)) return String(value ?? '');
		return value.toLocaleString('en-GB', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		});
	};
}
