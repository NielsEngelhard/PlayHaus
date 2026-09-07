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

/**
 * The value for "nobody got it".
 *
 * A sentinel rather than a nullable value because the grid below keys its tiles on a
 * string, and it has to be a string no seat number can ever be.
 */
const NOBODY = 'nobody';

/** Nothing chosen yet. */
const UNCHOSEN = '';

interface Props {
    /**
     * Everybody the question can still be put to, in the order it would reach them,
     * starting with whoever is being asked right now.
     */
    remaining: Seat[]
    /** A ruling is already in the air. */
    busy: boolean
    /** The seat that got it, or null for a question nobody got. */
    onAssign: (seat: number | null) => void
}

/**
 * The shortcut for a table that already knows how the round works: ask everyone in a
 * circle out loud, then say who got it.
 *
 * The long way round — Wrong, hand-off, Wrong, hand-off — is what teaches the pass-on
 * rule, so it stays, and it stays the default. But a quizmaster who has played this
 * before is not learning anything from six taps; they have already been round the table
 * by the time the phone catches up. So this sits beside the hand-off rather than
 * replacing it, and it says what it is before it does anything: the panel is the whole
 * explanation, because somebody meeting this button has to be told that skipping people
 * marks them wrong, which is exactly what happened out loud.
 *
 * It is not a different move. What it sends is the settled turn the long way round would
 * have sent, down to the attempt row per player — see `HotSeatBoard.handleQuickAssign`.
 *
 * The icon is `ClosestBoard`'s "pick instead" switch's own `zap`: that is already this
 * game's mark for a shortcut past the ordinary flow, and there is no reason for the
 * second one to reach for something else.
 *
 * The grid is drawn in `remaining`'s own order, which already *is* the order this
 * question would reach each of them the long way round — see `remainingSeatsOf` in
 * `hot-seat.ts`. The numbered badge on each tile says so, rather than leaving a
 * quizmaster who has just gone round the table to line that up in their head.
 */
export default function QuickAssign({ remaining, busy, onAssign }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [open, setOpen] = useState(false);
    const [chosen, setChosen] = useState<string>(UNCHOSEN);

    const chosenSeat = remaining.find(seat => String(seat.seat) === chosen);

    function close() {
        setOpen(false);
        // Cleared on the way out rather than on the way in, so a panel reopened after a
        // refused ruling does not still be holding the answer that was refused.
        setChosen(UNCHOSEN);
    }

    function assign() {
        if (chosen === UNCHOSEN) return;

        onAssign(chosen === NOBODY ? null : Number(chosen));
        close();
    }

    return (
        <>
            {/*
              * The square lemon button the design puts beside the row's main action,
              * down to the bolt-over-label stack — not the plain text chip this used to
              * be. Lemon rather than mint for the same reason `HotSeatBoard`'s own gate
              * button is: mint already means "yes, this one" everywhere else, and this
              * is an offer, not a verdict.
              */}
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

            {/*
              * Dismissable: this is an offer, not a decision that has to be made. Backing
              * out lands back on the hand-off with nothing changed, which is the flow it
              * was only ever a shortcut for.
              */}
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

                                {/* Says what `remaining`'s own order already means: this is
                                    where this seat falls in the circle, starting from
                                    whoever is being asked right now. */}
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

                {/* Locked until somebody is actually named. A stray tap on a panel that
                    opened with the first player already selected would score the
                    question to whoever happened to be there. Named once somebody is,
                    rather than left as a generic verb, so the last thing tapped before
                    a score gets written down says exactly whose. */}
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
    // Fixed and square, the way the design's own "Snel" button sits beside a full-width
    // one — the icon-over-label stack only reads at this shape, not stretched to fit a
    // chip's worth of width.
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

    // Modelled on `SeatRing`'s own chosen-mark badge, flipped to the tile's top-right
    // corner and holding a number instead of a check.
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
    // Solid and flatly filled rather than mint: this is a neutral pick, not a correct
    // one, and the grid's own selected colour would say the opposite of what it means.
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
