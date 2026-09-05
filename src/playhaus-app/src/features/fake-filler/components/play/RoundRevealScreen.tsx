import { TRUTH_AUTHOR_ID, type FFGame, type FFOption, type FFReveal } from "@/api/calls/fake-filler";
import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import PlayerScoreRow from "@/components/ui/PlayerScoreRow";
import TextButton from "@/components/ui/TextButton";
import { Brand, Spacing, withAlpha } from "@/constants/theme";
import { fillPrompt } from "@/features/fake-filler/prompt";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { ScrollView, View } from "react-native";

interface Props {
    game: FFGame,
    reveal: FFReveal,
    userId: string,
    /** Whether there is another round behind this one, which changes what the button says. */
    more: boolean,
    onContinue: () => void
}

/**
 * The end of a round, with everything told at last.
 *
 * This is the only screen in the game that names authors, and it is where the whole of the
 * redaction upstream pays off: until the last vote landed, nothing anybody held could say
 * who wrote which line. So it is worth being generous here — every option, who wrote it,
 * who fell for it, and which one was true.
 *
 * The board holds on this screen rather than following the server. `currentRound` has
 * already moved on by the time this renders — the last vote advanced it — so the reveal is
 * shown until the reader taps on, which is what `onContinue` is for. Without that the
 * payoff would be replaced by the next prompt in the same frame that produced it.
 */
export default function RoundRevealScreen({ game, reveal, userId, more, onContinue }: Props) {
    const t = useT();
    const styles = useStyles();

    // Truth first when there is one, then the fakes by how many they fooled: the round's
    // answer leads, and the rest read as a ranking of who got away with it.
    const ordered = [...reveal.options].sort((left, right) => {
        if (left.isTruth === true) return -1;
        if (right.isTruth === true) return 1;

        return (right.voters?.length ?? 0) - (left.voters?.length ?? 0);
    });

    return (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.intro}>
                <AppText style={styles.kicker}>
                    {t('fakeFiller.play.voting.roundOf', {
                        round: reveal.roundNumber,
                        total: game.totalRounds
                    })}
                </AppText>

                <AppText style={styles.title}>{t('fakeFiller.play.reveal.title')}</AppText>
            </View>

            {ordered.map(option => (
                <OptionResult
                    key={option.slot}
                    option={option}
                    line={reveal.line}
                    game={game}
                    userId={userId}
                />
            ))}

            <PlayerScoreRow players={game.players} userId={userId} style={styles.scores} />

            <TextButton
                text={more
                    ? t('fakeFiller.play.reveal.next')
                    : t('fakeFiller.play.reveal.toResults')}
                variant='primary'
                fullWidth
                onPress={onContinue}
            />
        </ScrollView>
    )
}

interface OptionResultProps {
    option: FFOption,
    line: string,
    game: FFGame,
    userId: string
}

/** One line of the line-up, with everything about it now sayable. */
function OptionResult({ option, line, game, userId }: OptionResultProps) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const truth = option.isTruth === true;
    const voters = option.voters ?? [];

    const nameOf = (id: string) => {
        if (id === userId) return t('common.you');

        return game.players.find(player => player.userId === id)?.name ?? '?';
    };

    // The truth has no author to credit: `TruthAuthorID` is not a player, which is also
    // why nobody is paid when it is picked.
    const author = truth || option.authorId === undefined || option.authorId === TRUTH_AUTHOR_ID
        ? null
        : nameOf(option.authorId);

    return (
        <Card style={[styles.option, truth && styles.optionTruth]}>
            <View style={styles.optionHead}>
                <View style={[styles.tag, truth ? styles.tagTruth : styles.tagFake]}>
                    <Feather
                        name={truth ? 'check' : 'edit-2'}
                        size={11}
                        color={truth ? Brand.ink : theme.colors.textSecondary}
                    />

                    <AppText style={[styles.tagText, truth && styles.tagTextTruth]}>
                        {truth ? t('fakeFiller.play.reveal.truth') : t('fakeFiller.play.reveal.fake')}
                    </AppText>
                </View>

                {/* Only a fake pays its author, and only when somebody fell for it. */}
                {!truth && voters.length > 0 && (
                    <AppText style={styles.points}>
                        {t('fakeFiller.play.reveal.points', { points: voters.length })}
                    </AppText>
                )}
            </View>

            <AppText style={styles.sentence}>{fillPrompt(line, option.fills)}</AppText>

            {author !== null && (
                <AppText style={styles.byline}>
                    {t('fakeFiller.play.reveal.writtenBy', { name: author })}
                </AppText>
            )}

            <AppText style={styles.voters}>
                {voters.length === 0
                    ? t('fakeFiller.play.reveal.nobodyPicked')
                    : t('fakeFiller.play.reveal.pickedBy', {
                        names: voters.map(nameOf).join(', ')
                    })}
            </AppText>
        </Card>
    )
}

const useStyles = createThemedStyles(theme => ({
    scroll: {
        flex: 1,
        width: '100%'
    },
    content: {
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.five,
        gap: Spacing.three
    },
    intro: {
        gap: 4
    },
    kicker: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },
    title: {
        fontSize: 24,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: theme.colors.text
    },
    option: {
        gap: 6
    },
    // The one card on the screen that is the answer, so it is the one with a colour.
    optionTruth: {
        borderColor: Brand.mint,
        backgroundColor: withAlpha(Brand.mint, 0.12)
    },
    optionHead: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 3,
        paddingHorizontal: 9,
        borderRadius: 999
    },
    tagTruth: {
        backgroundColor: Brand.mint
    },
    tagFake: {
        backgroundColor: theme.colors.backgroundSecondary
    },
    tagText: {
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: theme.colors.textSecondary
    },
    tagTextTruth: {
        // Ink in both schemes: it is sitting on the mint, not beside it.
        color: Brand.ink
    },
    points: {
        fontSize: 13,
        fontWeight: 900,
        fontVariant: ['tabular-nums'],
        color: theme.colors.available
    },
    sentence: {
        fontSize: 16,
        lineHeight: 16 * 1.5,
        fontWeight: 700,
        color: theme.colors.text
    },
    byline: {
        fontSize: 12,
        fontWeight: 800,
        color: theme.colors.textSecondary
    },
    voters: {
        fontSize: 12,
        lineHeight: 12 * 1.45,
        fontWeight: 600,
        color: theme.colors.textMuted
    },
    scores: {
        marginTop: Spacing.one
    }
}))
