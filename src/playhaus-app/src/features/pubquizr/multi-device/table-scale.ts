import { useWindowDimensions } from 'react-native';

// How big the shared screen draws. Everything on the table is a multiple of this.

// The height the table layout was drawn at, so a 720p screen is exactly 1.
const BASELINE = 720;

const SMALLEST = 0.8;
const BIGGEST = 2.4;

/** The factor everything on the shared screen is sized by. Off height, because the table layout is height-bound. */
export function tableScaleOf(width: number, height: number): number {
    // The static prerender reports zero, and a zero factor would bake a collapsed page into the HTML.
    if (width === 0 || height === 0) return 1;

    return Math.min(BIGGEST, Math.max(SMALLEST, height / BASELINE));
}

export function useTableScale(): number {
    const { height, width } = useWindowDimensions();

    return tableScaleOf(width, height);
}
