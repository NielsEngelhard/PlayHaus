import { View } from "react-native";
import RoundChip from "./RoundChip";
import WordLengthChip from "./WordLengthChip";
import ScoreChip from "./ScoreChip";
import GameTimer from "./GameTimer";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Spacing } from "@/constants/theme";
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

export default function MetaDataRow({ game, outcome, firstLetter, myGuesses, multiplayer, round, finished }: Props) {
    const styles = useStyles();

    return (
            <View style={styles.topRow}>
                <RoundChip
                    outcome={outcome}
                    firstLetter={firstLetter}
                    tries={myGuesses.length}
                    maxGuesses={game.maxGuesses}
                />

                <WordLengthChip wordLength={game.wordLength} />

                {/* Solo already carries this number in `SoloStatusRow`, right below — a
                    second chip for the same score would just be saying it twice. */}
                {multiplayer && <ScoreChip score={game.score} />}

                {multiplayer && round.endsAt && !finished && (
                    <GameTimer endsAt={round.endsAt} style={styles.timer} />
                )}
            </View>        
    )
}

const useStyles = createThemedStyles(theme => ({
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },
    timer: {
        flexShrink: 0
    },
}))
