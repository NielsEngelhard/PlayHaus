import AppText from "@/components/text/AppText";
import TextHint from "@/components/text/TextHint";
import PopPressable from "@/components/ui/PopPressable";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";
import QuickAssign from "./QuickAssign";

interface Props {
    /** Who just had it wrong. */
    from: Seat
    /** Who can now guess the same question. */
    to: Seat
    /** The ruling that got us here is still in the air. */
    busy: boolean
    /**
     * Everybody the question can still be put to, `to` first. Only read by the quick
     * assign panel, which is the one thing here that needs to see past the next name.
     */
    remaining: Seat[]
    /**
     * Offered the shortcut past the rest of the line — see `QuickAssign`. Left out where
     * there is no line to skip: the finale, and the last seat of any question.
     */
    onQuickAssign?: (seat: number | null) => void
    onContinue: () => void
}

/**
 * The beat between one player getting it wrong and the next one being handed the same
 * question.
 *
 * `TurnStrip` already repaints to say who is answering now, but that is a banner at the
 * top of a phone that is mid-hand-off round a table — easy to miss, and the two buttons
 * right underneath it are still Correct and Wrong for whoever has the phone next. So a
 * wrong answer with somebody left to ask does not go straight back to those buttons: it
 * stands them down for this one tap instead, which is the only thing on screen and names
 * both halves of what just happened. Modelled on `ValidateButton` and the round 2 gate
 * in `HotSeatBoard` — a lemon button above a quieter hint line — rather than on
 * `VerdictButtons`' own `HandoffHint`, which is a preview said *before* the press: this
 * is the same fact, but after it, and it is the only thing on the screen rather than a
 * caption under two buttons.
 *
 * With the shortcut on, `QuickAssign`'s own trigger sits beside this button rather than
 * under it — the design puts the two side by side, one row, and the hint line moves
 * under both of them rather than splitting the line with the chip that used to sit here.
 */
export default function PassOnPrompt({
    from,
    to,
    busy,
    remaining,
    onQuickAssign,
    onContinue
}: Props) {
    const t = useT();
    const styles = useStyles();

    // Nothing to skip past means nothing to offer: with one name left the shortcut is a
    // longer way of pressing the button beside it.
    const shortcut = onQuickAssign !== undefined && remaining.length > 1;

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <PopPressable
                    onPress={onContinue}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={t('pubquizr.play.passOnSpoken', {
                        to: to.name,
                        from: from.name
                    })}
                    accessibilityState={{ disabled: busy }}
                    style={[styles.button, busy && styles.busy]}
                >
                    <View style={[styles.avatar, { backgroundColor: to.swatch.color }]}>
                        <AppText style={[styles.initials, { color: to.swatch.foreground }]}>
                            {to.initials}
                        </AppText>
                    </View>

                    {/* Shrinks rather than pushing the icon off the end: the button gives
                        up half its width to the shortcut beside it, and a long name still
                        has to fit in what is left. */}
                    <AppText style={styles.label} numberOfLines={1}>
                        {t('pubquizr.play.passOn', { name: to.name })}
                    </AppText>

                    <Feather name="arrow-right" size={16} color={Brand.ink} />
                </PopPressable>

                {shortcut && (
                    <QuickAssign
                        remaining={remaining}
                        busy={busy}
                        onAssign={onQuickAssign}
                    />
                )}
            </View>

            <TextHint text={t('pubquizr.play.passOnHint', { name: from.name })} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        flexShrink: 0
    },

    row: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 11
    },

    // Lemon, the same accent `VerdictButtons`' own hand-off pill and the round 2 gate
    // wear — this is another "read this before you tap anything else" moment.
    //
    // `flex: 1` rather than a fixed width: alone in the row it fills it exactly as it
    // always did, and beside the shortcut's fixed 66px square it gives up only the room
    // that square actually needs.
    button: {
        flex: 1,
        minWidth: 0,
        height: 66,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.lemon,
        ...theme.shadows.hard
    },

    busy: {
        opacity: 0.5
    },

    avatar: {
        width: 26,
        height: 26,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink
    },

    initials: {
        fontSize: 9.5,
        fontWeight: 900
    },

    // Ink on lemon in both schemes, because the fill is lemon in both. Shrinks ahead of
    // the avatar and the arrow either side of it, which stay their own fixed size.
    label: {
        flexShrink: 1,
        minWidth: 0,
        fontSize: 16,
        fontWeight: 900,
        color: Brand.ink
    }
}))
