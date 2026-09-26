import GameMark from "@/components/layout/GameMark";
import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import BleedScrollView from "@/components/ui/BleedScrollView";
import { usePressPop } from "@/components/ui/usePressPop";
import { accentOf, type Game } from "@/constants/games";
import { accentInkColor, Brand, FontSizes, hardShadow, linearGradient, Radii, ShadowReach, Spacing, withAlpha } from "@/constants/theme";
import { useT, useUiLanguage } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { AvatarColor } from "@/utils/color-utils";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// One finisher, in whatever ids the game deals in.
export interface ScoreBoardPlayer {
    id: string,
    name: string,
    score: number,
    // Stars outrank score, and a player with stars outranks one without; absent in every game that has none.
    stars?: number,
    swatch: AvatarColor
}

// The one committing button under the board.
export interface ScoreBoardAction {
    disabled?: boolean,
    icon: keyof typeof Feather.glyphMap,
    onPress: () => void,
    text: string
}

interface Props {
    // Omitted for a guest, who waits on the host instead.
    action?: ScoreBoardAction,
    // Said under the action button, which stays pressable.
    error?: TranslationKey | null,
    game: Game,
    onClose: () => void,
    // Any order: ranked here.
    players: ScoreBoardPlayer[],
    totalRounds: number,
    // Shows the "stay here" strip in the footer when there is no action.
    waitingForHost?: boolean,
    // Whose screen this is, so one name can say `you`.
    youId?: string
}

interface Placed {
    place: number,
    player: ScoreBoardPlayer
}

const TIER_FILLS: Record<number, string> = {
    1: Brand.lemon,
    2: Brand.silver,
    3: Brand.bronze
};

type AvatarKind = 'winner' | 'ticket' | 'row';

const AVATARS: Record<AvatarKind, { initialSize: number, size: number }> = {
    winner: { initialSize: FontSizes.xxl, size: 72 },
    ticket: { initialSize: FontSizes.md, size: 40 },
    row: { initialSize: FontSizes.xs, size: 32 }
};

// Static flecks behind the winner card, placed as a fraction of the band's width so they spread with it.
const CONFETTI: { x: number, y: number, wide: boolean, square?: boolean, color: string, turn: number }[] = [
    { x: 0.04, y: 16, wide: true, color: Brand.lemon, turn: -20 },
    { x: 0.18, y: 64, wide: false, color: Brand.secondary, turn: 15 },
    { x: 0.84, y: 8, wide: true, color: Brand.mint, turn: 30 },
    { x: 0.93, y: 72, wide: false, color: Brand.primary, turn: -10 },
    { x: 0.7, y: 48, wide: false, square: true, color: Brand.textOnAccent, turn: 0 },
    { x: 0.31, y: 8, wide: false, color: Brand.violet, turn: 45 },
    { x: 0.02, y: 96, wide: false, square: true, color: Brand.primary, turn: 0 },
    { x: 0.56, y: 96, wide: true, color: Brand.lemon, turn: -35 }
];

const CONFETTI_TOP = 56;
const CONFETTI_HEIGHT = 120;
const CONFETTI_RADIUS = 2;
const CLOSE_SIZE = 32;
const CLOSE_GLYPH = 16;
const TROPHY_SIZE = 32;
const TROPHY_GLYPH = 16;
const PLACE_WIDTH = 24;
const SCORE_WIDTH = 48;
const DOT_SIZE = 8;
const WAITING_HEIGHT = 54;

// Positive when `a` finishes above `b`.
function ahead(a: ScoreBoardPlayer, b: ScoreBoardPlayer): number {
    return Number(a.stars !== undefined) - Number(b.stars !== undefined)
        || (a.stars ?? 0) - (b.stars ?? 0)
        || a.score - b.score;
}

// Tied players share a place, so two players on the top score are both first.
function rank(players: ScoreBoardPlayer[]): Placed[] {
    const sorted = [...players].sort((a, b) => ahead(b, a));

    return sorted.map(player => ({
        place: 1 + sorted.filter(other => ahead(other, player) > 0).length,
        player
    }));
}

function initialOf(name: string): string {
    return [...name.trim()][0]?.toUpperCase() ?? '?';
}

