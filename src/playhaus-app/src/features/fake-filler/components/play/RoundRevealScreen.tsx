import { TRUTH_AUTHOR_ID, type FFGame, type FFOption, type FFReveal } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import PlayerScoreRow from "@/components/ui/PlayerScoreRow";
import { Brand, Spacing, withAlpha } from "@/constants/theme";
import FilledLine from "@/features/fake-filler/components/play/FilledLine";
import PlayButton from "@/features/fake-filler/components/play/PlayButton";
import { useT } from "@/features/i18n/LanguageContext";
import { initialsOf } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { avatarColorById } from "@/utils/color-utils";
import { useEffect, useRef } from "react";
import { ScrollView, View } from "react-native";

const AUTO_ADVANCE_MS = 10_000;

interface Props {
    game: FFGame,
    reveal: FFReveal,
    userId: string,
    /** Whether there is another round behind this one, which changes what the button says. */
    more: boolean,
    onContinue: () => void
}

// The end of a round, with everything told at last.
export default function RoundRevealScreen({ game, reveal, userId, more, onContinue }: Props) {
    const t = useT();
    const styles = useStyles();

    // Kept in a ref so a re-render with a fresh onContinue closure doesn't restart the countdown.
    const onContinueRef = useRef(onContinue);
    useEffect(() => {
        onContinueRef.current = onContinue;
    });

    useEffect(() => {
        const timer = setTimeout(() => onContinueRef.current(), AUTO_ADVANCE_MS);
        return () => clearTimeout(timer);
    }, [reveal.roundNumber]);

    const nameOf = (id: string) => {
        if (id === userId) return t('common.you');

        return game.players.find(player => player.userId === id)?.name ?? '?';
    };

    const truth = reveal.options.find(option => option.isTruth === true);

    // The fakes, by how many they fooled.
    const fakes = reveal.options
        .filter(option => option.isTruth !== true)
        .sort((left, right) => (right.voters?.length ?? 0) - (left.voters?.length ?? 0));

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <AppText style={styles.kicker}>
                {truth === undefined
                    ? t('fakeFiller.play.reveal.title')
                    : t('fakeFiller.play.reveal.truthWas')}
            </AppText>

            {truth !== undefined && <Truth option={truth} line={reveal.line} nameOf={nameOf} />}

            <View style={styles.rows}>
                {fakes.map(option => (
                    <Fake
                        key={option.slot}
                        option={option}
                        line={reveal.line}
                        game={game}
                        nameOf={nameOf}
                    />
                ))}
            </View>

            <PlayerScoreRow players={game.players} userId={userId} style={styles.scores} />

            <View style={styles.foot}>
                <PlayButton
                    text={more
                        ? t('fakeFiller.play.reveal.next')
                        : t('fakeFiller.play.reveal.toResults')}
                    icon='arrow-right'
                    onPress={onContinue}
                />
            </View>
        </ScrollView>
    )
}

interface TruthProps {
    option: FFOption,
    line: string,
    nameOf: (id: string) => string
}

// The real answer, which is the one thing on this screen that gets a card to itself.
function Truth({ option, line, nameOf }: TruthProps) {
    const t = useT();
    const styles = useStyles();

    const voters = option.voters ?? [];

    return (
        <>
            <View style={styles.truth}>
                <FilledLine line={line} fills={option.fills} size={19} underline color={Brand.ink} />
            </View>

            <AppText style={styles.truthNote}>
                {voters.length === 0
                    ? t('fakeFiller.play.reveal.nobodyPicked')
                    : `${t('fakeFiller.play.reveal.pickedBy', {
                        names: voters.map(nameOf).join(', ')
                    })} · ${t('fakeFiller.play.reveal.truthReward')}`}
            </AppText>
        </>
    )
}

interface FakeProps {
    option: FFOption,
    line: string,
    game: FFGame,
    nameOf: (id: string) => string
}

/** One invention, with its author named and what it earned them. */
function Fake({ option, line, game, nameOf }: FakeProps) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const voters = option.voters ?? [];

    // A fake always has an author; the guard is for a round that arrives without one.
    const author = option.authorId === undefined || option.authorId === TRUTH_AUTHOR_ID
        ? null
        : nameOf(option.authorId);

    const swatch = avatarColorById(
        game.players.find(player => player.userId === option.authorId)?.avatarColorId ?? ''
    );

    return (
        <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: swatch.color }]}>
                <AppText style={[styles.initials, { color: swatch.foreground }]}>
                    {author === null ? '?' : initialsOf(author)}
                </AppText>
            </View>

            <View style={styles.rowBody}>
                <FilledLine
                    line={line}
                    fills={option.fills}
                    size={13.5}
                    mark={withAlpha(theme.colors.lemon, 0.55)}
                    lines={3}
                />

                <AppText style={styles.byline}>
                    {[
                        author === null
                            ? null
                            : t('fakeFiller.play.reveal.writtenBy', { name: author }),
                        voters.length === 0
                            ? t('fakeFiller.play.reveal.nobodyPicked')
                            : t('fakeFiller.play.reveal.pickedBy', {
                                names: voters.map(nameOf).join(', ')
                            })
                    ].filter(part => part !== null).join(' · ')}
                </AppText>
            </View>

            {/* Only a fake pays its author, and only when somebody fell for it. */}
            <AppText style={[styles.points, voters.length === 0 && styles.pointsNone]}>
                {voters.length === 0
                    ? '0'
                    : t('fakeFiller.play.reveal.points', { points: voters.length })}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    scroll: {
        flex: 1,
        width: '100%'
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.four,
        gap: Spacing.two + Spacing.one
    },
    kicker: {
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },
    // The one surface on the screen with a colour, because it is the one thing everybody was after.
    truth: {
        padding: 14,
        borderRadius: 18,
        borderWidth: 3,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint,
        boxShadow: `4px 4px 0 0 ${theme.colors.shadow}`
    },
    truthNote: {
        marginTop: -Spacing.one,
        fontSize: 11.5,
        lineHeight: 11.5 * 1.45,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    rows: {
        gap: Spacing.two
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 11,
        borderRadius: 14,
        backgroundColor: withAlpha(theme.colors.text, 0.05)
    },
    avatar: {
        width: 26,
        height: 26,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        borderWidth: 2,
        borderColor: Brand.ink
    },
    initials: {
        fontSize: 10,
        fontWeight: 900
    },
    rowBody: {
        flex: 1,
        minWidth: 0,
        gap: 2
    },
    byline: {
        fontSize: 11,
        lineHeight: 11 * 1.4,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    points: {
        fontSize: 13,
        fontWeight: 900,
        fontVariant: ['tabular-nums'],
        color: theme.colors.text
    },
    // Nothing earned, so the number is there to be read past rather than read.
    pointsNone: {
        color: theme.colors.textMuted
    },
    scores: {
        marginTop: 'auto'
    },
    foot: {
        gap: Spacing.two
    }
}))
