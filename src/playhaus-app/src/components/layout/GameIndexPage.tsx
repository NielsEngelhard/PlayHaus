import AppText from "@/components/text/AppText";
import { DEVICE_MODE_KEYS, type DeviceMode } from "@/constants/games";
import { Brand, HeaderHeight, Spacing, linearGradient, type AccentInk } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Image, type ImageSource } from "expo-image";
import { Children, useState, type ReactNode } from "react";
import { View, type LayoutChangeEvent } from "react-native";

interface Props {
    /**
     * The game's name, at the top of the slab. Newlines are honoured, for a title the
     * design breaks at a chosen word rather than wherever the column runs out.
     */
    name: string,
    /** The game's own square mark — `game.icon`. */
    icon: ImageSource,
    /** The three stops the slab is filled with, lightest first — `game.gradient`. */
    gradient: readonly [string, string, string],
    /** Which ink survives on that fill — `game.accentInk`. */
    accentInk: AccentInk,
    /** The pitch, in a line or two. */
    description: string,
    /** How many can play, as a range — "3-7". */
    minMaxPlayers: string,
    /** How many phones the table needs. */
    deviceMode: DeviceMode,
    /** Roughly how long a game runs. */
    durationInMinutes: number,
    /**
     * Laid over the top-right corner of the slab, level with the mark — pubquizR's
     * weekly stamp. Optional, and nothing else on the page moves when it is there.
     */
    stamp?: ReactNode,
    /**
     * The rest of the page: the mode cards and whatever each game keeps under them.
     *
     * The first child is special — it is the row the band is cut around, so it has to be
     * the mode cards. See `OVERLAP_FRACTION`.
     */
    children: ReactNode
}

/**
 * The three tones the slab's contents wear, per ink.
 *
 * The secondary two are the ink at reduced strength rather than colours of their own,
 * so the whole band reads as one surface: the pitch is the title gone quiet, and the
 * fact pills are outlined in the same ink again, quieter still.
 */
const ON_ACCENT: Record<AccentInk, { text: string, muted: string, border: string }> = {
    ink: {
        text: Brand.ink,
        muted: 'rgba(15, 13, 18, 0.72)',
        border: 'rgba(15, 13, 18, 0.35)'
    },
    paper: {
        text: Brand.textOnAccent,
        muted: 'rgba(254, 251, 248, 0.85)',
        border: 'rgba(254, 251, 248, 0.55)'
    }
};

const MARK_SIZE = 58;

/**
 * How far down its first row of cards the band stops.
 *
 * Half, so the cards straddle the edge rather than beginning at it. Ending the band flush
 * with the top of the page's own content draws a hard rule across the screen and leaves
 * two stacked blocks either side of it; letting the row sit into the colour ties the two
 * together, and is what the design does on the screens whose hero is short enough for it
 * to happen by accident.
 *
 * Measured rather than set as a depth, because the two card designs are not the same
 * height — the quiet `ModeCard` floors at 186dp and the solid one at 132dp — and a single
 * depth would cut them at two different fractions.
 */
const OVERLAP_FRACTION = 0.5;

/**
 * What the row is assumed to be until it has been measured, i.e. for the first painted
 * frame and for the pre-rendered web export before it hydrates.
 *
 * Between the two floors above, so the guess is out by at most ~14dp either way — a
 * sliver of band edge in the gutter between the cards, moving once during the page's own
 * 220ms entrance.
 */
const ASSUMED_ROW_HEIGHT = 160;

/**
 * Every game's front page: an accent slab carrying the game's mark, name, pitch and
 * facts, and under it whatever that game offers.
 *
 * The slab is the whole point of the shared shell. A game's colour used to reach its own
 * page through the corner mark and a card's drop shadow and nothing else, so below the
 * title one game looked exactly like the next. Here the top third of the page *is* the
 * game's gradient, run full-bleed and up behind the header, and the answer to "which
 * game am I in" is the first thing on screen.
 *
 * Nothing about its height is fixed. It wraps the hero and the gap under it, so a
 * two-line title carries the band down with it and a translation that runs long cannot
 * push the facts out of their own colour, and it then runs on past that into the first
 * row of cards — see `OVERLAP_FRACTION`.
 */
