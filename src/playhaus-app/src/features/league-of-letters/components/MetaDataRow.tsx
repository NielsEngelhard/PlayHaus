import { Fragment, type ReactNode } from "react";
import { View } from "react-native";
import AppText from "@/components/text/AppText";
import GameTimer from "./GameTimer";
import { Brand } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useT } from "@/features/i18n/LanguageContext";
import Feather from "@expo/vector-icons/Feather";
import { GameGuess, Game, GameRound } from "@/api/calls/league-of-letters";

interface Props {
    game: Game
    outcome: 'won' | 'lost' | 'playing'
    firstLetter: string
    myGuesses: GameGuess[]
    multiplayer: boolean
    round: GameRound
    finished: boolean
}

// Everything about the round that is not the board itself, read as one card rather than a row of separately bordered chips.
export default function MetaDataRow({ game, outcome, firstLetter, myGuesses, multiplayer, round, finished }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const segments: { key: string, node: ReactNode }[] = [];

    // Mirrors the old `RoundChip`: the hint while the round is still winnable, the tally once it is decided.
    if (outcome !== 'playing') {
        segments.push({
            key: 'outcome',
            node: (
                <View style={[styles.pill, outcome === 'won' ? styles.pillWon : styles.pillLost]}>
                    <Feather name={outcome === 'won' ? 'check' : 'x'} size={13} color={Brand.ink} />

                    <AppText style={styles.tries}>
                        {t('lol.game.guesses', { guesses: myGuesses.length, max: game.maxGuesses })}
                    </AppText>
                </View>
            )
        });
    } else if (firstLetter !== '') {
        segments.push({
            key: 'hint',
            node: (
                <View
                    style={[styles.pill, styles.pillHint]}
                    accessibilityRole='text'
                    accessibilityLabel={t('lol.game.hintLabel', { letter: firstLetter })}
                >
                    <AppText style={styles.hintLabel}>{t('lol.game.hint')}</AppText>

                    <AppText style={styles.hintLetter}>{firstLetter}</AppText>
                </View>
            )
        });
    }

    segments.push({
        key: 'length',
        node: (
            <View style={styles.segment}>
                <Feather name='hash' size={13} color={theme.colors.textMuted} />

                <AppText style={styles.segmentLabel}>
                    {t('lol.game.wordLengthLabel', { letters: game.wordLength })}
                </AppText>
            </View>
        )
    });

    // Solo already carries this number in `SoloStatusRow`, right below.
    if (multiplayer) {
        segments.push({
            key: 'score',
            node: (
                <View
                    style={styles.segment}
                    accessibilityRole='text'
                    accessibilityLabel={t('lol.game.scoreCompactLabel', { score: game.score })}
                >
                    <Feather name='star' size={13} color={Brand.primary} />

                    <AppText style={styles.segmentLabel}>{game.score}</AppText>
                </View>
            )
        });
    }

    if (multiplayer && round.endsAt && !finished) {
        segments.push({
            key: 'timer',
            node: (
                <View style={styles.segment}>
                    <Feather name='clock' size={13} color={theme.colors.text} />

                    <GameTimer endsAt={round.endsAt} />
                </View>
            )
        });
    }

    return (
        <View style={styles.card}>
            {segments.map((segment, index) => (
                <Fragment key={segment.key}>
                    {index > 0 && <View style={styles.divider} />}

                    {segment.node}
                </Fragment>
            ))}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        // `gap` is the floor — how close two segments (or a segment and its divider) are allowed to sit.
        justifyContent: 'space-between',
        gap: 11,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        borderRadius: 16,
        backgroundColor: theme.colors.backgroundSecondary,
        paddingVertical: 6,
        paddingLeft: 6,
        paddingRight: 12,
        ...theme.shadows.hardSmall
    },
    // A hairline rather than a border of its own.
    divider: {
        width: 1.5,
        alignSelf: 'stretch',
        backgroundColor: theme.colors.borderSubtle
    },
    pill: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 11
    },
    pillHint: {
        backgroundColor: theme.colors.lemon
    },
    pillWon: {
        backgroundColor: theme.colors.mint
    },
    pillLost: {
        backgroundColor: theme.colors.blush
    },
    hintLabel: {
        fontSize: 9,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1,
        // Ink at 60%, on a lemon pill in both schemes.
        color: 'rgba(15, 13, 18, 0.6)'
    },
    hintLetter: {
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: Brand.ink
    },
    tries: {
        fontSize: 11,
        fontWeight: 900,
        color: Brand.ink
    },
    segment: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    segmentLabel: {
        fontSize: 13,
        fontWeight: 900,
        color: theme.colors.text
    }
}))
