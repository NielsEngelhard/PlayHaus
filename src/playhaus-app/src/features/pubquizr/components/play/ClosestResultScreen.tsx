import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import ActionButton from "@/components/ui/ActionButton";
import { Brand, ShadowReach, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { offBy, type ClosestResult } from "@/features/pubquizr/round-three";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { ScrollView, View } from "react-native";

interface Props {
    result: ClosestResult
    onContinue: () => void
}

/** One line of the list: who, what they said, and whether it took the points. */
interface Row {
    seat: Seat
    /** Null when the winner was tapped by hand and no numbers were written down. */
    value: number | null
    won: boolean
}

// The beat between settling a round 3 question and the next turn: who was right.
export default function ClosestResultScreen({ result, onContinue }: Props) {
    const t = useT();
    const styles = useStyles();

    const { winners, guesses } = result;
    const names = winners.map(seat => seat.name).join(', ');

    // The guesses when there are any, and the winners when there are not.
    const rows: Row[] = guesses.length > 0
        ? guesses.map(guess => ({
            seat: guess.seat,
            value: guess.value,
            won: winners.some(winner => winner.seat === guess.seat.seat)
        }))
        : winners.map(seat => ({ seat, value: null, won: true }));

    const title = winners.length === 0
        ? t('pubquizr.play.closest.result.nobody')
        : winners.length === 1
            ? t('pubquizr.play.closest.result.nearestOne', { names })
            : t('pubquizr.play.closest.result.nearestMany', { names });

    const paid = winners.length === 0
        ? t('pubquizr.play.closest.result.paidNobody')
        : winners.length === 1
            ? t('pubquizr.play.closest.result.paidOne', { worth: result.worth })
            : t('pubquizr.play.closest.result.paidMany', { worth: result.worth });

    return (
        <View style={styles.screen}>
            <SimpleTextHero title={title} description={paid} />

            {/* The answer, said once to the whole table. */}
            <View style={styles.answer}>
                <AppText style={styles.answerLabel}>
                    {t('pubquizr.play.closest.result.answerLabel')}
                </AppText>

                <AppText style={styles.prompt} numberOfLines={3}>
                    {result.prompt}
                </AppText>

                <AppText style={styles.answerValue}>
                    {result.unit === ''
                        ? String(result.answer)
                        : t('pubquizr.play.closest.answer', {
                            answer: result.answer,
                            unit: result.unit
                        })}
                </AppText>

                {result.explanation !== '' && (
                    <AppText style={styles.explanation}>{result.explanation}</AppText>
                )}
            </View>

            <View style={styles.sectionRule}>
                <AppText style={styles.sectionLabel}>
                    {t('pubquizr.play.closest.result.guessesLabel')}
                </AppText>

                <View style={styles.rule} />
            </View>

            {/* The one scroller on the screen. */}
            <ScrollView style={styles.rows} contentContainerStyle={styles.rowsInner}>
                {rows.map(row => (
                    <View
                        key={row.seat.seat}
                        style={[styles.row, row.won && styles.won]}
                        accessibilityRole="text"
                    >
                        <View style={[styles.avatar, { backgroundColor: row.seat.swatch.color }]}>
                            <AppText style={[styles.initials, { color: row.seat.swatch.foreground }]}>
                                {row.seat.initials}
                            </AppText>
                        </View>

                        <View style={styles.who}>
                            <AppText
                                style={[styles.name, row.won && styles.onMint]}
                                numberOfLines={1}
                            >
                                {row.seat.name}
                            </AppText>

                            {row.value !== null && (
                                <View style={styles.gap}>
                                    {row.won && (
                                        <Feather name="award" size={11} color={Brand.ink} />
                                    )}

                                    <AppText style={[styles.gapText, row.won && styles.onMint]}>
                                        {row.won
                                            ? t('pubquizr.play.closest.nearestOff', {
                                                off: offBy(row.value, result.answer)
                                            })
                                            : t('pubquizr.play.closest.off', {
                                                off: offBy(row.value, result.answer)
                                            })}
                                    </AppText>
                                </View>
                            )}
                        </View>

                        {row.value !== null && (
                            <AppText style={[styles.value, row.won && styles.onMint]}>
                                {row.value}
                            </AppText>
                        )}
                    </View>
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <ActionButton
                    size="large"
                    icon="arrow-right"
                    text={t('pubquizr.play.closest.result.continue')}
                    onPress={onContinue}
                />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // The gutters are this screen's own.
    screen: {
        flex: 1,
        minHeight: 0,
        width: '100%',
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.four,
        gap: Spacing.three
    },

    // Lemon, the way every other "here it is" panel in this game is.
    answer: {
        flexShrink: 0,
        padding: 16,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.lemon,
        ...theme.shadows.hard
    },

    // Ink in both schemes, here and below: the panel is lemon in both.
    answerLabel: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.3,
        color: Brand.ink,
        opacity: 0.6
    },

    prompt: {
        marginTop: 8,
        fontSize: 14,
        lineHeight: 14 * 1.35,
        fontWeight: 700,
        color: Brand.ink,
        opacity: 0.75
    },

    answerValue: {
        marginTop: 6,
        fontSize: 34,
        fontWeight: 900,
        letterSpacing: -1.2,
        color: Brand.ink
    },

    explanation: {
        marginTop: 8,
        fontSize: 12.5,
        lineHeight: 12.5 * 1.45,
        fontWeight: 600,
        color: Brand.ink,
        opacity: 0.75
    },

    sectionRule: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 2
    },

    sectionLabel: {
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.3,
        color: theme.colors.textMuted
    },

    rule: {
        flex: 1,
        height: 2,
        backgroundColor: theme.colors.borderMuted
    },

    rows: {
        flex: 1,
        minHeight: 0
    },

    rowsInner: {
        gap: 9,
        paddingRight: ShadowReach.hardSmall,
        paddingBottom: 2
    },

    // The same 60-point row the form collected the numbers in.
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        height: 60,
        paddingLeft: 10,
        paddingRight: 14,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },

    // Mint in both schemes, the same "this one" the winning row wore on the form.
    won: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint,
        ...theme.shadows.hardSmall
    },

    avatar: {
        width: 36,
        height: 36,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    initials: {
        fontSize: 12,
        fontWeight: 900
    },

    who: {
        flex: 1,
        minWidth: 0
    },

    name: {
        fontSize: 15.5,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    gap: {
        marginTop: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },

    gapText: {
        fontSize: 11,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    // What they actually said, at the size the field held it: this is the number people lean across a table to check.
    value: {
        flexShrink: 0,
        fontSize: 21,
        fontWeight: 900,
        letterSpacing: -0.4,
        color: theme.colors.text
    },

    onMint: {
        color: Brand.ink
    },

    footer: {
        flexShrink: 0,
        marginTop: 'auto',
        gap: Spacing.three
    }
}))
