import { TRUTH_AUTHOR_ID, type FFGame, type FFOption, type FFRound } from "@/api/calls/fake-filler";
import InlineNotification from "@/components/ui/InlineNotification";
import VoteDuel, { clipName } from "@/components/ui/VoteDuel";
import { FAKE_FILLER } from "@/constants/games";
import { Brand } from "@/constants/theme";
import FilledLine from "@/features/fake-filler/components/play/FilledLine";
import { fillPrompt } from "@/features/fake-filler/prompt";
import { useT } from "@/features/i18n/LanguageContext";
import { useTheme } from "@/features/theme/ThemeContext";
import { Platform, useWindowDimensions } from "react-native";

interface Props {
    game: FFGame,
    round: FFRound,
    userId: string,
    busy: boolean,
    onVote: (roundNumber: number, slot: number) => Promise<boolean>,
    // Whether there is another round behind this one, which changes what the button says.
    more: boolean,
    // Only the host leaves the reveal, and only their tap moves the table.
    isHost: boolean,
    advancing: boolean,
    onContinue: () => void
}

// A fake always has an author; the guard is for a round that arrives without one.
function authorsOf(option: FFOption, nameOf: (id: string) => string): string[] {
    const ids = option.authorIds ?? (option.authorId === undefined ? [] : [option.authorId]);

    return ids.filter(id => id !== TRUTH_AUTHOR_ID).map(nameOf);
}

// A long prompt at the design's size would run off a small phone.
function useLineSize() {
    const { width } = useWindowDimensions();
    const mobile = Platform.OS !== 'web';

    if (width < 380) return mobile ? 16 : 18;

    return mobile ? 19 : 21;
}

// One round from vote to verdict, with the prompt filled in on every card.
export default function VotingScreen({ game, round, userId, busy, onVote, more, isHost, advancing, onContinue }: Props) {
    const t = useT();
    const theme = useTheme();
    const size = useLineSize();

    const nameOf = (id: string) => {
        if (id === userId) return t('common.you');

        return game.players.find(player => player.userId === id)?.name ?? '?';
    };

    const stampOf = (option: FFOption) => {
        if (option.isTruth === true) return t('fakeFiller.play.reveal.stamp.real');

        const authors = authorsOf(option, nameOf);
        if (authors.length === 0) return null;

        return authors.length > 1
            ? t('fakeFiller.play.reveal.stamp.more', { name: clipName(authors[0]), count: authors.length - 1 })
            : clipName(authors[0]);
    };

    return (
        <VoteDuel
            game={FAKE_FILLER}
            options={round.options ?? []}
            revealed={round.revealed}
            myVoteSlot={round.myVoteSlot}
            canVote={round.canVote}
            busy={busy}
            onVote={slot => void onVote(round.number, slot)}
            header={!round.revealed && !round.canVote && (
                // One of this round's authors, with nothing to do but watch.
                <InlineNotification
                    icon='eye'
                    color={theme.colors.lemon}
                    title={t('fakeFiller.play.voting.yoursTitle')}
                    message={t('fakeFiller.play.voting.yoursMessage')}
                />
            )}
            renderFront={(option, active) => (
                <FilledLine
                    line={round.line}
                    fills={option.fills}
                    size={size}
                    leading={1.55}
                    pill
                    color={active ? Brand.ink : undefined}
                />
            )}
            renderBack={option => (
                <FilledLine line={round.line} fills={option.fills} size={size} leading={1.55} pill color={Brand.ink} />
            )}
            spokenOf={option => fillPrompt(round.line, option.fills)}
            activeFill={theme.colors.mint}
            // The real answer in mint; somebody made the blush one up, whoever fell for it.
            backFill={option => option.isTruth === true ? theme.colors.mint : theme.colors.blush}
            stampOf={stampOf}
            votersOf={option => option.voters ?? []}
            players={game.players}
            userId={userId}
            more={more}
            isHost={isHost}
            advancing={advancing}
            onContinue={onContinue}
            labels={{
                or: t('fakeFiller.play.voting.or'),
                tapToPick: t('fakeFiller.play.voting.tapToPick'),
                voted: t('fakeFiller.play.voting.voted'),
                yourPick: t('fakeFiller.play.voting.yourPick'),
                option: letter => t('fakeFiller.play.voting.option', { letter }),
                progress: t('fakeFiller.play.voting.progress', { done: round.voteCount, total: game.votesNeeded }),
                waiting: t('fakeFiller.play.voting.waiting'),
                confirm: t('fakeFiller.play.voting.confirm'),
                busy: t('common.busy'),
                next: t('fakeFiller.play.reveal.next'),
                toResults: t('fakeFiller.play.reveal.toResults'),
                waitingForHost: t('fakeFiller.play.reveal.waitingForHost'),
                waitingForResults: t('fakeFiller.play.reveal.waitingForResults'),
                noVoters: t('fakeFiller.play.reveal.voters.none')
            }}
        />
    )
}
