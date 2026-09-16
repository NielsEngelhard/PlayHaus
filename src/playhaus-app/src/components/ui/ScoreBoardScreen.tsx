import AccentBand from "@/components/layout/AccentBand";
import GameMark from "@/components/layout/GameMark";
import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import AnimatedPressable from "@/components/ui/AnimatedPressable";
import { usePressPop } from "@/components/ui/usePressPop";
import { accentOf, type Game } from "@/constants/games";
import { accentInkColor, Brand, FontSizes, Radii, ShadowReach, Spacing, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { TranslationKey } from "@/features/i18n/keys";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { AvatarColor } from "@/utils/color-utils";
import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ScrollView, View } from "react-native";

// One finisher, in whatever ids the game deals in.
export interface ScoreBoardPlayer {
    id: string,
    name: string,
    score: number,
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
    // Whose screen this is, so the headline and one name can say `you`.
    youId?: string
}

type PodiumPlace = 1 | 2 | 3;

interface Placed {
    place: number,
    player: ScoreBoardPlayer
}

const PODIUM_SIZE = 3;

const TIERS: Record<PodiumPlace, { barHeight: number, fill: string, label: TranslationKey, scoreSize: number }> = {
    1: { barHeight: 84, fill: Brand.lemon, label: 'scoreboard.places.first', scoreSize: FontSizes.xxl },
    2: { barHeight: 66, fill: Brand.silver, label: 'scoreboard.places.second', scoreSize: FontSizes.xl },
    3: { barHeight: 52, fill: Brand.bronze, label: 'scoreboard.places.third', scoreSize: FontSizes.lg }
};

type AvatarKind = 'winner' | 'podium' | 'row';

const AVATARS: Record<AvatarKind, { initialSize: number, size: number }> = {
    winner: { initialSize: FontSizes.lg, size: 54 },
    podium: { initialSize: FontSizes.md, size: 44 },
    row: { initialSize: FontSizes.xs, size: 26 }
};

const CLOSE_SIZE = 30;
const CLOSE_GLYPH = 15;
const TROPHY_SIZE = 24;
const TROPHY_GLYPH = 13;
const PLACE_WIDTH = 22;
const DOT_SIZE = 7;
const WAITING_HEIGHT = 58;
// The lighter outline the small avatars and the list's dividers wear.
const HAIRLINE = 1.5;

// Tied scores share a place, so two players on the top score are both first.
function rank(players: ScoreBoardPlayer[]): Placed[] {
    const sorted = [...players].sort((a, b) => b.score - a.score);

    return sorted.map(player => ({
        place: 1 + sorted.filter(other => other.score > player.score).length,
        player
    }));
}

function initialOf(name: string): string {
    return [...name.trim()][0]?.toUpperCase() ?? '?';
}

