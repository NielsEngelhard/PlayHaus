import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import { Brand, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import PickRow from "./PickRow";

/** One of the things still going spare: a round 4 word, a round 5 answer. */
export interface BonusOption {
    id: string
    label: string
}

interface Props {
    /** The `TurnStrip` this round wears, drawn above the walk. */
    strip: ReactNode
    /** Whose single guess is being offered. */
    player: Seat
    /** Where they are in the walk, 0-based, and how many of them there are. */
    index: number
    total: number
    /** What is left to guess at. */
    options: BonusOption[]
    /** What they have been marked down for, before it is committed. */
    picked: string | null
    /** The line under the name, e.g. "One guess at one of these." */
    hint: string
    busy: boolean
    onPick: (id: string | null) => void
    /** Their go is spent, on `picked` or on nothing. */
    onSpend: () => void
}

/**
 * One player's single guess at whatever the clock left behind.
 *
 * Rounds 4 and 5 both end this way — the leftovers go round the table from the guesser's
 * left, one try each, and a leftover is gone the moment somebody takes it — so the walk
 * is one screen rather than two. The rounds differ only in what is being guessed at,
 * which is why this takes `{ id, label }` and not words or answers.
 *
 * Tapping only marks. It used to credit and advance in the same gesture, which put the
 * single most destructive tap on the screen — one guess spent, on somebody else's behalf,
 * with the screen already gone — under the same finger that is scrolling the list. Now
 * the button at the bottom is the one thing that ends a player's go.
 */
export default function BonusRoundScreen({
    strip, player, index, total, options, picked, hint, busy, onPick, onSpend
}: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.turn}>
            {strip}

            <View style={styles.head}>
                <View style={[styles.portrait, { backgroundColor: player.swatch.color }]}>
                    <AppText style={[styles.portraitText, { color: player.swatch.foreground }]}>
                        {player.initials}
                    </AppText>
                </View>

                <View style={styles.who}>
                    <AppText style={styles.count}>
                        {t('pubquizr.play.turn.bonusOf', { number: index + 1, total })}
                    </AppText>

                    <AppText style={styles.name} numberOfLines={1}>{player.name}</AppText>
                </View>
            </View>

            <AppText style={styles.hint}>{hint}</AppText>

            {/*
              * A picker rather than a list of commands, and only one of them can be
              * marked: this player has one guess, so a second tap moves the mark rather
              * than adding to it.
              */}
            <ScrollView style={styles.rows} contentContainerStyle={styles.rowsInner}>
                {options.map(option => (
                    <PickRow
                        key={option.id}
                        label={option.label}
                        active={picked === option.id}
                        mode="radio"
                        disabled={busy}
                        onPress={() => onPick(picked === option.id ? null : option.id)}
                    />
                ))}
            </ScrollView>

            {/* One button, which is the only way off this screen either way. Spending the
                guess on nothing is the common case, not the exception — these are the
                things that already beat somebody with a clock running — so with nothing
                marked it is still the full-width way on rather than something to hunt
                for. */}
            <ActionButton
                size="large"
                icon={picked === null ? 'skip-forward' : 'check'}
                text={picked === null
                    ? t('pubquizr.play.turn.bonusMissed', { name: player.name })
                    : t('pubquizr.play.turn.bonusTake', { name: player.name })}
                disabled={busy}
                onPress={onSpend}
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    turn: {
        marginTop: 14,
        flex: 1,
        minHeight: 0,
        gap: 14
    },

    head: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three
    },

    portrait: {
        width: 52,
        height: 52,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Brand.ink
    },

    portraitText: {
        fontSize: 18,
        fontWeight: 900
    },

    who: {
        flex: 1,
        minWidth: 0,
        gap: 2
    },

    count: {
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: theme.colors.textMuted
    },

    name: {
        fontSize: 22,
        fontWeight: 900,
        letterSpacing: -0.6,
        color: theme.colors.text
    },

    hint: {
        flexShrink: 0,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    rows: {
        flex: 1,
        minHeight: 0
    },

    rowsInner: {
        gap: 10,
        paddingVertical: 4
    }
}))
