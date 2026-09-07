import AppText from "@/components/text/AppText";
import PopupModal from "@/components/ui/PopupModal";
import SeatAvatar from "@/components/ui/SeatAvatar";
import SelectInput, { type SelectOption } from "@/components/ui/SelectInput";
import TextButton from "@/components/ui/TextButton";
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
 * A sentinel rather than a nullable value because `SelectInput` keys its options on a
 * string, and it has to be a string no seat number can ever be.
 */
const NOBODY = 'nobody';

/** Nothing chosen. `SelectInput` draws an em dash for a value it has no option for. */
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
 * The chip is `ClosestBoard`'s "pick instead" switch, down to the `zap`: that is already
 * this game's mark for a shortcut past the ordinary flow, and there is no reason for the
 * second one to look like something else.
 */
export default function QuickAssign({ remaining, busy, onAssign }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const [open, setOpen] = useState(false);
    const [chosen, setChosen] = useState<string>(UNCHOSEN);

    const options: SelectOption<string>[] = [
        ...remaining.map(seat => ({
            value: String(seat.seat),
            label: seat.name,
            icon: <SeatAvatar seat={seat} size={22} />
        })),
        {
            value: NOBODY,
            label: t('pubquizr.play.quickAssignNobody'),
            icon: <Feather name="x" size={16} color={theme.colors.textMuted} />
        }
    ];

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
            <Pressable
                onPress={() => setOpen(true)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('pubquizr.play.quickAssignSpoken')}
                accessibilityState={{ disabled: busy }}
                style={[styles.chip, busy && styles.dimmed]}
            >
                <Feather name="zap" size={13} color={theme.colors.textMuted} />

                <AppText style={styles.chipText}>{t('pubquizr.play.quickAssign')}</AppText>
            </Pressable>

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
                <View style={styles.field}>
                    <SelectInput
                        label={t('pubquizr.play.quickAssignLabel')}
                        value={chosen}
                        options={options}
                        onChange={setChosen}
                        disabled={busy}
                        variant="inline"
                    />
                </View>

                {/* Locked until somebody is actually named. A stray tap on a panel that
                    opened with the first player already selected would score the
                    question to whoever happened to be there. */}
                <TextButton
                    text={t('pubquizr.play.quickAssignConfirm')}
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
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },

    chipText: {
        fontSize: 11.5,
        fontWeight: 800,
        color: theme.colors.textMuted
    },

    // The list needs room under it to open into, and the panel's own gap between
    // children is tighter than a field wants above the buttons.
    field: {
        marginBottom: 4
    },

    dimmed: {
        opacity: 0.5
    }
}))
