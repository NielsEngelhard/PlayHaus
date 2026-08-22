import AppText from "@/components/text/AppText";
import { Brand, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";
import { Pressable, View } from "react-native";

/** How the round on screen ended, or that it has not. */
export type RoundOutcome = 'playing' | 'won' | 'lost';

interface Props {
    round: number,
    total: number,
    outcome: RoundOutcome,
    /** The letter every row opens with. Shown while the round is still winnable. */
    firstLetter: string,
    /** How many rows the player has spent. Shown once the round is decided. */
    tries: number,
    onLeave: () => void
}

/**
 * The bar across the top of a board: the way out, where you are in the game, and one chip
 * that changes meaning as the round does.
 *
 * Sits under the app header rather than in place of it, and carries the way out even so:
 * the header's chip is a `Link` and leaving a board mid-round is not a thing to do on a
 * middle-click, so the header shows the wordmark on these routes and the leaving is this
 * button's. It turns from an arrow into a cross once the round is over — leaving a round in
 * progress is backing out of something, leaving a finished one is closing it.
 */
export default function RoundBar({ round, total, outcome, firstLetter, tries, onLeave }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const finished = outcome !== 'playing';

    return (
        <View style={styles.bar}>
            <Pressable
                onPress={onLeave}
                accessibilityRole='button'
                accessibilityLabel={finished ? t('common.close') : t('common.back')}
                style={styles.leave}
            >
                <Feather name={finished ? 'x' : 'arrow-left'} size={16} color={theme.colors.text} />
            </Pressable>

            <View style={styles.body}>
                <AppText style={styles.label}>{t('lol.game.roundOf', { round, total })}</AppText>

                {/* One segment per round. The one you are on only turns green when it is
                    won — which is why the bar is worth having over a plain "2 of 3": it
                    carries how the game has actually gone, not just how far in you are. */}
                <View style={styles.track}>
                    {Array.from({ length: total }, (_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.segment,
                                index < round - 1 && styles.segmentPlayed,
                                index === round - 1 && (
                                    outcome === 'won' ? styles.segmentWon
                                        : outcome === 'lost' ? styles.segmentLost
                                            : styles.segmentPlayed
                                )
                            ]}
                        />
                    ))}
                </View>
            </View>

            {finished ? (
                <View style={[styles.chip, outcome === 'won' ? styles.chipWon : styles.chipLost]}>
                    <Feather
                        name={outcome === 'won' ? 'check' : 'x'}
                        size={15}
                        color={Brand.ink}
                    />

                    <AppText style={styles.tries}>
                        {t('lol.game.guesses', { guesses: tries })}
                    </AppText>
                </View>
            ) : firstLetter !== '' && (
                <View
                    style={[styles.chip, styles.chipHint]}
                    accessibilityRole='text'
                    accessibilityLabel={t('lol.game.hintLabel', { letter: firstLetter })}
                >
                    <AppText style={styles.hintLabel}>{t('lol.game.hint')}</AppText>

                    <AppText style={styles.hintLetter}>{firstLetter}</AppText>
                </View>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => {
    const dark = theme.scheme === 'dark';

    return {
        bar: {
            flexShrink: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.three - 4,
            paddingVertical: 10,
            paddingHorizontal: Spacing.three - 4,
            borderRadius: 20,
            borderWidth: theme.borderWidth,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.backgroundSecondary,
            ...(dark ? {} : { boxShadow: '3px 3px 0 0 #0F0D12, 0 12px 22px -16px rgba(15, 13, 18, 0.5)' })
        },
        leave: {
            width: 34,
            height: 34,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 11,
            borderWidth: dark ? 0 : theme.borderWidth,
            borderColor: theme.colors.border,
            // Sunken against the card in light, lifted off it in dark — either way it
            // separates from the surface it sits on.
            backgroundColor: dark ? theme.colors.backgroundSelected : theme.colors.background
        },
        body: {
            flex: 1,
            minWidth: 0
        },
        label: {
            fontSize: 10.5,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 1.6,
            color: theme.colors.textMuted
        },
        track: {
            marginTop: 5,
            flexDirection: 'row',
            gap: Spacing.one
        },
        segment: {
            flex: 1,
            height: 5,
            borderRadius: 999,
            backgroundColor: dark ? theme.colors.borderSubtle : 'rgba(15, 13, 18, 0.15)'
        },
        segmentPlayed: {
            backgroundColor: theme.colors.primary
        },
        segmentWon: {
            backgroundColor: theme.colors.mint
        },
        segmentLost: {
            backgroundColor: theme.colors.destructive
        },
        chip: {
            flexShrink: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 7,
            paddingVertical: 5,
            paddingHorizontal: 9,
            borderRadius: 12,
            borderWidth: theme.borderWidth
        },
        chipHint: {
            borderColor: dark ? theme.colors.lemon : theme.colors.border,
            backgroundColor: theme.colors.lemon
        },
        chipWon: {
            borderColor: dark ? theme.colors.mint : theme.colors.border,
            backgroundColor: theme.colors.mint
        },
        chipLost: {
            borderColor: dark ? theme.colors.blush : theme.colors.border,
            backgroundColor: theme.colors.blush
        },
        hintLabel: {
            fontSize: 9.5,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 1,
            // Ink at 60%, on a lemon chip in both schemes — so it is stated once here
            // rather than flipping with the scheme like the rest of the palette.
            color: 'rgba(15, 13, 18, 0.6)'
        },
        hintLetter: {
            fontSize: 17,
            fontWeight: 900,
            letterSpacing: -0.5,
            color: Brand.ink
        },
        tries: {
            fontSize: 12,
            fontWeight: 900,
            color: Brand.ink
        }
    };
})
