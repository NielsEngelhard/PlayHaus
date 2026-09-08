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
    // The game's name, at the top of the slab.
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
    // Laid over the top-right corner of the slab, level with the mark — pubquizR's weekly stamp.
    stamp?: ReactNode,
    // The rest of the page: the mode cards and whatever each game keeps under them.
    children: ReactNode
}

// The three tones the slab's contents wear, per ink.
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

// How far down its first row of cards the band stops.
const OVERLAP_FRACTION = 0.5;

// What the row is assumed to be until it has been measured, i.e. for the first painted frame and for the pre-rendered web export before it hydrates.
const ASSUMED_ROW_HEIGHT = 160;

// The window width the hero turns sideways at.
const WIDE_BREAKPOINT = 900;

// How wide the hero already is: the app's one column, plus the two gutters it has reached back out into — see `hero`.
const HERO_WIDTH = ContentWidth + Spacing.four * 2;

// Every game's front page: an accent slab carrying the game's mark, name, pitch and facts.
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

    // How far past its own edges the band has to reach to make the window, and so also whether it is reaching at all.
    const bleed = Platform.OS === 'web'
        ? Math.max(0, Math.ceil((windowWidth - HERO_WIDTH) / 2))
        : 0;

    /** Whether the hero turns sideways under it — see `WIDE_BREAKPOINT`. */
    const wide = Platform.OS === 'web' && windowWidth >= WIDE_BREAKPOINT;

    // The row the band is cut around, held apart from the rest so it can be measured.
    const [cards, ...rest] = Children.toArray(children);

    const [rowHeight, setRowHeight] = useState<number | null>(null);
    const overlap = Math.round((rowHeight ?? ASSUMED_ROW_HEIGHT) * OVERLAP_FRACTION);

    // Rounded before it is compared as well as before it is used.
    const measureRow = (event: LayoutChangeEvent) => {
        const height = Math.round(event.nativeEvent.layout.height);

        if (height !== rowHeight) setRowHeight(height);
    };

    // The hero's pieces, built here rather than inline.
    const mark = (
        <Image
            source={icon}
            style={styles.mark}
            accessibilityRole="image"
            accessibilityLabel={name}
        />
    );

    // The row above the hero proper.
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
                // Only where the stamp is actually in the way.
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
                    text={`${minMaxPlayers} ${t('common.player.players')}`}
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
                {/* Drawn first so everything after it lands on top. */}
                <View
                    pointerEvents="none"
                    style={[
                        styles.slab,
                        // Square once it runs off the sides of the window: a corner rounded against an edge it never touches reads as a mistake.
                        bleed > 0 && styles.slabWide,
                        { bottom: -overlap, left: -bleed, right: -bleed },
                        linearGradient(gradient)
                    ]}
                />

                {topRow}

                {wide ? (
                    // Top-aligned: the pitch column is the taller of the two.
                    <View style={[styles.wideRow, topRow === false && styles.wideRowFlush]}>
                        {/* Mark and name as one lockup, the way they sit together everywhere else in the app. */}
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

            {/* A wrapper only to hold `onLayout`. */}
            <View onLayout={measureRow}>{cards}</View>

            {rest}
        </View>
    )
}

// One of the three facts, as an outlined pill.
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

    // The band, laid out rather than positioned.
    hero: {
        marginTop: -HeaderHeight,
        marginHorizontal: -Spacing.four,
        paddingTop: HeaderHeight + Spacing.two,
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four,
    },

    // `bottom` is set inline, from the measured row — see `OVERLAP_FRACTION`.
    slab: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: -Spacing.six,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        // Light cuts the band off with the same hard line every card wears.
        borderBottomWidth: theme.scheme === 'dark' ? 0 : theme.borderWidth,
        borderBottomColor: theme.colors.border
    },

    slabWide: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0
    },

    // The two columns the hero splits into on a desktop window.
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

    // Sized by its contents rather than by a share of the row.
    wideLead: {
        flexDirection: 'row',
        // Centred rather than topped, because the two names are not the same shape.
        alignItems: 'center',
        gap: Spacing.three - 4,
        flexShrink: 1
    },

    // Short of half the column even where there is room for more.
    widePitch: {
        flex: 1,
        minWidth: 0,
        maxWidth: 320
    },

    markRow: {
        height: MARK_SIZE,
        // The stamp is taller than the mark and hangs past this row on both sides.
        justifyContent: 'center'
    },

    mark: {
        width: MARK_SIZE,
        height: MARK_SIZE,
        flexShrink: 0,
        // The SVGs draw their own ground, border and glyph.
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

    // The gap above belongs to `wideRow` there.
    titleWide: {
        marginTop: 0
    },

    description: {
        marginTop: 12,
        // Short of the full width even on a wide window, where a pitch running the whole 600 would read as a paragraph rather than as a line under a name.
        maxWidth: 300,
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 14 * 1.5
    },

    // Both caps come off in the wide layout: the column it is in is the width now, and the top gap is the row's.
    descriptionWide: {
        marginTop: 0,
        maxWidth: '100%'
    },

    // The copy stops where the sticker starts.
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