// How a game ends for everybody at the table: the winner on a poster, second and third on tickets, everyone in the list.
export default function ScoreBoardScreen({ action, error, game, onClose, players, totalRounds, waitingForHost = false, youId }: Props) {
    const styles = useStyles();
    const t = useT();
    const language = useUiLanguage();
    const insets = useSafeAreaInsets();
    const closePop = usePressPop();

    const accent = accentOf(game);
    const ink = accentInkColor(accent.ink);

    const ranked = rank(players);
    const [best, runnerUp] = ranked;
    const drawn = best !== undefined && runnerUp !== undefined && ahead(best.player, runnerUp.player) === 0;
    const tickets = ranked.slice(1, 3);

    const nameOf = (player: ScoreBoardPlayer) => player.id === youId ? t('common.you') : player.name;
    const points = (score: number) => score.toLocaleString(language);

    return (
        <View style={[styles.screen, { paddingTop: insets.top + Spacing.three }]}>
            <View style={[styles.band, linearGradient(accent.gradient)]}>
                <View pointerEvents="none" style={styles.confetti}>
                    {CONFETTI.map((fleck, index) => (
                        <View
                            key={index}
                            style={[
                                styles.fleck,
                                fleck.square ? styles.fleckSquare : fleck.wide ? styles.fleckWide : styles.fleckTall,
                                { left: `${fleck.x * 100}%`, top: fleck.y, backgroundColor: fleck.color, transform: [{ rotate: `${fleck.turn}deg` }] }
                            ]}
                        />
                    ))}
                </View>

                <View style={styles.row}>
                    {game.icon !== undefined && <GameMark icon={game.icon} label={game.name} />}

                    <View style={styles.heading}>
                        <AppText style={[styles.eyebrow, { color: withAlpha(ink, 0.72) }]} numberOfLines={1}>
                            {t('scoreboard.eyebrow')}
                        </AppText>

                        <AppText style={[styles.subtitle, { color: ink }]} numberOfLines={1}>
                            {t('scoreboard.subtitle', { game: game.name, rounds: totalRounds })}
                        </AppText>
                    </View>

                    <AnimatedPressable
                        onPress={onClose}
                        onPressIn={closePop.onPressIn}
                        onPressOut={closePop.onPressOut}
                        onHoverIn={closePop.onHoverIn}
                        onHoverOut={closePop.onHoverOut}
                        accessibilityRole="button"
                        accessibilityLabel={t('common.close')}
                        style={[styles.close, { backgroundColor: withAlpha(ink, 0.12) }, closePop.animatedStyle]}
                    >
                        <Feather name="x" size={CLOSE_GLYPH} color={ink} />
                    </AnimatedPressable>
                </View>

                {best !== undefined && (
                    <View style={styles.winner}>
                        <View>
                            <Avatar kind="winner" player={best.player} />

                            <View style={styles.trophy}>
                                <Ionicons name="trophy-outline" size={TROPHY_GLYPH} color={Brand.ink} />
                            </View>
                        </View>

                        <View style={styles.winnerText}>
                            <AppText style={styles.winnerLabel} numberOfLines={1}>
                                {t(drawn ? 'scoreboard.draw' : 'scoreboard.winner')}
                            </AppText>

                            <AppText accessibilityRole="header" style={styles.winnerName} numberOfLines={1}>
                                {nameOf(best.player)}
                            </AppText>

                            <AppText style={styles.winnerScore} numberOfLines={1}>
                                {best.player.stars !== undefined
                                    ? t('scoreboard.pointsStars', { stars: best.player.stars, score: points(best.player.score) })
                                    : t('scoreboard.points', { score: points(best.player.score) })}
                            </AppText>
                        </View>

                        <View style={styles.firstTag}>
                            <AppText style={styles.firstTagText}>#1</AppText>
                        </View>
                    </View>
                )}
            </View>

            {tickets.length > 0 && (
                <View style={styles.tickets}>
                    {tickets.map((entry, index) => (
                        <View
                            key={entry.player.id}
                            style={[styles.ticket, index === 0 ? styles.ticketLeft : styles.ticketRight, { backgroundColor: TIER_FILLS[entry.place] }]}
                        >
                            <View style={styles.ticketTop}>
                                <Avatar kind="ticket" player={entry.player} />
                                <AppText style={styles.ticketPlace}>{entry.place}</AppText>
                            </View>

                            <View>
                                <AppText style={styles.ticketName} numberOfLines={1}>{nameOf(entry.player)}</AppText>
                                <AppText style={styles.ticketScore} numberOfLines={1}>
                                    {entry.player.stars !== undefined
                                        ? t('scoreboard.pointsStars', { stars: entry.player.stars, score: points(entry.player.score) })
                                        : points(entry.player.score)}
                                </AppText>
                            </View>
                        </View>
                    ))}

                    {tickets.length === 1 && <View style={styles.ticketSpacer} />}
                </View>
            )}

            <BleedScrollView
                bleed={Spacing.three}
                style={styles.scroller}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {ranked.length > 0 && (
                    <AppText style={styles.listTitle}>{t('scoreboard.standings')}</AppText>
                )}

                {ranked.map(entry => {
                    const you = entry.player.id === youId;
                    const tier = TIER_FILLS[entry.place];

                    return (
                        <View key={entry.player.id} style={[styles.line, you && styles.lineYou]}>
                            {tier !== undefined && !you ? (
                                <View style={[styles.badge, { backgroundColor: tier }]}>
                                    <AppText style={styles.badgeText}>{entry.place}</AppText>
                                </View>
                            ) : (
                                <AppText style={[styles.linePlace, you && styles.linePlaceYou]}>{entry.place}</AppText>
                            )}

                            <Avatar kind="row" player={entry.player} />

                            <View style={styles.lineMiddle}>
                                <AppText style={[styles.lineName, you && styles.lineNameYou]} numberOfLines={1}>{entry.player.name}</AppText>

                                {you && (
                                    <View style={styles.youChip}>
                                        <AppText style={styles.youChipText}>{t('common.you')}</AppText>
                                    </View>
                                )}
                            </View>

                            {entry.player.stars !== undefined && (
                                <AppText style={styles.lineStars}>{t('scoreboard.stars', { stars: entry.player.stars })}</AppText>
                            )}

                            <AppText style={styles.lineScore}>{points(entry.player.score)}</AppText>
                        </View>
                    );
                })}
            </BleedScrollView>

            {action !== undefined ? (
                <View style={styles.footer}>
                    <ActionButton
                        size="large"
                        text={action.text}
                        icon={action.icon}
                        disabled={action.disabled}
                        onPress={action.onPress}
                    />

                    {error != null && <AppText style={styles.error}>{t(error)}</AppText>}
                </View>
            ) : waitingForHost && (
                <View style={styles.footer}>
                    <View style={styles.waiting}>
                        <View style={styles.dots}>
                            <View style={styles.dot} />
                            <View style={[styles.dot, styles.dotMid]} />
                            <View style={[styles.dot, styles.dotFar]} />
                        </View>

                        <AppText style={styles.waitingText}>
                            {t('scoreboard.waitingForHost')}
                            <AppText style={styles.waitingStay}>{t('scoreboard.stayHere')}</AppText>
                        </AppText>
                    </View>
                </View>
            )}
        </View>
    )
}

