import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import Confetti from "@/components/ui/Confetti";
import InGameHeader from "@/components/ui/InGameHeader";
import SeatAvatar from "@/components/ui/SeatAvatar";
import TextButton from "@/components/ui/TextButton";
import { Brand, FontSizes, Gradients, linearGradient, Radii, ShadowReach, Spacing, withAlpha, type Accent } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { OneOfUsRole, withCivilians } from "@/features/one-of-us/models";
import { faceOf } from "@/features/one-of-us/roles";
import type { Seat } from "@/features/table/seats";
import { AccentProvider } from "@/features/theme/AccentContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { ScrollView, View } from "react-native";

const AVATAR = 40;
const TILE_WIDTH = 54;
const MARK = 18;
const MARK_ICON = 10;
const VOTED_OUT_OPACITY = 0.55;

const CIVILIANS_WIN: Accent = { color: Brand.mint, gradient: Gradients.mint, ink: 'ink' };
const IMPOSTERS_WIN: Accent = { color: Brand.primary, gradient: Gradients.primary, ink: 'ink' };

/** One player as this screen needs them: who they were, and whether they made it. */
export interface FinalPlayer {
    seat: Seat
    role: OneOfUsRole
    votedOut: boolean
}

interface Props {
    civiliansWon: boolean
    players: FinalPlayer[]
    /** The civilians' word, and the one the imposters were bluffing around. */
    word: string
    imposterWord: string
    /** Null when this player cannot open another game, which is every guest in a multi-device room. */
    onAgain: (() => void) | null
    onLeave: () => void
}

// How it ended, and who everybody was.
export default function GameOverScreen({
    civiliansWon,
    players,
    word,
    imposterWord,
    onAgain,
    onLeave
}: Props) {
    const t = useT();
    const styles = useStyles();

    const civilians = players.filter(player => withCivilians(player.role));
    const others = players.filter(player => !withCivilians(player.role));

    return (
        <View style={styles.screen}>
            {/* The band wears the winning side's colour, so the result reads from across the table. */}
            <AccentProvider accent={civiliansWon ? CIVILIANS_WIN : IMPOSTERS_WIN}>
                <InGameHeader
                    onClose={onLeave}
                    closeLabel={t('oneOfUs.play.close')}
                    label={t('oneOfUs.play.over.label')}
                    title={civiliansWon ? t('oneOfUs.play.over.civilians') : t('oneOfUs.play.over.imposters')}
                    subtitle={civiliansWon ? t('oneOfUs.play.over.civiliansWhy') : t('oneOfUs.play.over.impostersWhy')}
                />
            </AccentProvider>

            {/* Both sides get it. */}
            <Confetti active />

            <ScrollView
                style={styles.scroller}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.words}>
                    <View style={[styles.wordHalf, styles.civilianHalf]}>
                        <View style={styles.wordHead}>
                            <RoleMark role={OneOfUsRole.Civilian} />
                            <AppText style={styles.wordLabel}>{t('oneOfUs.play.over.civiliansCamp')}</AppText>
                        </View>
                        <AppText style={styles.wordText}>{word}</AppText>
                    </View>

                    <View style={[styles.wordHalf, styles.imposterHalf]}>
                        <View style={styles.wordHead}>
                            <RoleMark role={OneOfUsRole.Imposter} />
                            <AppText style={[styles.wordLabel, styles.onVioletMuted]}>
                                {t('oneOfUs.play.over.imposterWordLabel')}
                            </AppText>
                        </View>
                        <AppText style={[styles.wordText, styles.onViolet]}>{imposterWord}</AppText>
                    </View>
                </View>

                <AppText style={styles.sectionTitle}>{t('oneOfUs.play.over.rolesTitle')}</AppText>

                <Camp
                    title={t('oneOfUs.play.over.civiliansCamp')}
                    players={civilians}
                    winner={civiliansWon}
                    tint={Brand.mint}
                />

                <Camp
                    title={t('oneOfUs.play.over.impostersCamp')}
                    players={others}
                    winner={!civiliansWon}
                    tint={Brand.primary}
                />
            </ScrollView>

            <View style={styles.footer}>
                {onAgain !== null && (
                    <ActionButton
                        size="large"
                        icon="refresh-cw"
                        text={t('oneOfUs.play.over.again')}
                        onPress={onAgain}
                    />
                )}

                <TextButton
                    text={t('common.backToGames')}
                    variant="muted"
                    onPress={onLeave}
                />
            </View>
        </View>
    )
}

