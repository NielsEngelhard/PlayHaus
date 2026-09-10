import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import TableAnswer from "@/features/pubquizr/components/table/TableAnswer";
import { offBy, type ClosestResult } from "@/features/pubquizr/round-three";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    result: ClosestResult
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
}

/** One line of the list: who, what they said, and whether it took the points. */
interface Row {
    seat: Seat
    value: number
    won: boolean
}

// Round 3's result on the shared screen, which is the one moment any of the numbers are said out loud.
export default function TableClosestResult({ result, scale }: Props) {
    const styles = useStyles();
    const t = useT();

    const { guesses, winners } = result;
    const names = winners.map(seat => seat.name).join(', ');

    const rows: Row[] = guesses.map(guess => ({
        seat: guess.seat,
        value: guess.value,
        won: winners.some(winner => winner.seat === guess.seat.seat)
    }));

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
        <View style={[styles.stage, { gap: Math.round(16 * scale), maxWidth: Math.round(880 * scale) }]}>
            <AppText style={[styles.title, { fontSize: Math.round(32 * scale) }]}>
                {title}
            </AppText>

            <AppText style={[styles.paid, { fontSize: Math.round(16 * scale) }]}>
                {paid}
            </AppText>

            <AppText style={[styles.prompt, { fontSize: Math.round(15 * scale) }]} numberOfLines={2}>
                {result.prompt}
            </AppText>

            <TableAnswer
                aliases={result.explanation === '' ? [] : [result.explanation]}
                answer={result.unit === ''
                    ? String(result.answer)
                    : t('pubquizr.play.closest.answer', {
                        answer: result.answer,
                        unit: result.unit
                    })}
                label={t('pubquizr.play.closest.result.answerLabel')}
                scale={scale}
            />

            {/* Nothing to list when the question closed with nobody having typed. */}
            {rows.length > 0 && (
                <View style={[styles.rows, { gap: Math.round(8 * scale), width: Math.round(620 * scale) }]}>
                    {rows.map(row => (
                        <View
                            key={row.seat.seat}
                            style={[
                                styles.row,
                                row.won && styles.won,
                                {
                                    gap: Math.round(12 * scale),
                                    paddingVertical: Math.round(8 * scale),
                                    paddingHorizontal: Math.round(12 * scale)
                                }
                            ]}
                        >
                            <SeatAvatar seat={row.seat} size={Math.round(34 * scale)} />

                            <AppText
                                style={[
                                    styles.name,
                                    row.won && styles.onMint,
                                    { fontSize: Math.round(17 * scale) }
                                ]}
                                numberOfLines={1}
                            >
                                {row.seat.name}
                            </AppText>

                            <AppText
                                style={[
                                    styles.off,
                                    row.won && styles.onMint,
                                    { fontSize: Math.round(12 * scale) }
                                ]}
                            >
                                {row.won
                                    ? t('pubquizr.play.closest.nearestOff', {
                                        off: offBy(row.value, result.answer)
                                    })
                                    : t('pubquizr.play.closest.off', {
                                        off: offBy(row.value, result.answer)
                                    })}
                            </AppText>

                            <AppText
                                style={[
                                    styles.value,
                                    row.won && styles.onMint,
                                    { fontSize: Math.round(22 * scale) }
                                ]}
                            >
                                {row.value}
                            </AppText>
                        </View>
                    ))}
                </View>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        alignItems: 'center'
    },
    title: {
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.text
    },
    paid: {
        fontWeight: 800,
        textAlign: 'center',
        color: theme.colors.textSecondary
    },
    prompt: {
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textMuted
    },
    rows: {
        alignSelf: 'center'
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },
    // Mint in both schemes, the same "this one" every other winning row wears.
    won: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },
    name: {
        flex: 1,
        minWidth: 0,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },
    off: {
        flexShrink: 0,
        fontWeight: 700,
        color: theme.colors.textMuted
    },
    // What they actually said: the number people lean across the room to check.
    value: {
        flexShrink: 0,
        fontWeight: 900,
        letterSpacing: -0.4,
        color: theme.colors.text
    },
    onMint: {
        color: Brand.ink
    }
}))