interface AvatarProps {
    kind: AvatarKind,
    player: ScoreBoardPlayer
}

function Avatar({ kind, player }: AvatarProps) {
    const styles = useStyles();

    const { initialSize, size } = AVATARS[kind];

    return (
        <View
            style={[
                styles.avatar,
                kind === 'row' && styles.avatarRow,
                { width: size, height: size, backgroundColor: player.swatch.color }
            ]}
        >
            <AppText style={[styles.initial, { fontSize: initialSize, color: player.swatch.foreground }]}>
                {initialOf(player.name)}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Callers are chromeless, so the gutters are this screen's own.
    screen: {
        flex: 1,
        width: '100%',
        paddingHorizontal: Spacing.three
    },
    band: {
        flexShrink: 0,
        gap: Spacing.four,
        padding: Spacing.three,
        paddingBottom: Spacing.five,
        borderRadius: Radii.band,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        ...theme.shadows.hard
    },
    confetti: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: CONFETTI_TOP,
        height: CONFETTI_HEIGHT
    },
    fleck: {
        position: 'absolute',
        borderRadius: CONFETTI_RADIUS,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink
    },
    fleckWide: {
        width: Spacing.three,
        height: Spacing.two
    },
    fleckTall: {
        width: Spacing.two,
        height: Spacing.three
    },
    fleckSquare: {
        width: Spacing.two,
        height: Spacing.two
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    heading: {
        flex: 1,
        minWidth: 0
    },
    eyebrow: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 2,
        textTransform: 'uppercase'
    },
    subtitle: {
        fontSize: FontSizes.md,
        fontWeight: 900
    },
    close: {
        width: CLOSE_SIZE,
        height: CLOSE_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full
    },
    // Lemon and ink in both schemes: it sits on the band, not on the page.
    winner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        padding: Spacing.three,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon,
        transform: [{ rotate: '-2deg' }],
        ...hardShadow(ShadowReach.hardLarge, Brand.ink)
    },
    trophy: {
        position: 'absolute',
        bottom: -Spacing.two,
        right: -Spacing.two,
        width: TROPHY_SIZE,
        height: TROPHY_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent
    },
    winnerText: {
        flex: 1,
        minWidth: 0,
        gap: Spacing.half
    },
    winnerLabel: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: withAlpha(Brand.ink, 0.72)
    },
    winnerName: {
        fontSize: FontSizes.xxxl,
        lineHeight: FontSizes.xxxl,
        fontWeight: 900,
        letterSpacing: -1.2,
        color: Brand.ink
    },
    winnerScore: {
        fontSize: FontSizes.lg,
        fontWeight: 900,
        color: Brand.ink
    },
    firstTag: {
        position: 'absolute',
        top: -Spacing.three,
        right: Spacing.three,
        paddingVertical: Spacing.half,
        paddingHorizontal: Spacing.two,
        borderRadius: Radii.sm,
        backgroundColor: Brand.ink,
        transform: [{ rotate: '6deg' }]
    },
    firstTagText: {
        fontSize: FontSizes.sm,
        fontWeight: 900,
        color: Brand.lemon
    },
    // Tucked up under the band's bottom edge.
    tickets: {
        flexShrink: 0,
        flexDirection: 'row',
        gap: Spacing.three,
        marginTop: -Spacing.three,
        paddingHorizontal: Spacing.three
    },
    ticket: {
        flex: 1,
        minWidth: 0,
        gap: Spacing.two,
        padding: Spacing.three,
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        ...theme.shadows.hard
    },
    ticketLeft: {
        transform: [{ rotate: '-1deg' }]
    },
    ticketRight: {
        transform: [{ rotate: '1deg' }]
    },
    ticketSpacer: {
        flex: 1
    },
    ticketTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    // The tickets are pale in both schemes, so their text is ink in both.
    ticketPlace: {
        fontSize: FontSizes.xxl,
        lineHeight: FontSizes.xxl,
        fontWeight: 900,
        color: Brand.ink
    },
    ticketName: {
        fontSize: FontSizes.lg,
        fontWeight: 900,
        color: Brand.ink
    },
    ticketScore: {
        fontSize: FontSizes.md,
        fontWeight: 900,
        color: Brand.ink
    },
    scroller: {
        flex: 1
    },
    // Room on the right and bottom for the you row's hard shadow.
    content: {
        gap: Spacing.one,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.two + ShadowReach.hard
    },
    listTitle: {
        paddingHorizontal: Spacing.two,
        paddingBottom: Spacing.one,
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary
    },
    line: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.one,
        paddingLeft: Spacing.two,
        paddingRight: Spacing.three,
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },
    lineYou: {
        marginVertical: Spacing.one,
        borderColor: theme.colors.focus,
        ...hardShadow(ShadowReach.hard, theme.colors.focus)
    },
    badge: {
        width: PLACE_WIDTH,
        height: PLACE_WIDTH,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink
    },
    badgeText: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: Brand.ink
    },
    linePlace: {
        width: PLACE_WIDTH,
        flexShrink: 0,
        textAlign: 'center',
        fontSize: FontSizes.sm,
        fontWeight: 900,
        color: theme.colors.textSecondary
    },
    linePlaceYou: {
        color: theme.colors.text
    },
    lineMiddle: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    lineName: {
        flexShrink: 1,
        fontSize: FontSizes.md,
        fontWeight: 700,
        color: theme.colors.text
    },
    lineNameYou: {
        fontWeight: 900
    },
    youChip: {
        flexShrink: 0,
        paddingHorizontal: Spacing.two,
        borderRadius: Radii.full,
        backgroundColor: theme.colors.focus
    },
    // Focus is cobalt in light and lemon in dark, so what it carries flips with it.
    youChipText: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent
    },
    lineStars: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.textSecondary
    },
    lineScore: {
        minWidth: SCORE_WIDTH,
        textAlign: 'right',
        fontSize: FontSizes.md,
        fontWeight: 900,
        color: theme.colors.text
    },
    avatar: {
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink
    },
    avatarRow: {
        borderColor: theme.colors.border
    },
    initial: {
        fontWeight: 900
    },
    footer: {
        flexShrink: 0,
        gap: Spacing.two,
        paddingTop: Spacing.two,
        paddingBottom: Spacing.four
    },
    error: {
        fontSize: FontSizes.sm,
        fontWeight: 700,
        color: theme.colors.destructiveText
    },
    waiting: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.three,
        minHeight: WAITING_HEIGHT,
        paddingHorizontal: Spacing.three,
        borderRadius: Radii.md,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.textSecondary
    },
    dots: {
        flexDirection: 'row',
        flexShrink: 0,
        gap: Spacing.one
    },
    dot: {
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: Radii.full,
        backgroundColor: theme.colors.text
    },
    dotMid: {
        opacity: 0.45
    },
    dotFar: {
        opacity: 0.2
    },
    waitingText: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.sm,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    waitingStay: {
        fontWeight: 900,
        color: theme.colors.text
    }
}))
