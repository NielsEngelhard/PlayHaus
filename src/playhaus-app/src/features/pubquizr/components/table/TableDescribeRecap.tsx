import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, Radii } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

const TITLE_SIZE = 28;
const WORD_SIZE = 22;
const WINNER_SIZE = 15;
const FOOT_SIZE = 16;
const AVATAR = 28;

export interface RecapWord {
    word: string
    /** Who was credited with it, and null for one nobody got. */
    winner: Seat | null
}

interface Props {
    describer: Seat
    /** What the describer takes for the words that were guessed, already said as a phrase. */
    points: string
    scale: number
    words: RecapWord[]
}

// Round 4 once the turn is over: the one moment the table is allowed to see the words.
export default function TableDescribeRecap({ describer, points, scale, words }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={[styles.stage, { gap: Math.round(12 * scale), maxWidth: Math.round(880 * scale) }]}>
            <AppText style={[styles.title, { fontSize: Math.round(TITLE_SIZE * scale) }]}>
                {t('pubquizr.table.recapTitle')}
            </AppText>

            {words.map(entry => (
                <View
                    key={entry.word}
                    style={[
                        styles.row,
                        entry.winner !== null && styles.won,
                        {
                            gap: Math.round(12 * scale),
                            paddingVertical: Math.round(10 * scale),
                            paddingHorizontal: Math.round(16 * scale),
                            borderRadius: Math.round(Radii.lg * scale)
                        }
                    ]}
                >
                    <AppText
                        style={[styles.word, entry.winner !== null && styles.onMint, { fontSize: Math.round(WORD_SIZE * scale) }]}
                        numberOfLines={1}
                    >
                        {entry.word}
                    </AppText>

                    {entry.winner === null ? (
                        <AppText style={[styles.nobody, { fontSize: Math.round(WINNER_SIZE * scale) }]}>
                            {t('pubquizr.play.turn.nobody')}
                        </AppText>
                    ) : (
                        <View style={[styles.winner, { gap: Math.round(8 * scale) }]}>
                            <SeatAvatar seat={entry.winner} size={Math.round(AVATAR * scale)} />

                            <AppText style={[styles.name, { fontSize: Math.round(WINNER_SIZE * scale) }]}>
                                {entry.winner.name}
                            </AppText>
                        </View>
                    )}
                </View>
            ))}

            <AppText style={[styles.foot, { fontSize: Math.round(FOOT_SIZE * scale) }]}>
                {t('pubquizr.table.recapPoints', { name: describer.name, points })}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        width: '100%',
        alignItems: 'stretch'
    },

    title: {
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.text
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },

    // Mint in both schemes, so the word on it is ink in both.
    won: {
        backgroundColor: theme.colors.mint,
        ...theme.shadows.hardSmall
    },

    word: {
        flexShrink: 1,
        fontWeight: 900,
        color: theme.colors.text
    },

    onMint: {
        color: Brand.ink
    },

    nobody: {
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    winner: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center'
    },

    name: {
        fontWeight: 900,
        color: Brand.ink
    },

    foot: {
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textSecondary
    }
}))
