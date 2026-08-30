import AppText from "@/components/text/AppText";
import { accentOf, gameForPathname } from "@/constants/games";
import { accentInkColor, Brand, ContentWidth, Spacing, withAlpha, type Accent, type Theme } from "@/constants/theme";
import { useAccent } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { getReach } from "@/utils/size-utils";
import Feather from "@expo/vector-icons/Feather";
import { usePathname } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** How one step of the track has gone, or that it has not been played yet. */
export type SegmentState = 'won' | 'lost' | 'played' | 'upcoming';

interface Props {
    onClose: () => void
    /** What the leave button is called, for anyone who cannot see the arrow. */
    closeLabel: string
    /** "Round 2 of 3", which used to be the top line of a card of its own. */
    label: string
    /**
     * One entry per step of whatever this game counts in.
     *
     * Left out by a game with no total to count towards — see One of Us, which ends when
     * the table has found the imposters and so cannot say in advance how many rounds that
     * takes. The header then draws the label row alone rather than a bar with an invented
     * end on it.
     */
    segments?: SegmentState[]
    /**
     * The right-hand slot: whatever chip the game wants there, and none of this one's
     * business.
     *
     * Rendered bare rather than inside a slot of its own, so a chip that decides it has
     * nothing to say can return null and take the row's gap with it — a wrapper would
     * hold 12 points open around nothing. What it costs is that the chip carries its own
     * `flexShrink: 0`: the label beside it is the one thing on this row that gives ground.
     */
    children?: ReactNode
}

/**
 * The top of every board: the way out, where you are, and the game's own colour.
 *
 * What is up here besides the way out is which round it is, which cost a whole line of a
 * card of its own before and costs nothing here — this row was already spending 58 points
 * on a close button and empty space, and the label is the one fact on the board nobody
 * needs to act on. Both it and the track are props: this sits at the top of three
 * different games, and only the game knows what to call its own rounds.
 *
 * The band is why it is one component rather than three top rows. Setup and lobby screens
 * wear the game's colour as their header — see `SettingsPageBase` — and the boards used
 * to answer with cream, so the one screen a player spends the whole game on was the one
 * screen that had stopped saying which game it was.
 *
 * In place of the app's header rather than under it, which is why the leaving is this
 * component's: the chip in that header is a `Link`, and abandoning a round mid-game is
 * not a thing to do on a middle-click. A board claims the chrome with `useChromeless`
 * and this stands where it stood — a screen with two headers is a screen where neither
 * is the header, the same argument `SettingsPageBase` makes for the setup band.
 *
 * Full-bleed, and drawn from inside the board's own gutters, so `bleed` below is doing
 * the same job it does on the settings band: the fill reaches out to the window and the
 * padding puts the contents back where they were, lined up with the board underneath.
 * The notch is this component's too, for the same reason — nothing above it is holding
 * it open any more.
 */
export default function InGameHeader({ onClose, closeLabel, label, segments, children }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const pathname = usePathname();

    /*
     * Whose colour this is. An accent already in force wins, for a board drawn inside a
     * provider; otherwise the route says which game it is, the same lookup the app header
     * reads. Both can miss, and every `useAccent` consumer keeps its own fallback for
     * that — here it is the cream row this replaced, which no board route can reach.
     */
    const lent = useAccent();
    const game = gameForPathname(pathname);
    const accent: Accent | null = lent ?? (game === null ? null : accentOf(game));

    const fill = accent?.color ?? theme.colors.backgroundSecondary;
    const ink = accent === null ? theme.colors.text : accentInkColor(accent.ink);

    const { width: windowWidth } = useWindowDimensions();
    const reach = getReach(windowWidth)

    // The app's header used to hold the notch open. Nothing does now but this band.
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.band,
                {
                    backgroundColor: fill,
                    paddingTop: insets.top + BAND_PADDING,
                    marginHorizontal: -reach,
                    paddingHorizontal: reach
                }
            ]}
        >
            <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                style={styles.leave}
            >
                <Feather name="arrow-left" size={16} color={Brand.ink} />
            </Pressable>

            <View style={styles.body}>
                <AppText style={[styles.label, { color: withAlpha(ink, 0.85) }]} numberOfLines={1}>
                    {label}
                </AppText>

                {segments !== undefined && segments.length > 0 && (
                    <View style={[styles.track, segments.length > CROWDED && styles.trackTight]}>
                        {segments.map((state, index) => (
                            <View
                                key={index}
                                style={[styles.segment, { backgroundColor: segmentFill(state, ink, theme) }]}
                            />
                        ))}
                    </View>
                )}
            </View>

            {children}
        </View>
    )
}

/** The band's own vertical padding, which the notch is then added on top of. */
const BAND_PADDING = 11;

/**
 * How wide the band already is before it reaches out: the app's one column, plus the two
 * gutters the board lays down either side of it. A chromeless page is handed the window
 * with no gutters of its own, so those belong to the board now — and both come off before
 * there is any canvas left to reach into.
 */
const COLUMN_WIDTH = ContentWidth + Spacing.four * 2;

/** Past this many steps the track closes up, so the gaps stop eating the segments. */
const CROWDED = 6;

/**
 * What one segment looks like on an accent band.
 *
 * Two of these differ from the colours the same states wore on cream, and the ground is
 * the whole reason. `played` was the game's own `primary`, which is now the band itself:
 * orange on orange disappears outright, and blue on blue is close enough to say nothing —
 * a segment whose only job is "this one has been played" was reading as an empty one.
 * Lemon is the one brand hue that carries on all three accents. `lost` steps down from
 * `destructive` to `blush` for the same reason in reverse: a loud red is a warning on a
 * cream card and a hole punched in a coloured one.
 *
 * Kept here rather than at the call sites so no game picks a segment colour by hand, and
 * here rather than in `marks.ts`, which is League of Letters' own and about letter tiles.
 */
function segmentFill(state: SegmentState, ink: string, theme: Theme): string {
    switch (state) {
        case 'won':
            return theme.colors.mint;
        case 'lost':
            return theme.colors.blush;
        case 'played':
            return theme.colors.lemon;
        default:
            return withAlpha(ink, 0.32);
    }
}

const useStyles = createThemedStyles(theme => ({
    // Square, and hard against the board below it. A radius up here would make it a card
    // laid on the page rather than the top of it, which is the thing it exists to stop.
    band: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        // Only the bottom half. The top is set at the call site, from the device's own
        // inset — see `BAND_PADDING`.
        paddingBottom: BAND_PADDING,
        borderBottomWidth: theme.borderWidth,
        borderBottomColor: theme.colors.border
    },
    // A paper chip in every scheme and on every accent, so its glyph is ink in every
    // scheme and on every accent — including violet, where the label goes dark with it.
    leave: {
        width: 34,
        height: 34,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 11,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: withAlpha(Brand.textOnAccent, 0.92),
        ...theme.shadows.hardSmall
    },
    body: {
        flex: 1,
        minWidth: 0
    },
    label: {
        fontSize: 10.5,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.6
    },
    track: {
        marginTop: 5,
        flexDirection: 'row',
        gap: Spacing.one
    },
    trackTight: {
        gap: 3
    },
    segment: {
        flex: 1,
        height: 5,
        borderRadius: 999
    }
}))
