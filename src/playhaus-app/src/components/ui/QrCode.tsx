import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import makeQrCode from "qrcode-generator";
import { useMemo } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

// Middle correction: a quarter of the code can be obscured and still read.
const CORRECTION = 'M';

// The blank margin around the code, in modules.
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

// A QR code, drawn in React Native primitives.
export default function QrCode({ value, size, ink = Brand.ink, paper = Brand.textOnAccent, style }: Props) {
    const styles = useStyles();

    // Keyed on the value alone: the geometry below is pure arithmetic on the grid.
    const code = useMemo(() => build(value), [value]);

    // A value that could not be encoded leaves a blank tile rather than throwing.
    if (code === null) return <View style={[{ width: size, height: size }, style]} />;

    const { modules, runs } = code;

    // The margin is part of `size`, so the grid is laid out inside what is left.
    const scale = size / (modules + QUIET * 2);
    const offset = QUIET * scale;

    // Both edges of every span go through the same rounding, so neighbours meet exactly.
    const at = (index: number) => Math.round(index * scale);

    return (
        <View
            style={[
                styles.frame,
                { width: size, height: size, backgroundColor: paper },
                style
            ]}
            // One image as far as a screen reader is concerned, and a decorative one.
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

// The grid, reduced to the runs that have to be painted.
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
        // The runs are positioned against this.
        position: 'relative',
        overflow: 'hidden'
    }
}))