export default function GameIndexPage({
    name,
    icon,
    gradient,
    accentInk,
    description,
    minMaxPlayers,
    deviceMode,
    durationInMinutes,
    stamp,
    children
}: Props) {
    const styles = useStyles();
    const t = useT();

    const on = ON_ACCENT[accentInk];

    // The row the band is cut around, held apart from the rest so it can be measured.
    const [cards, ...rest] = Children.toArray(children);

    const [rowHeight, setRowHeight] = useState<number | null>(null);
    const overlap = Math.round((rowHeight ?? ASSUMED_ROW_HEIGHT) * OVERLAP_FRACTION);

    // Rounded before it is compared as well as before it is used: on web the measurement
    // comes back fractional and a row that has not moved would otherwise hand back a
    // slightly different number every pass and re-render on each one.
    const measureRow = (event: LayoutChangeEvent) => {
        const height = Math.round(event.nativeEvent.layout.height);

        if (height !== rowHeight) setRowHeight(height);
    };

    return (
        <View style={styles.container}>
            <View style={styles.hero}>
                {/*
                  * Drawn first so everything after it lands on top, and deaf to presses
                  * so it never stands between a finger and the header above it.
                  *
                  * It fills the hero, which has already reached past the page's gutters
                  * and up over the header with negative margins — see `hero`. The extra
                  * reach above the top edge is for the strip over the header: on iOS a
                  * bounce at the top of the page pulls the canvas down into view, and the
                  * band should stretch rather than tear off.
                  */}
                <View
                    pointerEvents="none"
                    style={[styles.slab, { bottom: -overlap }, linearGradient(gradient)]}
                />

                {/* Its own row rather than the first thing in the column, so the stamp
                    has something to hang off the right-hand end of. */}
                <View style={styles.markRow}>
                    <Image
                        source={icon}
                        style={styles.mark}
                        accessibilityRole="image"
                        accessibilityLabel={name}
                    />

                    {stamp !== undefined && (
                        <View style={styles.stamp}>{stamp}</View>
                    )}
                </View>

                <AppText
                    style={[
                        styles.title,
                        stamp !== undefined && styles.textPastStamp,
                        { color: on.text }
                    ]}
                >
                    {name}
                </AppText>

                <AppText
                    style={[
                        styles.description,
                        stamp !== undefined && styles.textPastStamp,
                        { color: on.muted }
                    ]}
                >
                    {description}
                </AppText>

                <View style={styles.facts}>
                    <Fact
                        icon="user"
                        text={`${minMaxPlayers} ${t('common.players')}`}
                        on={on}
                    />
                    <Fact
                        icon="smartphone"
                        text={t(DEVICE_MODE_KEYS[deviceMode])}
                        on={on}
                    />
                    <Fact
                        icon="clock"
                        text={`±${durationInMinutes} ${t('common.minutes')}`}
                        on={on}
                    />
                </View>
            </View>

            {/* A wrapper only to hold `onLayout`. It is a plain full-width box — the
                column around it stretches its children by default — so the row inside is
                laid out exactly as it would be on its own, and the gaps under it belong
                to the blocks that follow rather than to this. */}
            <View onLayout={measureRow}>{cards}</View>

            {rest}
        </View>
    )
}

/**
 * One of the three facts, as an outlined pill.
 *
 * `Chip` next door is the same shape in the page's own colours, and this one is standing
 * on an accent — every tone it wears has to come from the slab rather than from the
 * theme, which is the whole difference between them.
 */
function Fact({
    icon,
    text,
    on
}: {
    icon: keyof typeof Feather.glyphMap,
    text: string,
    on: { text: string, border: string }
}) {
    const styles = useStyles();

    return (
        <View style={[styles.fact, { borderColor: on.border }]}>
            <Feather name={icon} size={13} color={on.text} />

            <AppText style={[styles.factText, { color: on.text }]}>{text}</AppText>
        </View>
    );
}

const useStyles = createThemedStyles(theme => ({
    container: {
        width: '100%'
    },

    /**
     * The band, laid out rather than positioned.
     *
     * The 24dp gutters belong to the one scroller in `app/_layout.tsx` and the header
     * above is a sibling of the whole page slot — two things every page shares and no
     * page can reach. So this pulls back out of both with negative margins and lays its
     * own padding down inside, exactly as `HandoffScreen` does: the fill grows into the
     * header's 66dp and out to the column's edges, and the content does not move.
     *
     * The bottom padding is the gap the design leaves between the facts and the first
     * card below. It is inside the hero on purpose: the band is drawn from the hero's own
     * box, so this is the point the band's depth is then measured on from, whatever the
     * title did to the height above it.
     *
     * The header survives being covered because it is drawn *above* the page slot on
     * exactly these routes, rather than under it as it is everywhere else — see
     * `headerOverAccent` in `constants/header-context.ts`.
     */
    hero: {
        marginTop: -HeaderHeight,
        marginHorizontal: -Spacing.four,
        paddingTop: HeaderHeight + Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four
    },

    // `bottom` is set inline, from the measured row — see `OVERLAP_FRACTION`.
    slab: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: -Spacing.six,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        // Light cuts the band off with the same hard line every card wears. Dark has no
        // ink to draw it in — see `Palette.border` — and against that canvas the gradient
        // is its own edge.
        borderBottomWidth: theme.scheme === 'dark' ? 0 : theme.borderWidth,
        borderBottomColor: theme.colors.border
    },

    markRow: {
        height: MARK_SIZE,
        // The stamp is taller than the mark and hangs past this row on both sides, so
        // the row keeps the mark's height and lets it.
        justifyContent: 'center'
    },

    mark: {
        width: MARK_SIZE,
        height: MARK_SIZE,
        flexShrink: 0,
        // The SVGs draw their own ground, border and glyph; this only rounds the corner
        // off to the same radius they are cut with.
        borderRadius: 15
    },

    stamp: {
        position: 'absolute',
        right: 0,
        top: -4
    },

    title: {
        marginTop: 14,
        fontSize: 42,
        fontWeight: 900,
        lineHeight: 42 * 1.02,
        letterSpacing: -2
    },

    description: {
        marginTop: 12,
        // Short of the full width even on a wide window, where a pitch running the whole
        // 600 would read as a paragraph rather than as a line under a name.
        maxWidth: 300,
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 14 * 1.5
    },

    // The copy stops where the sticker starts. Held here rather than by the stamp
    // because the text is what has to give way: it is drawn after the stamp, so a line
    // long enough to reach it would be laid over it rather than pushed aside.
    textPastStamp: {
        maxWidth: 250
    },

    facts: {
        marginTop: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7
    },

    fact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1.5,
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 11
    },

    factText: {
        fontSize: 11.5,
        fontWeight: 700
    }
}))
