import AppText from "@/components/text/AppText";
import { DEVICE_MODE_KEYS, type DeviceMode } from "@/constants/games";
import { Brand, ContentWidth, HeaderHeight, linearGradient, Spacing, type AccentInk } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Image, type ImageSource } from "expo-image";
import { Children, useState, type ReactNode } from "react";
import { Platform, useWindowDimensions, View, type LayoutChangeEvent } from "react-native";

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
 * The window width the hero turns sideways at.
 *
 * Past a tablet held upright (768) and short of the narrow laptop windows people put
 * side by side, which are better off with the phone's stacked hero.
 *
 * Deliberately not the width the band starts reaching out at, which is simply the point
 * there is any canvas beside it to reach into — see `bleed`. Between the two the hero
 * stacks as it does on a phone under a band that is already the whole window.
 */
const WIDE_BREAKPOINT = 900;

/**
 * How wide the hero already is: the app's one column, plus the two gutters it has
 * reached back out into — see `hero`.
 */
const HERO_WIDTH = ContentWidth + Spacing.four * 2;

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
 *
 * On a desktop window it turns sideways — see `WIDE_BREAKPOINT`. The band takes the
 * whole width rather than the column's, and the pitch and facts move up beside the
 * title instead of under it, which is what keeps a full-bleed band from being a third
 * of a laptop screen tall.
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
    const { width: windowWidth } = useWindowDimensions();

    const on = ON_ACCENT[accentInk];

    /*
     * How far past its own edges the band has to reach to make the window, and so also
     * whether it is reaching at all.
     *
     * Anything left over is worth taking. A band that stops short of the window is a
     * coloured rectangle laid on the page rather than the top of it, which is the whole
     * thing this is here to avoid.
     *
     * Web only, for two reasons: the band reaches outside its own parent, which iOS
     * allows and Android clips; and the clipping that keeps it from turning into
     * sideways scroll is the `overflow-x: hidden` a vertical `ScrollView` only has on
     * web. `useWindowDimensions` answers 0 with no DOM to measure, so the pre-rendered
     * export ships the narrow layout and hydration widens it — the same trade the row
     * measurement below already makes, and for the same reason.
     */
    const bleed = Platform.OS === 'web'
        ? Math.max(0, Math.ceil((windowWidth - HERO_WIDTH) / 2))
        : 0;

    /** Whether the hero turns sideways under it — see `WIDE_BREAKPOINT`. */
    const wide = Platform.OS === 'web' && windowWidth >= WIDE_BREAKPOINT;

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

    // The hero's pieces, built here rather than inline: the narrow layout stacks them
    // and the wide one deals them into two columns, and they are the same pieces either
    // way.
    const mark = (
        <Image
            source={icon}
            style={styles.mark}
            accessibilityRole="image"
            accessibilityLabel={name}
        />
    );

    /*
     * The row above the hero proper.
     *
     * It carries the mark when the hero is stacked, and only the stamp when it is not —
     * a sticker slapped on the corner of the band, with nothing under it. Where the wide
     * layout has neither it is not rendered at all, rather than left as an empty 58dp of
     * colour.
     */
    const topRow = (!wide || stamp !== undefined) && (
        <View style={styles.markRow}>
            {!wide && mark}

            {stamp !== undefined && (
                <View style={styles.stamp}>{stamp}</View>
            )}
        </View>
    );

    const title = (
        <AppText
            style={[
                styles.title,
                // Only where the stamp is actually in the way. On a wide window it is
                // off at the far end of the band and the title is in its own column.
                !wide && stamp !== undefined && styles.textPastStamp,
                wide && styles.titleWide,
                { color: on.text }
            ]}
        >
            {name}
        </AppText>
    );

    const pitch = (
        <>
            <AppText
                style={[
                    styles.description,
                    !wide && stamp !== undefined && styles.textPastStamp,
                    wide && styles.descriptionWide,
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
        </>
    );

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
                    style={[
                        styles.slab,
                        // Square once it runs off the sides of the window: a corner
                        // rounded against an edge it never touches reads as a mistake.
                        bleed > 0 && styles.slabWide,
                        { bottom: -overlap, left: -bleed, right: -bleed },
                        linearGradient(gradient)
                    ]}
                />

                {topRow}

                {wide ? (
                    // Top-aligned: the pitch column is the taller of the two, so this
                    // is what puts the name and the first line of the pitch on the same
                    // line rather than leaving the lockup adrift halfway down the band.
                    <View style={[styles.wideRow, topRow === false && styles.wideRowFlush]}>
                        {/* Mark and name as one lockup, the way they sit together
                            everywhere else in the app — the stacked layout only pulls
                            them apart because a phone has no width to keep them on one
                            line. */}
                        <View style={styles.wideLead}>
                            {mark}

                            {title}
                        </View>

                        <View style={styles.widePitch}>{pitch}</View>
                    </View>
                ) : (
                    <>
                        {title}

                        {pitch}
                    </>
                )}
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

    slabWide: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0
    },

    /**
     * The two columns the hero splits into on a desktop window.
     *
     * The gap under the mark is the title's own `marginTop` moved out here, so it
     * belongs to the row rather than to whichever of the two columns happens to be
     * taller — see `titleWide`.
     */
    wideRow: {
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.four
    },

    // No mark row above to space away from.
    wideRowFlush: {
        marginTop: 0
    },

    // Sized by its contents rather than by a share of the row: the name is the thing
    // being set, and the pitch beside it takes what is left.
    wideLead: {
        flexDirection: 'row',
        // Centred rather than topped, because the two names are not the same shape —
        // one breaks over two lines and the others do not — and this is the one
        // alignment that reads as a lockup in both cases.
        alignItems: 'center',
        gap: Spacing.three - 4,
        flexShrink: 1
    },

    /**
     * Short of half the column even where there is room for more. A pitch is a line
     * under a name, and one running the full width of the band would be a paragraph
     * competing with the title for the eye.
     */
    widePitch: {
        flex: 1,
        minWidth: 0,
        maxWidth: 320
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

    // The gap above belongs to `wideRow` there, and a margin left on the title would sink
    // the name inside its own lockup and off the line the row now tops it against.
    titleWide: {
        marginTop: 0
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

    // Both caps come off in the wide layout: the column it is in is the width now, and
    // the top gap is the row's.
    descriptionWide: {
        marginTop: 0,
        maxWidth: '100%'
    },

    // The copy stops where the sticker starts. Held here rather than by the stamp
    // because the text is what has to give way: it is drawn after the stamp, so a line
    // long enough to reach it would be laid over it rather than pushed aside.
    textPastStamp: {
        maxWidth: 300
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
