import {ArrowDown, ArrowUp, ChevronsUpDown} from 'lucide-react';
import {useMemo, useState} from 'react';
import {cn} from '@/lib/utils';
import type {QueryAnswer} from '@/_shared/types';

/**
 * The result table.
 *
 * ── The table is not the fallback, it is the honest default ─────────────────
 *
 * Every result in this product can be shown as a table, and for anything with three or
 * more columns it is the *only* honest presentation (ADR-08 — a chart of three columns
 * has to drop one). It also discharges the reading obligation a chart cannot always meet:
 * exact values, in full precision, in an order the reader chooses. So it is built as a
 * first-class view rather than a `<table>` with default styling.
 *
 * ── Alignment is inferred from the DATA, not the declared type ──────────────
 *
 * The driver's type name is unreliable across drivers and casts — `numeric` frequently
 * arrives as a string, and `COUNT(*)` as `bigint`. What matters for layout is whether the
 * column reads as a quantity, so the column is judged by its values: if they all parse as
 * finite numbers it is right-aligned with tabular figures, which is what makes a column of
 * magnitudes comparable by eye. Anything else stays left.
 */

interface Props {
	answer: QueryAnswer;
}

const PAGE_SIZE = 12;

type SortState = {column: number; direction: 'asc' | 'desc'} | null;

const isNumeric = (value: unknown): boolean =>
	value !== null && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value));

/** Formats one cell, with a shared precision per column so a column reads as a column. */
function makeColumnFormatter(values: unknown[]): (value: unknown) => string {
	const numbers = values.filter(isNumeric).map(Number);
	if (numbers.length !== values.filter(value => value !== null && value !== '').length || numbers.length === 0) {
		return value => (value === null || value === undefined ? '—' : String(value));
	}

	const allIntegers = numbers.every(Number.isInteger);
	const magnitude = numbers.reduce((largest, value) => Math.max(largest, Math.abs(value)), 0);
	const decimals = allIntegers ? 0 : magnitude >= 1000 ? 0 : magnitude >= 1 ? 2 : 4;

	return value => {
		if (value === null || value === undefined || value === '') return '—';
		return Number(value).toLocaleString('en-GB', {
			minimumFractionDigits: decimals,
			maximumFractionDigits: decimals
		});
	};
}

export default function DataTable({answer}: Props) {
	const [sort, setSort] = useState<SortState>(null);
	const [page, setPage] = useState(0);

	const columnMeta = useMemo(
		() =>
			answer.columns.map((column, index) => {
				const values = answer.rows.map(row => row[index]);
				const populated = values.filter(value => value !== null && value !== undefined && value !== '');
				return {
					name: column.name,
					type: column.type,
					numeric: populated.length > 0 && populated.every(isNumeric),
					format: makeColumnFormatter(values)
				};
			}),
		[answer.columns, answer.rows]
	);

	/**
	 * Sorting is over the WHOLE result, then paginated — not over the visible page.
	 * Sorting a page would silently reorder twelve arbitrary rows and call it a ranking,
	 * which is the kind of small lie that is very hard to notice and very easy to act on.
	 */
	const sorted = useMemo(() => {
		if (!sort) return answer.rows;
		const {column, direction} = sort;
		const numeric = columnMeta[column]?.numeric;

		return [...answer.rows].sort((left, right) => {
			const a = left[column];
			const b = right[column];
			if (a === null || a === undefined) return 1;
			if (b === null || b === undefined) return -1;
			const comparison = numeric
				? Number(a) - Number(b)
				: String(a).localeCompare(String(b), 'en-GB', {numeric: true});
			return direction === 'asc' ? comparison : -comparison;
		});
	}, [answer.rows, sort, columnMeta]);

	const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
	const current = Math.min(page, pages - 1);
	const slice = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

	const toggleSort = (index: number) => {
		setPage(0);
		setSort(existing => {
			if (existing?.column !== index) return {column: index, direction: 'desc'};
			if (existing.direction === 'desc') return {column: index, direction: 'asc'};
			// Third click clears it, so the reader can always get back to the order the
			// query itself produced — which is frequently the meaningful one (ORDER BY).
			return null;
		});
	};

	return (
		<div>
			{/*
			 * The scroll box is the TABLE's, not the page's, and the header is sticky
			 * inside it — so a wide result scrolls sideways and a long one scrolls under
			 * its own headings, while the page behind stays still.
			 */}
			<div className="max-h-[26rem] overflow-auto rounded-lg border">
				<table className="w-full border-collapse text-sm">
					<thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
						<tr>
							{columnMeta.map((column, index) => {
								const active = sort?.column === index;
								return (
									<th
										key={column.name}
										scope="col"
										aria-sort={
											active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
										}
										className={cn(
											'border-b px-3 py-2.5 font-medium whitespace-nowrap',
											column.numeric ? 'text-right' : 'text-left'
										)}>
										<button
											type="button"
											onClick={() => toggleSort(index)}
											className={cn(
												'inline-flex items-center gap-1.5 text-xs tracking-wide uppercase transition-colors',
												active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
											)}>
											{/* Icon after the label on the left-aligned columns and
											    before it on the right-aligned ones, so it never sits
											    between the heading and the numbers it describes. */}
											{column.numeric && <SortIcon active={active} direction={sort?.direction} />}
											<span>{column.name}</span>
											{!column.numeric && <SortIcon active={active} direction={sort?.direction} />}
										</button>
									</th>
								);
							})}
						</tr>
					</thead>

					<tbody>
						{slice.map((row, rowIndex) => (
							<tr
								key={current * PAGE_SIZE + rowIndex}
								className="border-b border-border/60 last:border-0 even:bg-muted/25 hover:bg-accent/60">
								{row.map((cell, cellIndex) => {
									const column = columnMeta[cellIndex];
									return (
										<td
											key={cellIndex}
											className={cn(
												'px-3 py-2',
												column?.numeric
													? 'text-right tabular-nums'
													: 'max-w-[22rem] truncate',
												cell === null || cell === undefined ? 'text-muted-foreground' : ''
											)}
											title={column?.numeric ? undefined : String(cell ?? '')}>
											{column ? column.format(cell) : String(cell ?? '')}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
				<span>
					{sorted.length === 0
						? 'No rows'
						: `Showing ${current * PAGE_SIZE + 1}–${Math.min((current + 1) * PAGE_SIZE, sorted.length)} of ${sorted.length.toLocaleString('en-GB')}`}
					{sort && ` · sorted by ${columnMeta[sort.column]?.name} ${sort.direction}`}
				</span>

				{pages > 1 && (
					<div className="flex items-center gap-2">
						<button
							type="button"
							disabled={current === 0}
							onClick={() => setPage(current - 1)}
							className="rounded-md border px-2 py-1 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40">
							Previous
						</button>
						<span className="tabular-nums">
							{current + 1} / {pages}
						</span>
						<button
							type="button"
							disabled={current >= pages - 1}
							onClick={() => setPage(current + 1)}
							className="rounded-md border px-2 py-1 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40">
							Next
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

function SortIcon({active, direction}: {active: boolean; direction?: 'asc' | 'desc'}) {
	if (!active) return <ChevronsUpDown className="size-3 opacity-40" />;
	return direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />;
}
