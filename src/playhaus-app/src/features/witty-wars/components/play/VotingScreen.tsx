import type { WWGame, WWOption, WWRound } from "@/api/calls/witty-wars";
import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import VoteDuel, { clipName, DuelTag } from "@/components/ui/VoteDuel";
import { WITTY_WARS } from "@/constants/games";
import { Brand, FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import PromptCard from "@/features/witty-wars/components/play/PromptCard";
import { View } from "react-native";

interface Props {
    game: WWGame,
    round: WWRound,
    userId: string,
    busy: boolean,
    onVote: (roundNumber: number, slot: number) => Promise<boolean>,
    more: boolean,
    isHost: boolean,
    advancing: boolean,
    onContinue: () => void
}

// Whether an answer won its round: the most votes, a tie counting for both, and no votes winning nothing.
export function wonRound(round: WWRound, option: WWOption): boolean {
    const counts = (round.options ?? []).map(candidate => candidate.voters?.length ?? 0);
    const best = Math.max(0, ...counts);

    return best > 0 && (option.voters?.length ?? 0) === best;
}

// One duel from vote to verdict: the prompt above, the two answers below.
export default function VotingScreen({ game, round, userId, busy, onVote, more, isHost, advancing, onContinue }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const nameOf = (id: string) => {
        if (id === userId) return t('common.you');

        return game.players.find(player => player.userId === id)?.name ?? '?';
    };

    const stampOf = (option: WWOption) => {
        const ids = option.authorIds ?? (option.authorId === undefined ? [] : [option.authorId]);
        if (ids.length === 0) return null;

        const names = ids.map(nameOf);

        return names.length > 1
            ? t('wittyWars.play.reveal.stampMore', { name: clipName(names[0]), count: names.length - 1 })
            : clipName(names[0]);
    };

    const answerText = (option: WWOption, ink: boolean) => (
        <AppText style={[styles.answer, ink && styles.answerOnFill]}>{option.answer}</AppText>
    );

    return (
        <VoteDuel
            game={WITTY_WARS}
            options={round.options ?? []}
            revealed={round.revealed}
            myVoteSlot={round.myVoteSlot}
            canVote={round.canVote}
            busy={busy}
            onVote={slot => void onVote(round.number, slot)}
            header={(
                <View style={styles.header}>
                    <PromptCard line={round.line} compact />

                    {!round.revealed && !round.canVote && (
                        // One of the two writers, with nothing to do but watch.
                        <InlineNotification
                            icon='eye'
                            color={theme.colors.lemon}
                            title={t('wittyWars.play.voting.yoursTitle')}
                            message={t('wittyWars.play.voting.yoursMessage')}
                        />
                    )}
                </View>
            )}
            renderFront={(option, active) => answerText(option, active)}
            renderBack={option => answerText(option, true)}
            spokenOf={option => option.answer}
            activeFill={theme.colors.blush}
            // The winner wears the game's pink; the loser a neutral no accent claims.
            backFill={option => wonRound(round, option) ? theme.colors.blush : Brand.fog}
            stampOf={stampOf}
            tagsOf={option => (
                <>
                    {(option.points ?? 0) > 0 && <DuelTag text={t('wittyWars.play.reveal.points', { points: option.points ?? 0 })} />}
                    {option.sweep === true && <DuelTag text={t('wittyWars.play.reveal.sweep')} />}
                </>
            )}
            votersOf={option => option.voters ?? []}
            players={game.players}
            userId={userId}
            more={more}
            isHost={isHost}
            advancing={advancing}
            onContinue={onContinue}
            labels={{
                or: t('wittyWars.play.voting.or'),
                tapToPick: t('wittyWars.play.voting.tapToPick'),
                voted: t('wittyWars.play.voting.voted'),
                yourPick: t('wittyWars.play.voting.yourPick'),
                option: letter => t('wittyWars.play.voting.option', { letter }),
                progress: t('wittyWars.play.voting.progress', { done: round.voteCount, total: game.votesNeeded }),
                waiting: t('wittyWars.play.voting.waiting'),
                confirm: t('wittyWars.play.voting.confirm'),
                busy: t('common.busy'),
                next: t('wittyWars.play.reveal.next'),
                toResults: t('wittyWars.play.reveal.toResults'),
                waitingForHost: t('wittyWars.play.reveal.waitingForHost'),
                waitingForResults: t('wittyWars.play.reveal.waitingForResults'),
                noVoters: t('wittyWars.play.reveal.noVoters')
            }}
        />
    )
}

const useStyles = createThemedStyles(theme => ({
    header: {
        gap: Spacing.three
    },
    answer: {
        fontSize: FontSizes.xl,
        lineHeight: FontSizes.xl * 1.3,
        fontWeight: 800,
        color: theme.colors.text
    },
    // On the pink and on the fog, both of which carry ink in either scheme.
    answerOnFill: {
        color: Brand.ink
    }
}))
