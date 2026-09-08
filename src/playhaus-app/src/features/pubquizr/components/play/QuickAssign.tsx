import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import PopupModal from "@/components/ui/PopupModal";
import SeatAvatar from "@/components/ui/SeatAvatar";
import TextButton from "@/components/ui/TextButton";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { Pressable, View } from "react-native";

// The value for "nobody got it".
const NOBODY = 'nobody';

/** Nothing chosen yet. */
const UNCHOSEN = '';

interface Props {
    // Everybody the question can still be put to, in the order it would reach them, starting with whoever is being asked right now.
    remaining: Seat[]
    /** A ruling is already in the air. */
    busy: boolean
    /** The seat that got it, or null for a question nobody got. */
    onAssign: (seat: number | null) => void
}

// The shortcut for a table that already knows how the round works.
export default function QuickAssign({ remaining, busy, onAssign }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [open, setOpen] = useState(false);
    const [chosen, setChosen] = useState<string>(UNCHOSEN);

    const chosenSeat = remaining.find(seat => String(seat.seat) === chosen);

    function close() {
        setOpen(false);
        // Cleared on the way out rather than on the way in.
        setChosen(UNCHOSEN);
    }

    function assign() {
        if (chosen === UNCHOSEN) return;

        onAssign(chosen === NOBODY ? null : Number(chosen));
        close();
    }

    return (
        <>
            {/* The square lemon button the design puts beside the row's main action, down to the bolt-over-label stack. */}
            <PopPressable
                onPress={() => setOpen(true)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('pubquizr.play.quickAssignSpoken')}
                accessibilityState={{ disabled: busy }}
                style={[styles.trigger, busy && styles.dimmed]}
            >
                <Feather name="zap" size={20} color={Brand.ink} />

                <AppText style={styles.triggerLabel}>{t('pubquizr.play.quickAssign')}</AppText>
            </PopPressable>

            {/* Dismissable: this is an offer, not a decision that has to be made. */}
            <PopupModal
                visible={open}
                title={t('pubquizr.play.quickAssignTitle')}
                message={t('pubquizr.play.quickAssignBody')}
                onRequestClose={close}
            >
                <View style={styles.grid}>
                    {remaining.map((seat, index) => {
                        const value = String(seat.seat);
                        const selected = chosen === value;

                        return (
                            <Pressable
                                key={seat.seat}
                                onPress={() => setChosen(value)}
                                disabled={busy}
                                accessibilityRole="radio"
                                accessibilityLabel={seat.name}
                                accessibilityState={{ selected, disabled: busy }}
                                style={[styles.tile, selected && styles.tileSelected, busy && styles.dimmed]}
                            >
                                <SeatAvatar seat={seat} size={28} />

                                <AppText
                                    style={[styles.tileName, selected && styles.tileNameSelected]}
                                    numberOfLines={1}
                                >
                                    {seat.name}
                                </AppText>

                                {/* Says what `remaining`'s own order already means. */}
                                <View style={styles.badge}>
                                    <AppText style={styles.badgeText}>{index + 1}</AppText>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>

                <Pressable
                    onPress={() => setChosen(NOBODY)}
                    disabled={busy}
                    accessibilityRole="radio"
                    accessibilityLabel={t('pubquizr.play.quickAssignNobody')}
                    accessibilityState={{ selected: chosen === NOBODY, disabled: busy }}
                    style={[styles.nobody, chosen === NOBODY && styles.nobodySelected, busy && styles.dimmed]}
                >
                    <Feather name="x" size={14} color={theme.colors.textMuted} />

                    <AppText style={styles.nobodyText}>{t('pubquizr.play.quickAssignNobody')}</AppText>
                </Pressable>

                {/* Locked until somebody is actually named. */}
                <TextButton
                    text={chosenSeat
                        ? t('pubquizr.play.quickAssignConfirmNamed', { name: chosenSeat.name })
                        : t('pubquizr.play.quickAssignConfirm')}
                    variant="primary"
                    fullWidth
                    disabled={busy || chosen === UNCHOSEN}
                    onPress={assign}
                />

                <TextButton
                    text={t('pubquizr.play.quickAssignCancel')}
                    variant="muted"
                    fullWidth
                    onPress={close}
                />
            </PopupModal>
        </>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Fixed and square, the way the design's own "Snel" button sits beside a full-width one.
    trigger: {
        width: 66,
        height: 66,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.lemon,
        ...theme.shadows.hardSmall
    },

    // Ink on lemon in both schemes, same as `PassOnPrompt`'s own lemon button.
    triggerLabel: {
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: 0.3,
        textAlign: 'center',
        color: Brand.ink
    },

    dimmed: {
        opacity: 0.5
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 9
    },

    tile: {
        position: 'relative',
        flexBasis: '48%',
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        padding: 11,
        borderRadius: 15,
        borderWidth: 1.5,
        borderColor: theme.colors.borderSubtle,
        backgroundColor: theme.colors.backgroundSecondary
    },
    tileSelected: {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.mint,
        ...theme.shadows.hardSmall
    },

    tileName: {
        flex: 1,
        minWidth: 0,
        fontSize: 13,
        fontWeight: 800,
        color: theme.colors.text
    },
    tileNameSelected: {
        fontWeight: 900
    },

    // Modelled on `SeatRing`'s own chosen-mark badge, flipped to the tile's top-right corner and holding a number instead of a check.
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 900,
        color: Brand.ink
    },

    nobody: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: 10,
        borderRadius: 15,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed
    },
    // Solid and flatly filled rather than mint.
    nobodySelected: {
        borderStyle: 'solid',
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.muted,
        ...theme.shadows.hardSmall
    },
    nobodyText: {
        fontSize: 12.5,
        fontWeight: 800,
        color: theme.colors.textMuted
    }
}))
