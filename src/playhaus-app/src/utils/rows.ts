/**
 * Split a flat list into fixed-width rows — React Native has no CSS grid to lean on,
 * so anything laid out in a grid is really a column of `flexDirection: 'row'` views.
 *
 * Lived as a private copy in `WordLengthCard` and `ProfileAvatarColorPickerCard` before
 * the guess grid needed a third one.
 */
export function intoRows<T>(items: readonly T[], perRow: number): T[][] {
    const rows: T[][] = [];

    for (let index = 0; index < items.length; index += perRow) {
        rows.push(items.slice(index, index + perRow));
    }

    return rows;
}
