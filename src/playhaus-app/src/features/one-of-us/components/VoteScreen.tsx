import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import { noteInkOf } from "@/features/one-of-us/board-notes";
import PinButton from "@/features/one-of-us/components/PinButton";
import PinnedNote from "@/features/one-of-us/components/PinnedNote";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { ScrollView, View } from "react-native";

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

// The vote: one briefje per player still in, and the table pins one of them.
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
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <AppText style={styles.title}>{t('oneOfUs.play.vote.title')}</AppText>

            {error !== null && (
                <InlineNotification
                    icon="alert-triangle"
                    color={theme.colors.blush}
                    title={t('common.failed')}
                    message={t(error)}
                />
            )}

            <View style={styles.notes}>
                {seats.map((seat, index) => {
                    const active = seat.seat === chosen;
                    const tone = active ? 'picked' : 'paper';
                    const ink = noteInkOf(tone, theme);

                    return (
                        <PinnedNote
                            key={seat.seat}
                            index={index}
                            tone={tone}
                            style={styles.note}
                            disabled={busy}
                            accessibilityLabel={seat.name}
                            onPress={() => onChoose(seat.seat)}
                        >
                            <SeatAvatar seat={seat} size={26} />

                            <AppText
                                style={[styles.name, { color: ink.text }]}
                                numberOfLines={1}
                            >
                                {seat.name}
                            </AppText>

                            {active && (
                                <View style={styles.check}>
                                    <Feather name="check" size={14} color={Brand.ink} />
                                </View>
                            )}
                        </PinnedNote>
                    )
                })}
            </View>

            <View style={styles.bottom}>
                {/* Every round, whether or not this one ends level. */}
                {mayor !== null && (
                    <AppText style={styles.tie}>
                        {t('oneOfUs.multiDevice.play.vote.tie')}

                        <AppText style={styles.tieName}>{` ${mayor.name} `}</AppText>

                        {t('oneOfUs.multiDevice.play.vote.tieTail')}
                    </AppText>
                )}

                <PinButton
                    text={picked === null
                        ? t('oneOfUs.play.vote.nobody')
                        : t('oneOfUs.play.vote.confirm', { name: picked.name })}
                    disabled={picked === null || busy}
                    onPress={onConfirm}
                />

                <AppText style={styles.hint}>
                    {picked === null
                        ? t('oneOfUs.play.vote.locked')
                        : t('oneOfUs.play.vote.confirmHint')}
                </AppText>
            </View>
        </ScrollView>
    )
}

const useStyles = createThemedStyles(theme => ({
    scroll: {
        flex: 1,
        width: '100%'
    },

    content: {
        flexGrow: 1,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.two,
        gap: Spacing.three
    },

    title: {
        fontSize: 21,
        fontWeight: 900,
        letterSpacing: -0.8,
        lineHeight: 21 * 1.1,
        color: theme.colors.text
    },

    notes: {
        gap: 11
    },

    note: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        paddingVertical: 12,
        paddingHorizontal: 13
    },

    name: {
        flex: 1,
        minWidth: 0,
        fontSize: 16.5,
        fontWeight: 800
    },

    // Paper in the circle so the tick is ink on it, whichever fill the note is wearing.
    check: {
        width: 24,
        height: 24,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },

    bottom: {
        marginTop: 'auto',
        gap: Spacing.two
    },

    tie: {
        fontSize: 11,
        lineHeight: 11 * 1.45,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },

    tieName: {
        fontWeight: 900,
        color: theme.colors.text
    },

    hint: {
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 600,
        color: theme.colors.textMuted
    }
}))
