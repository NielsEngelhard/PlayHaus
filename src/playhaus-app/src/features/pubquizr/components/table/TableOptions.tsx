import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { ChoiceOption } from "@/features/pubquizr/hot-seat";
import type { PQPick } from "@/features/pubquizr/multi-device/control";
import { seatAt, type Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** Round 2's four options, in the order they are read out. */
    options: ChoiceOption[]
    /** Every pick taken on this question, in the order they were taken. */
    picks: PQPick[]
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
    /** Everybody at the table, so a pick can be painted with the face that made it. */
    seats: Seat[]
}

// Round 2's options, with each pick painted on the option it landed on. The one place on the screen where `correct` may show, and only once somebody has tapped it.
export default function TableOptions({ options, picks, scale, seats }: Props) {
    const styles = useStyles();
    const t = useT();

    return (
        <View
            style={[styles.card, { gap: Math.round(12 * scale), maxWidth: Math.round(820 * scale) }]}
            accessibilityRole="list"
            accessibilityLabel={t('pubquizr.play.choice.options')}
        >
            {options.map(option => {
                const pick = picks.find(taken => taken.answerId === option.id) ?? null;
                const picker = pick === null ? null : seatAt(seats, pick.seat);

                return (
                    <View
                        key={option.id}
                        style={[
                            styles.option,
                            pick !== null && (pick.correct ? styles.right : styles.wrong),
                            {
                                gap: Math.round(16 * scale),
                                paddingHorizontal: Math.round(18 * scale),
                                paddingVertical: Math.round(13 * scale)
                            }
                        ]}
                    >
                        <View
                            style={[
                                styles.letter,
                                { width: Math.round(44 * scale), height: Math.round(44 * scale) }
                            ]}
                        >
                            <AppText
                                style={[
                                    styles.letterText,
                                    pick !== null && styles.onFill,
                                    { fontSize: Math.round(20 * scale) }
                                ]}
                            >
                                {option.letter}
                            </AppText>
                        </View>

                        <AppText
                            style={[
                                styles.text,
                                pick !== null && styles.onFill,
                                pick !== null && !pick.correct && styles.struck,
                                { fontSize: Math.round(24 * scale) }
                            ]}
                        >
                            {option.text}
                        </AppText>

                        {/* Whose pick it was, because on the screen a wrong option has to say who spent it. */}
                        {picker !== null && <SeatAvatar seat={picker} size={Math.round(38 * scale)} />}
                    </View>
                )
            })}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        width: '100%'
    },

    option: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundElement
    },

    right: {
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.mint,
        ...theme.popShadow(theme.colors.shadow)
    },

    wrong: {
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.blush
    },

    letter: {
        flexShrink: 0,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background
    },

    letterText: {
        fontWeight: 900,
        color: theme.colors.text
    },

    // `minWidth: 0` so a long option wraps inside the row instead of pushing the face off the end of it.
    text: {
        flex: 1,
        minWidth: 0,
        fontWeight: 800,
        color: theme.colors.text
    },

    struck: {
        textDecorationLine: 'line-through'
    },

    // Ink on mint and on blush alike, because both fills are the same in either scheme.
    onFill: {
        color: Brand.ink
    }
}))
