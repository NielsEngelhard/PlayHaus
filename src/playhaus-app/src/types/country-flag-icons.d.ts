// The per-country subpaths have no `types` condition in `exports`; each default-exports its flag SVG as a string.
declare module 'country-flag-icons/string/3x2/*' {
    const svg: string;
    export default svg;
}
