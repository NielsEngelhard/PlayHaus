import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { TablePlayer } from "@/features/pubquizr/multi-device/table-players";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

const AVATAR = 30;
const NAME_SIZE = 15;
const SCORE_SIZE = 20;
const NOTE_SIZE = 8;
/** Below this the note is dropped rather than wrapped: eight seats on one bar leave a card no room for two lines. */
const NOTE_MIN_WIDTH = 96;

interface Props {
    player: TablePlayer
    scale: number
    /** How wide a card may be, so a full table still fits one row. */
    width: number
}

// One player on the bar: their face, their score, and the one word for what they are doing.
export default function TablePlayerCard({ player, scale, width }: Props) {
    const styles = useStyles();
    const t = useT();

    const { note, seat, tone } = player;
    const paper = tone === 'master';
    // Lemon and mint carry ink in both schemes, the way every other fill in the app does.
    const onFill = tone === 'active' || tone === 'done';
    const roomForNote = width >= NOTE_MIN_WIDTH * scale && note !== '';

    return (
        <View
            style={[
                styles.card,
                styles[tone],
                {
                    maxWidth: width,
                    gap: Math.round(Spacing.two * scale),
                    paddingVertical: Math.round(Spacing.two * scale),
                    paddingHorizontal: Math.round(Spacing.three * scale),
                    borderRadius: Math.round(Radii.full * scale)
                }
            ]}
        >
            <SeatAvatar seat={seat} size={Math.round(AVATAR * scale)} />

            <View style={styles.body}>
                <AppText
                    style={[styles.name, paper && styles.onInk, onFill && styles.onFill, { fontSize: Math.round(NAME_SIZE * scale) }]}
                    numberOfLines={1}
                >
                    {seat.name}
                </AppText>

                {roomForNote && (
                    <AppText
                        style={[styles.note, paper && styles.noteOnInk, onFill && styles.noteOnFill, { fontSize: Math.round(NOTE_SIZE * scale) }]}
                        numberOfLines={1}
                    >
                        {note}
                    </AppText>
                )}
            </View>

            <AppText style={[styles.score, paper && styles.onInk, onFill && styles.onFill, { fontSize: Math.round(SCORE_SIZE * scale) }]}>
                {seat.stars === undefined ? seat.score : t('pubquizr.play.final.tally', { stars: seat.stars, score: seat.score })}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    idle: {},

    // Ink and lemon are the same in both schemes, so what is written on them is too.
    master: {
        borderColor: Brand.ink,
        backgroundColor: Brand.ink
    },

    active: {
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },

    done: {
        borderColor: Brand.ink,
        backgroundColor: Brand.mint
    },

    beaten: {
        opacity: 0.45
    },

    body: {
        flexShrink: 1,
        minWidth: 0
    },

    name: {
        fontWeight: 900,
        color: theme.colors.text
    },

    onInk: {
        color: Brand.textOnAccent
    },

    onFill: {
        color: Brand.ink
    },

    note: {
        fontWeight: 900,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: theme.colors.textMuted
    },

    noteOnInk: {
        color: Brand.lemon
    },

    noteOnFill: {
        color: 'rgba(15, 13, 18, 0.65)'
    },

    score: {
        fontWeight: 900,
        fontVariant: ['tabular-nums'],
        color: theme.colors.text
    }
}))
