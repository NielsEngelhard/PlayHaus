import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import InlineNotification from "@/components/ui/InlineNotification";
import PopPressable from "@/components/ui/PopPressable";
import SeatAvatar from "@/components/ui/SeatAvatar";
import ValidateButton from "@/components/ui/ValidateButton";
import { Brand, Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { ScrollView, View } from "react-native";

interface Props {
    /** Everybody still in the game. */
    seats: Seat[]
    /** The seat number picked so far, or null. */
    chosen: number | null
    onChoose: (seat: number) => void
    /** A vote is in the air. */
    busy: boolean
    /** A vote the server refused, with this board still up behind it. */
    error: TranslationKey | null
    onConfirm: () => void
}

/**
 * The one thing in this game anybody actually taps.
 *
 * Two steps, not one. Picking a name only highlights a row; the vote does not go out
 * until a second, separate button is pressed — see `ValidateButton`, which exists for
 * exactly this and was written for the pub quiz first. The phone is being passed round
 * and turned to face people while the biggest targets on screen are other players'
 * names, and voting somebody out has no undo.
 *
 * The tie rule is not here. The table has already settled that out loud (see
 * `DiscussScreen`), so by the time this screen is up there is one name to tap.
 */
export default function VoteScreen({
    seats,
    chosen,
    onChoose,
    busy,
    error,
    onConfirm
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

            {/* Scrolls rather than shrinks: nine seats plus a hero and a two-step
                footer will not fit a small phone, and a vote list that quietly cut
                somebody off the bottom would be a bug nobody could see. */}
            <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                {seats.map(seat => {
                    const selected = seat.seat === chosen;

                    return (
                        <PopPressable
                            key={seat.seat}
                            onPress={() => onChoose(seat.seat)}
                            disabled={busy}
                            accessibilityRole="radio"
                            accessibilityState={{ selected, disabled: busy }}
                            accessibilityLabel={seat.name}
                            style={[styles.row, selected && styles.picked]}
                        >
                            <SeatAvatar seat={seat} size={38} />

                            <AppText
                                style={[styles.name, selected && styles.onLemon]}
                                numberOfLines={1}
                            >
                                {seat.name}
                            </AppText>

                            {/* The tick is the only thing that moves between the two
                                states besides the fill, so a row reads as chosen at a
                                glance from across a table. */}
                            {selected && (
                                <Feather name="check" size={18} color={Brand.ink} />
                            )}
                        </PopPressable>
                    )
                })}
            </ScrollView>

            <View style={styles.footer}>
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

    list: {
        flex: 1
    },

    listContent: {
        gap: 8,
        paddingBottom: 4
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    // Lemon in both schemes, like every other "this is the one" in the app.
    picked: {
        backgroundColor: theme.colors.lemon,
        borderColor: Brand.ink
    },

    // `minWidth: 0` is what lets a long name truncate instead of pushing the tick off
    // the end of the row.
    name: {
        flex: 1,
        minWidth: 0,
        fontSize: 16,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    // The chosen row is lemon in both schemes, so its ink has to be too — the dark
    // scheme's own near-white text would disappear into it.
    onLemon: {
        color: Brand.ink
    },

    footer: {
        paddingTop: Spacing.two
    }
}))
