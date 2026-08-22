import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import makeQrCode from "qrcode-generator";
import { useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

/**
 * Middle correction: a quarter of the code can be obscured and still read.
 *
 * The generous levels cost modules, and modules cost sharpness at the size this is
 * printed. `M` is what a phone camera wants for a link held up across a table — `L` is
 * fragile under a thumb or a screen reflection, `H` makes the grid too fine to lock on to.
 */
const CORRECTION = 'M';

/**
 * The blank margin around the code, in modules.
 *
 * The spec asks for four. Two is enough here because the code is always drawn on its own
 * pale tile with the page a different colour behind it, so the tile's own padding does the
 * rest of the job — and four would spend a fifth of a 76pt tile on nothing.
 */
const QUIET = 2;

interface Props {
    /** What the code carries. Usually a join link — see `joinLink` in `join-link.ts`. */
    value: string,
    /** Outer edge in points, margin included. The code is always square. */
    size: number,
    /** Defaults to ink. Overriding this is rarely right — see the note on inversion below. */
    ink?: string,
    /** Defaults to paper. Must stay the *lighter* of the two. */
    paper?: string,
    style?: StyleProp<ViewStyle>
}

/** One horizontal stretch of dark modules: the unit this actually draws. */
interface Run {
    row: number,
    /** First dark column. */
    from: number,
    /** One past the last dark column. */
    to: number
}

/**
 * A QR code, drawn in React Native primitives.
 *
 * No SVG. `qrcode-generator` is pure JavaScript and hands back a boolean grid, and a grid
 * of that size is cheap to draw directly — which keeps the app's one native dependency
 * for this feature the camera, rather than the camera plus a renderer. See the note in
 * `utils/share.ts` about what a native dependency costs here.
 *
 * Drawn as *runs* rather than modules: a join link comes out as a version 4 code, 33×33,
 * and collapsing each row's dark stretches turns 1089 squares into roughly 285 views.
 * Every run is one absolutely positioned view, and the light modules are simply the tile
 * showing through, so a blank row costs nothing at all.
 *
 * Edges are snapped to whole points by rounding both sides of every run to the same grid.
 * Scaling each run independently would leave sub-pixel seams between neighbours, and a
 * scanner reads those seams as broken modules.
 *
 * Deliberately *not* themed: this stays dark-on-light in both schemes. Following the
 * theme into dark mode would print the code inverted, and while the spec allows that and
 * both phone platforms cope, the web build decodes through a ZXing ponyfill that only
 * tries the inverted reading as a fallback — if at all. A code that scans everywhere is
 * worth more than one that matches the page it sits on, so callers give it a pale tile to
 * sit on instead.
 */
export default function QrCode({ value, size, ink = Brand.ink, paper = Brand.textOnAccent, style }: Props) {
    const styles = useStyles();

    // Keyed on the value alone: the geometry below is pure arithmetic on the grid, and
    // the grid only changes when what it encodes does. Colours are applied at render.
    const code = useMemo(() => build(value), [value]);

    // A value that could not be encoded leaves a blank tile rather than throwing. There
    // is nothing a player could do about it, and the code beside it is still readable.
    if (code === null) return <View style={[{ width: size, height: size }, style]} />;

    const { modules, runs } = code;

    // The margin is part of `size`, so the grid is laid out inside what is left.
    const scale = size / (modules + QUIET * 2);
    const offset = QUIET * scale;

    // Both edges of every span go through the same rounding, so neighbours meet exactly:
    // one run's `to` is the next one's `from`, and they resolve to the same whole point.
    const at = (index: number) => Math.round(index * scale);

    return (
        <View
            style={[
                styles.frame,
                { width: size, height: size, backgroundColor: paper },
                style
            ]}
            // One image as far as a screen reader is concerned, and a decorative one: the
            // code it holds is printed in full beside every place this is used.
            accessibilityElementsHidden
            importantForAccessibility='no-hide-descendants'
        >
            {runs.map(run => (
                <View
                    key={`${run.row}:${run.from}`}
                    style={{
                        position: 'absolute',
                        left: offset + at(run.from),
                        top: offset + at(run.row),
                        width: at(run.to) - at(run.from),
                        height: at(run.row + 1) - at(run.row),
                        backgroundColor: ink
                    }}
                />
            ))}
        </View>
    )
}

/**
 * The grid, reduced to the runs that have to be painted.
 *
 * Returns null rather than throwing when the value will not fit any version — 40 versions
 * is thousands of characters, so in practice this is unreachable for a join link, but a
 * QR renderer that can take down the screen it is on is not worth the risk.
 */
function build(value: string): { modules: number, runs: Run[] } | null {
    if (value === '') return null;

    let grid;
    try {
        // `0` picks the smallest version the data fits, which for a join link is 4.
        grid = makeQrCode(0, CORRECTION);
        grid.addData(value);
        grid.make();
    } catch {
        return null;
    }

    const modules = grid.getModuleCount();
    const runs: Run[] = [];

    for (let row = 0; row < modules; row++) {
        // Where the run being walked started, or -1 between runs.
        let from = -1;

        for (let column = 0; column < modules; column++) {
            const dark = grid.isDark(row, column);

            if (dark && from === -1) from = column;

            // Closed by the first light module after it, or by the end of the row.
            if (!dark && from !== -1) {
                runs.push({ row, from, to: column });
                from = -1;
            }
        }

        if (from !== -1) runs.push({ row, from, to: modules });
    }

    return { modules, runs };
}

const useStyles = createThemedStyles(() => ({
    frame: {
        // The runs are positioned against this, and a code that overflowed its own tile
        // would be a code a scanner cannot resolve the edge of.
        position: 'relative',
        overflow: 'hidden'
    }
}))
