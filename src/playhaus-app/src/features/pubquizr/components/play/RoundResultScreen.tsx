import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import ActionButton from "@/components/ui/ActionButton";
import { Brand, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** The round that just ended. */
    round: number
    /** Whoever won it — more than one is a tie, and every one of them won in full. */
    winners: Seat[]
    /** What the win paid, per winner. */
    worth: number
    onContinue: () => void
}

/**
 * The beat between a round ending and the standings screen: who just won it.
 *
 * Settling a turn used to fall straight through to the running scoreboard, which answers
 * "who is ahead overall" but never actually says who took the round that just happened —
 * the table has to reconstruct that from memory, seconds after arguing about it out loud.
 * This is the one screen whose whole job is to say it plainly before the scoreboard moves
 * on to the bigger question.
 */
export default function RoundResultScreen({ round, winners, worth, onContinue }: Props) {
    const t = useT();
    const styles = useStyles();

    const names = winners.map(seat => seat.name).join(', ');

    return (
        <View style={styles.screen}>
            <SimpleTextHero
                title={t('pubquizr.play.roundResult.title', { round })}
                description={winners.length > 0
                    ? t('pubquizr.play.roundResult.wonBy', { names, worth })
                    : t('pubquizr.play.roundResult.nobody')}
            />

            {winners.length > 0 && (
                <View style={styles.winners}>
                    {winners.map(seat => (
                        <View key={seat.seat} style={styles.winner}>
                            <View style={[styles.avatar, { backgroundColor: seat.swatch.color }]}>
                                <AppText style={[styles.initials, { color: seat.swatch.foreground }]}>
                                    {seat.initials}
                                </AppText>
                            </View>

                            <AppText style={styles.name} numberOfLines={1}>
                                {seat.name}
                            </AppText>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.footer}>
                <ActionButton
                    size="large"
                    icon="arrow-right"
                    text={t('pubquizr.play.roundResult.continue')}
                    onPress={onContinue}
                />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%',
        paddingTop: Spacing.three,
        gap: Spacing.four
    },

    winners: {
        gap: 10
    },

    winner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.lemon,
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hard)
    },

    avatar: {
        width: 52,
        height: 52,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Brand.ink
    },

    initials: {
        fontSize: 17,
        fontWeight: 900
    },

    // Ink in both schemes, because the row underneath it is lemon in both.
    name: {
        flex: 1,
        minWidth: 0,
        fontSize: 20,
        fontWeight: 900,
        letterSpacing: -0.4,
        color: Brand.ink
    },

    footer: {
        marginTop: 'auto',
        gap: Spacing.three
    }
}))
