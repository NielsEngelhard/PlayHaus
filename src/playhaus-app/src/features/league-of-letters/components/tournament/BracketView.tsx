import { matchesInStage, stagesOf, type Tournament, type TournamentMatch } from "@/api/calls/league-of-letters-tournament";
import LobbyPageBase from "@/components/layout/LobbyPageBase";
import AppText from "@/components/text/AppText";
import InlineNotification from "@/components/ui/InlineNotification";
import { LEAGUE_OF_LETTERS } from "@/constants/games";
import { Brand, Radii, Spacing, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { gridColumns, gridRows, projectedWinners, roundOf, roundSettled, type ProjectedMatch } from "@/features/league-of-letters/bracket";
import MatchCell from "@/features/league-of-letters/components/tournament/MatchCell";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import type { ReactNode } from "react";
import { View } from "react-native";

interface Props {
    tournament: Tournament,
    /** Whose screen this is, so their own matches are picked out of the bracket. */
    userId: string | undefined,
    /** Whether this device is live, drawn as the pill in the bar. */
    live: boolean,
    /** Opens the leave confirm. Owned by the screen, which also acts on it. */
    onBack: () => void,
    /** The gate for this round, pinned to the bottom of the page. */
    footer: ReactNode
}

const SPINE_HEIGHT = 3;
const BAND_LABEL_SIZE = 10.5;
const FUNNEL_HEIGHT = 28;
const FUNNEL_DROP = 8;
const FUNNEL_STROKE = 2;
const FUNNEL_FOOT = 16;
const PLACEHOLDER_HEIGHT = 52;
const PILL_BORDER = 1.5;

type Spine = 'winners' | 'winnersNext' | 'losers' | 'final';

// The bracket, stood upright: rounds run down the page and both halves are on it at once.
export default function BracketView({ tournament, userId, live, onBack, footer }: Props) {
    const styles = useStyles();
    const theme = useTheme();
    const t = useT();

    const stage = matchesInStage(tournament, tournament.stage);
    const outstanding = stage.filter(match => match.status === 'live').length;

    const stages = stagesOf(tournament);
    const winners = stages
        .map(number => ({ number, matches: roundOf(tournament, number, 'winners') }))
        .filter(round => round.matches.length > 0);
    const losers = stages
        .map(number => ({ number, matches: roundOf(tournament, number, 'losers') }))
        .filter(round => round.matches.length > 0);
    const final = tournament.matches.filter(match => match.bracket === 'final');

    const projected = projectedWinners(tournament, userId);
    const lastWinners = winners.at(-1);

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
                <AppText style={styles.kicker}>{t('lol.tournament.bracketKicker')}</AppText>

                <AppText style={styles.status}>
                    {tournament.stagePending
                        ? t('lol.tournament.stageDrawn', { stage: tournament.stage })
                        : tournament.stageOver
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

            <View style={styles.bracket}>
                {winners.map((round, i) => {
                    const next = winners[i + 1];

                    return (
                        <View key={round.number} style={styles.section}>
                            <RoundBand
                                title={t('lol.tournament.winnersRound', { stage: round.number })}
                                spine='winners'
                                count={roundSettled(round.matches) ? t('lol.tournament.settled') : String(playersIn(round.matches))}
                            />

                            <MatchGrid matches={round.matches} userId={userId} />

                            {next !== undefined && (
                                <Funnel
                                    from={gridColumns(round.matches.length)}
                                    to={gridColumns(next.matches.length)}
                                    settled={roundSettled(round.matches)}
                                    advancing={round.matches.length}
                                />
                            )}
                        </View>
                    )
                })}

                {lastWinners !== undefined && projected.length > 0 && (
                    <View style={styles.section}>
                        <Funnel
                            from={gridColumns(lastWinners.matches.length)}
                            to={gridColumns(projected.length)}
                            settled={roundSettled(lastWinners.matches)}
                            advancing={lastWinners.matches.length}
                        />

                        <RoundBand
                            title={t('lol.tournament.winnersRound', { stage: lastWinners.number + 1 })}
                            spine='winnersNext'
                            count={String(lastWinners.matches.length)}
                        />

                        <PlaceholderGrid projected={projected} />
                    </View>
                )}

                {losers.map(round => (
                    <View key={`losers-${round.number}`} style={styles.section}>
                        <RoundBand
                            title={t('lol.tournament.losersRound', { stage: round.number })}
                            spine='losers'
                            count={roundSettled(round.matches) ? t('lol.tournament.settled') : String(playersIn(round.matches))}
                        />

                        <MatchGrid matches={round.matches} userId={userId} />
                    </View>
                ))}

                {losers.length === 0 && final.length === 0 && (
                    <View style={styles.section}>
                        <RoundBand
                            title={t('lol.tournament.losersRound', { stage: tournament.stage + 1 })}
                            spine='losers'
                            count='0'
                        />

                        <LosersCallout stage={tournament.stage} />
                    </View>
                )}

                {final.length > 0 && (
                    <View style={styles.section}>
                        <RoundBand
                            title={t('lol.tournament.final')}
                            spine='final'
                            count={roundSettled(final) ? t('lol.tournament.settled') : String(playersIn(final))}
                        />

                        <MatchGrid matches={final} userId={userId} />
                    </View>
                )}
            </View>
        </LobbyPageBase>
    )
}

function playersIn(matches: TournamentMatch[]): number {
    return matches.reduce((sum, match) => sum + match.players.length, 0);
}

interface RoundBandProps {
    title: string,
    spine: Spine,
    count: string
}

// A round's title, the coloured spine that says which half it belongs to, and how many are in it.
function RoundBand({ title, spine, count }: RoundBandProps) {
    const styles = useStyles();

    return (
        <View style={styles.band}>
            <AppText style={styles.bandTitle} numberOfLines={1}>{title}</AppText>

            <View style={[styles.spine, SPINES[spine]]} />

            <AppText style={styles.bandCount}>{count}</AppText>
        </View>
    )
}

const SPINES: Record<Spine, { backgroundColor: string }> = {
    winners: { backgroundColor: Brand.mint },
    winnersNext: { backgroundColor: withAlpha(Brand.mint, 0.45) },
    losers: { backgroundColor: Brand.blush },
    final: { backgroundColor: Brand.lemon }
};

interface MatchGridProps {
    matches: TournamentMatch[],
    userId: string | undefined
}

// A round three-up, every row keeping the same columns so the funnels land on their centres.
function MatchGrid({ matches, userId }: MatchGridProps) {
    const styles = useStyles();

    return (
        <View style={styles.grid}>
            {gridRows(matches, gridColumns(matches.length)).map((row, i) => (
                <View key={i} style={styles.gridRow}>
                    {row.map((match, j) => (
                        <View key={match?.id ?? `empty-${j}`} style={styles.slot}>
                            {match !== null && <MatchCell match={match} userId={userId} />}
                        </View>
                    ))}
                </View>
            ))}
        </View>
    )
}

// The next winners round before it is drawn, labelled by the matches that feed it.
function PlaceholderGrid({ projected }: { projected: ProjectedMatch[] }) {
    const styles = useStyles();
    const t = useT();

    return (
        <View style={styles.grid}>
            {gridRows(projected, gridColumns(projected.length)).map((row, i) => (
                <View key={i} style={styles.gridRow}>
                    {row.map((slot, j) => (
                        <View key={j} style={styles.slot}>
                            {slot !== null && (
                                <View style={[styles.placeholder, slot.mine && styles.placeholderMine]}>
                                    <AppText style={[styles.placeholderTitle, slot.mine && styles.placeholderTitleMine]} numberOfLines={1}>
                                        {slot.feeders.join(' · ')}
                                    </AppText>

                                    <AppText style={[styles.placeholderNote, slot.mine && styles.placeholderNoteMine]} numberOfLines={1}>
                                        {slot.mine ? t('lol.tournament.yourSide') : t('lol.tournament.feedsEmpty')}
                                    </AppText>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            ))}
        </View>
    )
}

interface FunnelProps {
    from: number,
    to: number,
    settled: boolean,
    advancing: number
}

// Where a stub sits across the width, as a percentage, for column i of n.
const centreOf = (i: number, n: number) => ((2 * i + 1) / (2 * n)) * 100;

// The ink between two rounds that shows the field halving: grey until the upper round is played.
function Funnel({ from, to, settled, advancing }: FunnelProps) {
    const styles = useStyles();
    const t = useT();

    const drops = Array.from({ length: from }, (_, i) => centreOf(i, from));
    const feeds = Array.from({ length: to }, (_, i) => centreOf(i, to));
    const all = [...drops, ...feeds];
    const left = Math.min(...all);
    const right = 100 - Math.max(...all);

    const stroke = settled ? styles.strokeSettled : styles.strokeOpen;

    return (
        <View style={styles.funnel}>
            {drops.map(at => (
                <View key={`drop-${at}`} style={[styles.drop, stroke, { left: `${at}%` }]} />
            ))}

            <View style={[styles.bar, stroke, { left: `${left}%`, right: `${right}%` }]} />

            {feeds.map(at => (
                <View key={`feed-${at}`} style={[styles.feed, { left: `${at}%` }]}>
                    <View style={[styles.feedStem, stroke]} />
                    <View style={[styles.feedFoot, stroke]} />
                </View>
            ))}

            <View style={[styles.pill, settled && styles.pillSettled]}>
                <AppText style={[styles.pillText, settled && styles.pillTextSettled]}>
                    {t('lol.tournament.advancing', { players: advancing })}
                </AppText>
            </View>
        </View>
    )
}

// Says where losing sends you, before the losers half has a single match in it.
function LosersCallout({ stage }: { stage: number }) {
    const styles = useStyles();
    const theme = useTheme();
    const t = useT();

    return (
        <View style={styles.callout}>
            <Feather name='arrow-down' size={15} color={theme.colors.text} />

            <AppText style={styles.calloutText}>{t('lol.tournament.dropsHere', { stage })}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    header: {
        gap: Spacing.one
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

    bracket: {
        gap: Spacing.three
    },
    section: {
        gap: Spacing.two
    },

    band: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    bandTitle: {
        flexShrink: 1,
        fontSize: BAND_LABEL_SIZE,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.text
    },
    spine: {
        flex: 1,
        height: SPINE_HEIGHT,
        borderRadius: Radii.full
    },
    bandCount: {
        fontSize: BAND_LABEL_SIZE,
        fontWeight: 900,
        color: theme.colors.textSecondary
    },

    // Slots are padded rather than gapped, so a column's centre is an exact fraction of the width.
    grid: {
        gap: Spacing.two,
        marginHorizontal: -Spacing.one
    },
    gridRow: {
        flexDirection: 'row'
    },
    slot: {
        flex: 1,
        flexBasis: 0,
        minWidth: 0,
        paddingHorizontal: Spacing.one
    },

    placeholder: {
        height: PLACEHOLDER_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.half,
        paddingHorizontal: Spacing.one,
        borderRadius: Radii.md,
        borderWidth: FUNNEL_STROKE,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderDashed
    },
    placeholderMine: {
        borderColor: theme.colors.text
    },
    placeholderTitle: {
        fontSize: BAND_LABEL_SIZE,
        fontWeight: 900,
        color: theme.colors.textMuted
    },
    placeholderTitleMine: {
        color: theme.colors.text
    },
    placeholderNote: {
        fontSize: 9.5,
        fontWeight: 700,
        color: theme.colors.textFaint
    },
    placeholderNoteMine: {
        color: theme.colors.textSecondary
    },

    funnel: {
        height: FUNNEL_HEIGHT
    },
    strokeOpen: {
        backgroundColor: theme.colors.borderDashed
    },
    strokeSettled: {
        backgroundColor: theme.colors.text
    },
    drop: {
        position: 'absolute',
        top: 0,
        width: FUNNEL_STROKE,
        height: FUNNEL_DROP,
        marginLeft: -FUNNEL_STROKE / 2
    },
    bar: {
        position: 'absolute',
        top: FUNNEL_DROP,
        height: FUNNEL_STROKE
    },
    feed: {
        position: 'absolute',
        top: FUNNEL_DROP,
        bottom: 0,
        width: FUNNEL_FOOT,
        marginLeft: -FUNNEL_FOOT / 2,
        alignItems: 'center'
    },
    feedStem: {
        flex: 1,
        width: FUNNEL_STROKE
    },
    feedFoot: {
        width: FUNNEL_FOOT,
        height: FUNNEL_STROKE
    },
    pill: {
        position: 'absolute',
        top: 0,
        right: 0,
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.half,
        borderRadius: Radii.full,
        borderWidth: PILL_BORDER,
        borderColor: theme.colors.borderDashed,
        backgroundColor: theme.colors.background
    },
    pillSettled: {
        borderColor: theme.colors.text,
        backgroundColor: Brand.mint
    },
    pillText: {
        fontSize: 9.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: theme.colors.textSecondary
    },
    pillTextSettled: {
        color: Brand.ink
    },

    callout: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three - Spacing.one,
        borderRadius: Radii.md,
        borderWidth: FUNNEL_STROKE,
        borderStyle: 'dashed',
        borderColor: withAlpha(Brand.blush, 0.9),
        backgroundColor: withAlpha(Brand.blush, 0.16)
    },
    calloutText: {
        flex: 1,
        minWidth: 0,
        fontSize: 11.5,
        fontWeight: 800,
        lineHeight: 15.5,
        color: theme.colors.text
    }
}))
