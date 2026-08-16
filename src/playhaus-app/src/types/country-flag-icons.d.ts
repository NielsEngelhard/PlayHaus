/**
 * `country-flag-icons` ships types for its barrel entry points, but the per-country
 * subpaths — the ones worth importing, since the barrel drags all 250-odd flags into
 * the bundle — are declared in `exports` without a `types` condition.
 *
 * Each of those modules default-exports the flag's SVG as a string.
 */
declare module 'country-flag-icons/string/3x2/*' {
    const svg: string;
    export default svg;
}