// How a game ends for everybody at the table: a podium for the top three, a list for the rest.
export default function ScoreBoardScreen({ action, error, game, onClose, players, totalRounds, waitingForHost = false, youId }: Props) {
    const styles = useStyles();
    const t = useT();
    const closePop = usePressPop();

    const accent = accentOf(game);
    const ink = accentInkColor(accent.ink);

    const ranked = rank(players);
    // Second on the left and third on the right of the winner, the way a podium stands.
    const podium = [ranked[1], ranked[0], ranked[2]].filter((entry): entry is Placed => entry !== undefined);

    const [best, runnerUp] = ranked;
    const drawn = best !== undefined && runnerUp !== undefined && runnerUp.player.score === best.player.score;

    const headline = best === undefined
        ? undefined
        : drawn
            ? t('scoreboard.tie', { score: best.player.score })
            : best.player.id === youId
                ? t('scoreboard.youWin', { score: best.player.score })
                : t('scoreboard.playerWins', { name: best.player.name, score: best.player.score });

    return (
        <View style={styles.screen}>
            <AccentBand gradient={accent.gradient} underHeader={false} style={styles.band}>
                <View style={styles.row}>
                    {game.icon !== undefined && <GameMark icon={game.icon} label={game.name} />}

                    <View style={styles.heading}>
                        <AppText style={[styles.eyebrow, { color: withAlpha(ink, 0.6) }]} numberOfLines={1}>
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
                        style={[styles.close, { backgroundColor: withAlpha(ink, 0.16) }, closePop.animatedStyle]}
                    >
                        <Feather name="x" size={CLOSE_GLYPH} color={ink} />
                    </AnimatedPressable>
                </View>

                {headline !== undefined && (
                    <AppText accessibilityRole="header" style={[styles.headline, { color: ink }]}>
                        {headline}
                    </AppText>
                )}

                {podium.length > 0 && (
                    <View style={styles.podium}>
                        {podium.map(entry => (
                            <PodiumColumn
                                key={entry.player.id}
                                entry={entry}
                                ink={ink}
                                you={entry.player.id === youId}
                            />
                        ))}
                    </View>
                )}
            </AccentBand>

            <ScrollView
                style={styles.scroller}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {ranked.length > 0 && (
                    <View style={styles.list}>
                        {ranked.map((entry, index) => (
                            <View key={entry.player.id} style={[styles.line, index > 0 && styles.divided]}>
                                <AppText style={styles.linePlace}>{entry.place}</AppText>

                                <Avatar kind="row" player={entry.player} />

                                <AppText style={styles.lineName} numberOfLines={1}>
                                    {entry.player.id === youId ? t('common.you') : entry.player.name}
                                </AppText>

                                <AppText style={styles.lineScore}>{entry.player.score}</AppText>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

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

interface PodiumColumnProps {
    entry: Placed,
    ink: string,
    you: boolean
}

function PodiumColumn({ entry, ink, you }: PodiumColumnProps) {
    const styles = useStyles();
    const t = useT();

    const place = Math.min(entry.place, PODIUM_SIZE) as PodiumPlace;
    const tier = TIERS[place];
    const first = place === 1;

    return (
        <View style={styles.column}>
            <View>
                <Avatar kind={first ? 'winner' : 'podium'} player={entry.player} />

                {first && (
                    <View style={styles.trophy}>
                        <Ionicons name="trophy-outline" size={TROPHY_GLYPH} color={Brand.ink} />
                    </View>
                )}
            </View>

            <AppText style={[styles.podiumName, first && styles.podiumNameFirst, { color: ink }]} numberOfLines={1}>
                {you ? t('common.you') : entry.player.name}
            </AppText>

            <View style={[styles.bar, { height: tier.barHeight, backgroundColor: tier.fill }]}>
                <AppText style={[styles.barScore, { fontSize: tier.scoreSize }]}>{entry.player.score}</AppText>
                <AppText style={styles.barPlace}>{t(tier.label)}</AppText>
            </View>
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
                kind === 'row' && styles.avatarSmall,
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
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four
    },
    // No bottom padding: the podium's bars stand on the band's bottom edge.
    band: {
        paddingTop: Spacing.three,
        paddingBottom: 0,
        gap: Spacing.two
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
        letterSpacing: 1.4,
        textTransform: 'uppercase'
    },
    subtitle: {
        fontSize: FontSizes.md,
        fontWeight: 900,
        letterSpacing: -0.4
    },
    close: {
        width: CLOSE_SIZE,
        height: CLOSE_SIZE,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full
    },
    headline: {
        fontSize: FontSizes.xl,
        lineHeight: FontSizes.xl * 1.05,
        fontWeight: 900,
        letterSpacing: -1
    },
    podium: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: Spacing.two,
        marginTop: Spacing.half
    },
    // Capped at a third, so a table of one or two still stands at podium width.
    column: {
        flex: 1,
        maxWidth: '33%',
        alignItems: 'center',
        gap: Spacing.two
    },
    avatar: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink
    },
    avatarSmall: {
        borderWidth: HAIRLINE
    },
    initial: {
        fontWeight: 900
    },
    trophy: {
        position: 'absolute',
        top: -Spacing.two,
        right: -Spacing.two,
        width: TROPHY_SIZE,
        height: TROPHY_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },
    podiumName: {
        maxWidth: '100%',
        fontSize: FontSizes.xs,
        fontWeight: 900
    },
    podiumNameFirst: {
        fontSize: FontSizes.sm
    },
    // Open at the bottom, where the band's own edge closes it.
    bar: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        borderTopLeftRadius: Radii.md,
        borderTopRightRadius: Radii.md,
        borderWidth: theme.borderWidth,
        borderBottomWidth: 0,
        borderColor: theme.colors.border
    },
    // The bars are pale in both schemes, so their text is ink in both.
    barScore: {
        fontWeight: 900,
        letterSpacing: -0.6,
        color: Brand.ink
    },
    barPlace: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 1,
        color: withAlpha(Brand.ink, 0.6)
    },
    scroller: {
        flex: 1
    },
    // Room on the right and bottom for the card's hard shadow.
    content: {
        paddingTop: Spacing.three,
        paddingRight: ShadowReach.hard,
        paddingBottom: ShadowReach.hard
    },
    list: {
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },
    line: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        paddingVertical: Spacing.two,
        paddingHorizontal: Spacing.three
    },
    divided: {
        borderTopWidth: HAIRLINE,
        borderTopColor: theme.colors.borderSubtle
    },
    linePlace: {
        width: PLACE_WIDTH,
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.textMuted
    },
    lineName: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.sm,
        fontWeight: 700,
        color: theme.colors.text
    },
    lineScore: {
        fontSize: FontSizes.md,
        fontWeight: 900,
        color: theme.colors.text
    },
    footer: {
        paddingTop: Spacing.three,
        gap: Spacing.two
    },
    error: {
        fontSize: FontSizes.sm,
        fontWeight: 700,
        color: theme.colors.destructiveText
    },
    waiting: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two,
        minHeight: WAITING_HEIGHT,
        paddingHorizontal: Spacing.three,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },
    dots: {
        flexDirection: 'row',
        flexShrink: 0,
        gap: Spacing.half
    },
    dot: {
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: Radii.full,
        backgroundColor: theme.colors.text
    },
    dotMid: {
        opacity: 0.35
    },
    dotFar: {
        opacity: 0.18
    },
    waitingText: {
        flex: 1,
        minWidth: 0,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.3,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    waitingStay: {
        fontWeight: 900,
        color: theme.colors.text
    }
}))
