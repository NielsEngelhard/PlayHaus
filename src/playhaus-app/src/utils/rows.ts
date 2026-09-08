// Split a flat list into fixed-width rows.
export function intoRows<T>(items: readonly T[], perRow: number): T[][] {
    const rows: T[][] = [];

    for (let index = 0; index < items.length; index += perRow) {
        rows.push(items.slice(index, index + perRow));
    }

    return rows;
}
