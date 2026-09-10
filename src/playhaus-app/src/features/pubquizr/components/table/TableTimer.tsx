import AppText from "@/components/text/AppText";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useEffect, useState } from "react";

interface Props {
    /** When the clock runs out, as epoch ms, so the screen and the phone agree to within a frame. */
    endsAt: number
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
}

const HURRY_SECONDS = 10;

// The turn's clock as the whole table reads it. Not `TurnTimer`, which starts on mount: this one is told when the phone's clock ends.
export default function TableTimer({ endsAt, scale }: Props) {
    const styles = useStyles();
    const theme = useTheme();

    const [left, setLeft] = useState(() => secondsLeft(endsAt));

    // No `setLeft` in the body: the initialiser covers the mount, and the interval corrects a changed `endsAt` within a frame.
    useEffect(() => {
        const tick = setInterval(() => setLeft(secondsLeft(endsAt)), 250);

        return () => clearInterval(tick);
    }, [endsAt]);

    const ink = left <= HURRY_SECONDS ? theme.colors.destructive : theme.colors.text;

    return (
        <AppText style={[styles.digits, { color: ink, fontSize: Math.round(64 * scale) }]}>
            {left}
        </AppText>
    )
}

function secondsLeft(endsAt: number): number {
    return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
}

const useStyles = createThemedStyles(() => ({
    // Tabular figures, so the number does not jitter sideways as it counts down.
    digits: {
        fontWeight: 900,
        letterSpacing: -2,
        fontVariant: ['tabular-nums']
    }
}))
