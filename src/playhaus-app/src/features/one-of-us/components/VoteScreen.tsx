import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import InlineNotification from "@/components/ui/InlineNotification";
import SeatAvatar from "@/components/ui/SeatAvatar";
import ValidateButton from "@/components/ui/ValidateButton";
import { Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import SeatRing from "@/features/one-of-us/components/SeatRing";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    busy: boolean
    chosen: number | null
    error: TranslationKey | null
    // Who breaks a tie, or null for a table that has nobody — a game dealt before the office existed.
    mayor: Seat | null
    onChoose: (seat: number) => void
    onConfirm: () => void
    seats: Seat[]
}


export default function VoteScreen({
    busy,
    chosen,
    error,
    mayor,
    onChoose,
    onConfirm,
    seats
}: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const picked = seats.find(seat => seat.seat === chosen) ?? null;

    return (
        <View style={styles.screen}>
            <SimpleTextHero
                title={t('oneOfUs.play.vote.title')}
                description={t('oneOfUs.play.vote.description')}
            />

            {error !== null && (
                <InlineNotification
                    icon="alert-triangle"
                    color={theme.colors.blush}
                    title={t('common.failed')}
                    message={t(error)}
                />
            )}

            {/* The ring takes what the hero and the footer leave, and gives way first when there is not enough of it. */}
            <View style={styles.middle}>
                {/* The middle is the receipt for the tap. */}
                <SeatRing
                    seats={seats}
                    markOf={seat => seat.seat === chosen ? 'chosen' : 'normal'}
                    label={picked === null ? undefined : t('oneOfUs.play.vote.ringChosen')}
                    headline={picked === null
                        ? t('oneOfUs.play.vote.nobody')
                        : picked.name}
                    onPick={seat => onChoose(seat.seat)}
                    disabled={busy}
                />
            </View>

            <View style={styles.footer}>
                {/* Every round, whether or not this one ends level. */}
                {mayor !== null && (
                    <View style={styles.mayor}>
                        <SeatAvatar seat={mayor} size={26} />

                        <View style={styles.mayorText}>
                            <View style={styles.mayorLabelRow}>
                                <Feather
                                    name="award"
                                    size={11}
                                    color={theme.colors.textMuted}
                                />

                                <AppText style={styles.mayorLabel}>
                                    {t('oneOfUs.play.vote.mayorLabel')}
                                </AppText>
                            </View>

                            <AppText style={styles.mayorNote} numberOfLines={2}>
                                {t('oneOfUs.play.vote.mayorNote', { name: mayor.name })}
                            </AppText>
                        </View>
                    </View>
                )}

                <ValidateButton
                    label={picked === null
                        ? t('oneOfUs.play.vote.nobody')
                        : t('oneOfUs.play.vote.confirm', { name: picked.name })}
                    hint={picked === null
                        ? t('oneOfUs.play.vote.locked')
                        : t('oneOfUs.play.vote.confirmHint')}
                    unlocked={picked !== null && !busy}
                    onPress={onConfirm}
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
        gap: Spacing.three
    },

    middle: {
        flex: 1,
        justifyContent: 'center'
    },

    // `flexShrink: 0` rather than `marginTop: auto`: the room now comes from `middle` above.
    footer: {
        flexShrink: 0,
        gap: Spacing.three,
        paddingTop: Spacing.two
    },

    // The same dashed strip the reveal screen queues the table up in, for the same reason.
    mayor: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderMuted
    },

    mayorText: {
        flex: 1,
        minWidth: 0
    },

    mayorLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },

    mayorLabel: {
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },

    mayorNote: {
        marginTop: 2,
        fontSize: 11.5,
        fontWeight: 700,
        lineHeight: 11.5 * 1.4,
        color: theme.colors.textMuted
    }
}))
