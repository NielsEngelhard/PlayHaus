import { matchesInStage, stagesOf, type Bracket, type Tournament } from "@/api/calls/league-of-letters-tournament";
import LobbyPageBase from "@/components/layout/LobbyPageBase";
import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import Tabs from "@/components/ui/Tabs";
import { LEAGUE_OF_LETTERS } from "@/constants/games";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import MatchCell from "@/features/league-of-letters/components/tournament/MatchCell";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import { useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";

interface Props {
    tournament: Tournament,
    /** Whose screen this is, so their own matches are picked out of the columns. */
    userId: string | undefined,
    /** Whether this device is live, drawn as the pill in the bar. */
    live: boolean,
    /** Opens the leave confirm. Owned by the screen, which also acts on it. */
    onBack: () => void,
    /** The ready gate, pinned to the bottom of the page. */
    footer: ReactNode
}

const POOLS = ['winners', 'losers'] as const;

/** Wide enough for two of these to sit side by side on a phone, as the design draws them. */
const COLUMN_WIDTH = 156;

// The bracket, between one round and the next.
export default function BracketView({ tournament, userId, live, onBack, footer }: Props) {
    const styles = useStyles();
    const theme = useTheme();
    const t = useT();

    const [pool, setPool] = useState<Bracket>('winners');

    const standing = tournament.players.filter(player => !player.eliminated);
    const counts = {
        winners: standing.filter(player => player.losses === 0).length,
        losers: standing.filter(player => player.losses > 0).length
    };

    const stage = matchesInStage(tournament, tournament.stage);
    const outstanding = stage.filter(match => match.status === 'live').length;

    // The last round is a single match between the last two, and belongs to neither column.
    const final = tournament.matches.filter(match => match.bracket === 'final');

    const me = tournament.players.find(player => player.userId === userId);

    return (
        <LobbyPageBase
            game={LEAGUE_OF_LETTERS}
            title={t('lol.tournament.title', { players: tournament.players.length })}
            live={live}
            onBack={onBack}
            backLabel={t('lobby.leave')}
            code={tournament.code}
            footer={footer}
        >
            <View style={styles.header}>
                <AppText style={styles.kicker}>{t('lol.tournament.schedule')}</AppText>

                <AppText style={styles.status}>
                    {tournament.stageOver
                        ? t('lol.tournament.nextRoundReady', { stage: tournament.stage + 1 })
                        : t('lol.tournament.matchesLeft', {
                            done: stage.length - outstanding,
                            total: stage.length,
                            left: outstanding
                        })}
                </AppText>
            </View>

            {me?.eliminated === true && (
                <InlineNotification
                    icon='eye'
                    color={theme.colors.violet}
                    title={t('lol.tournament.knockedOut.title')}
                    message={t('lol.tournament.knockedOut.message', { place: me.placement ?? 0 })}
                />
            )}

            <Tabs
                activeTab={pool}
                tabs={POOLS}
                onClick={setPool}
                getLabel={tab => tab === 'winners'
                    ? t('lol.tournament.winners', { players: counts.winners })
                    : t('lol.tournament.losers', { players: counts.losers })}
            />

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.columns}
            >
                {stagesOf(tournament).map(number => (
                    <StageColumn
                        key={number}
                        number={number}
                        tournament={tournament}
                        pool={pool}
                        userId={userId}
                    />
                ))}
            </ScrollView>

            {final.length > 0 && (
                <View style={styles.final}>
                    <AppText style={styles.columnTitle}>{t('lol.tournament.final')}</AppText>

                    {final.map(match => (
                        <MatchCell key={match.id} match={match} userId={userId} />
                    ))}
                </View>
            )}
        </LobbyPageBase>
    )
}

interface StageColumnProps {
    number: number,
    tournament: Tournament,
    pool: Bracket,
    userId: string | undefined
}

// One round of one half of the bracket.
function StageColumn({ number, tournament, pool, userId }: StageColumnProps) {
    const styles = useStyles();
    const t = useT();

    const matches = matchesInStage(tournament, number).filter(match => match.bracket === pool);

    return (
        <View style={styles.column}>
            <AppText style={styles.columnTitle}>
                {matches.length === 1
                    ? t('lol.tournament.stageOne', { stage: number })
                    : t('lol.tournament.stageMany', { stage: number, matches: matches.length })}
            </AppText>

            {matches.length === 0 ? (
                <AppText style={styles.empty}>{t('lol.tournament.nothingHere')}</AppText>
            ) : (
                matches.map(match => (
                    <MatchCell key={match.id} match={match} userId={userId} />
                ))
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    header: {
        gap: 4
    },
    kicker: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    status: {
        fontSize: 13.5,
        fontWeight: 800,
        color: theme.colors.text
    },

    // Scrolls sideways, so a bracket six rounds deep still reads left to right.
    columns: {
        gap: Spacing.two,
        paddingRight: Spacing.two
    },
    column: {
        width: COLUMN_WIDTH,
        gap: 8
    },
    columnTitle: {
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.textMuted
    },
    empty: {
        fontSize: 11.5,
        fontWeight: 600,
        color: theme.colors.textFaint
    },

    final: {
        gap: 8
    }
}))