function RoleMark({ role }: { role: OneOfUsRole }) {
    const styles = useStyles();
    const face = faceOf(role);

    return (
        <View style={[styles.mark, { backgroundColor: face.fill }]}>
            <Feather name={face.icon} size={MARK_ICON} color={Brand.ink} />
        </View>
    )
}

interface CampProps {
    title: string
    players: FinalPlayer[]
    winner: boolean
    tint: string
}

function Camp({ title, players, winner, tint }: CampProps) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    // Softer on the dark canvas, where the same strength glares.
    const strength = theme.scheme === 'dark' ? 0.14 : tint === Brand.mint ? 0.35 : 0.22;

    return (
        <View style={[styles.camp, winner && { backgroundColor: withAlpha(tint, strength) }]}>
            <View style={styles.campHead}>
                <AppText style={styles.campTitle}>{title}</AppText>

                {winner && (
                    <View style={styles.winnerPill}>
                        <AppText style={styles.winnerText}>{t('oneOfUs.play.over.winner')}</AppText>
                    </View>
                )}

                <View style={styles.spacer} />

                <AppText style={styles.campCount}>{players.length}</AppText>
            </View>

            <View style={styles.tiles}>
                {players.map(player => <PlayerTile key={player.seat.seat} player={player} />)}
            </View>
        </View>
    )
}

function PlayerTile({ player: { seat, role, votedOut } }: { player: FinalPlayer }) {
    const styles = useStyles();

    return (
        <View style={styles.tile}>
            <View>
                <SeatAvatar seat={seat} size={AVATAR} style={votedOut ? styles.votedOut : undefined} />

                {role === OneOfUsRole.Nitwit && (
                    <View style={styles.nitwitMark}>
                        <RoleMark role={OneOfUsRole.Nitwit} />
                    </View>
                )}
            </View>

            <AppText style={styles.tileName} numberOfLines={1}>{seat.name}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // The gutters are this screen's own.
    screen: {
        flex: 1,
        width: '100%',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four
    },

    scroller: {
        flex: 1
    },

    content: {
        paddingTop: Spacing.three,
        paddingRight: ShadowReach.hard,
        paddingBottom: Spacing.three,
        gap: Spacing.two
    },

    sectionTitle: {
        marginTop: Spacing.two,
        fontSize: FontSizes.xs,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.6,
        color: theme.colors.textMuted
    },

    words: {
        flexDirection: 'row',
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        overflow: 'hidden'
    },

    wordHalf: {
        flex: 1,
        padding: Spacing.two,
        paddingBottom: Spacing.three
    },

    civilianHalf: {
        borderRightWidth: theme.borderWidth,
        borderRightColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },

    // Violet rather than orange, so the imposter's word stays readable.
    imposterHalf: {
        ...linearGradient(Gradients.violet)
    },

    wordHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one
    },

    wordLabel: {
        flexShrink: 1,
        fontSize: FontSizes.xs,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: theme.colors.textSecondary
    },

    wordText: {
        marginTop: Spacing.two,
        fontSize: FontSizes.xl,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: theme.colors.text
    },

    // The violet half is the same in both schemes, so its ink is fixed too.
    onViolet: {
        color: Brand.ink
    },

    onVioletMuted: {
        color: withAlpha(Brand.ink, 0.7)
    },

    mark: {
        width: MARK,
        height: MARK,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.sm,
        borderWidth: 1.5,
        borderColor: Brand.ink
    },

    camp: {
        gap: Spacing.two,
        padding: Spacing.two,
        borderRadius: Radii.lg,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },

    campHead: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },

    campTitle: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: theme.colors.text
    },

    winnerPill: {
        paddingHorizontal: Spacing.two,
        borderRadius: Radii.full,
        backgroundColor: theme.colors.text
    },

    winnerText: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.background
    },

    spacer: {
        flex: 1
    },

    campCount: {
        fontSize: FontSizes.xs,
        fontWeight: 800,
        color: theme.colors.textMuted
    },

    tiles: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: Spacing.two,
        columnGap: Spacing.one
    },

    tile: {
        width: TILE_WIDTH,
        alignItems: 'center',
        gap: Spacing.one
    },

    votedOut: {
        opacity: VOTED_OUT_OPACITY
    },

    nitwitMark: {
        position: 'absolute',
        right: -Spacing.one,
        bottom: -Spacing.one
    },

    tileName: {
        maxWidth: TILE_WIDTH,
        fontSize: FontSizes.xs,
        fontWeight: 800,
        color: theme.colors.text
    },

    footer: {
        paddingTop: Spacing.three,
        gap: Spacing.two
    }
}))
