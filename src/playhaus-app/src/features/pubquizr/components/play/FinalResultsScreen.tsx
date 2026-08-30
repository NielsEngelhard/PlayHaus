import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import Confetti from "@/components/ui/Confetti";
import SeatAvatar from "@/components/ui/SeatAvatar";
import SlideFadeIn from "@/components/ui/SlideFadeIn";
import { Brand, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { FinalStanding } from "@/features/pubquizr/round-six";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { ScrollView, View } from "react-native";

interface Props {
    /** Winner first. See `finalStandingsOf`. */
    standings: FinalStanding[]
    onLeave: () => void
}

/** How long the winner's card takes to land. */
const CARD_MS = 460;
/**
 * When the first of the other places starts, and how far apart they follow.
 *
 * Held until the card is most of the way in, so the table reads the winner before the
 * board underneath starts filling. Short steps after that — eight seats at anything
 * slower is a screen that takes a second and a half to finish arriving.
 */
const ROWS_DELAY_MS = 260;
const ROW_STEP_MS = 60;
const ROW_MS = 340;

/**
 * Where the whole evening ended: the winner, then every other seat and its final place.
 *
 * The one screen this session ends on. `RoundStandings` stands between rounds and is
 * built to be walked past — a breather with a button to the next thing. This has no next
 * thing, so it is deliberately not another scoreboard: the winner comes out of the list
 * and onto a card of their own, at portrait size, and the rest of the table ranks
 * underneath. A board that merely highlighted its top row was the same screen the table
 * had already been shown five times that evening, which is no way to end a night.
 *
 * The most points wins, and every row carries the same number — a finale question pays
 * onto the running score like everything else does, at a hundred a time, so there is one
 * tally and one order to put the table in. The two who played round 6 are tagged rather
 * than ranked apart: it is the story of the evening, not the reason for the order.
 *
 * A shared top score gets a card that says so instead of a winner. `finalStandingsOf`
 * breaks ties on the seat so that the order is stable, but a seat number is not a reason
 * to hand somebody the night, and this is the screen where that would matter most.
 */
export default function FinalResultsScreen({ standings, onLeave }: Props) {
    const t = useT();
    const styles = useStyles();

    const top = standings[0];
    // Nobody wins on a tie. The same test `RoundStandings` makes before it paints its
    // leader row, for the same reason.
    const leaders = top === undefined
        ? []
        : standings.filter(seat => seat.score === top.score);
    const outright = leaders.length === 1;

    // Everybody the card did not already name.
    const rest = standings.slice(leaders.length);

    return (
        <View style={styles.screen}>
            <ScrollView
                style={styles.scroller}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <AppText style={styles.over}>{t('pubquizr.play.final.title')}</AppText>

                {top === undefined ? (
                    <AppText style={styles.empty}>
                        {t('pubquizr.play.final.description')}
                    </AppText>
                ) : (
                    <SlideFadeIn offsetY={18} durationMs={CARD_MS}>
                        <View style={styles.card}>
                            <View style={styles.banner}>
                                <Feather name="award" size={15} color={Brand.ink} />

                                <AppText style={styles.bannerText}>
                                    {outright
                                        ? t('pubquizr.play.final.winnerLabel')
                                        : t('pubquizr.play.final.tieLabel')}
                                </AppText>
                            </View>

                            {/* One portrait where there is a winner, the joint leaders
                                side by side where there is not — the card is about who
                                the night belongs to, and on a tie that is more than one
                                person. */}
                            <View style={styles.faces}>
                                {leaders.map(seat => (
                                    <SeatAvatar
                                        key={seat.seat}
                                        seat={seat}
                                        size={outright ? 104 : 68}
                                        raised
                                    />
                                ))}
                            </View>

                            <AppText style={styles.winnerName} numberOfLines={2}>
                                {outright ? top.name : t('pubquizr.play.final.tieTitle')}
                            </AppText>

                            <AppText style={styles.winnerScore}>
                                {t('pubquizr.play.final.points', { score: top.score })}
                            </AppText>

                            {!outright && (
                                <AppText style={styles.tieLine}>
                                    {t('pubquizr.play.final.tieDescription')}
                                </AppText>
                            )}
                        </View>
                    </SlideFadeIn>
                )}

                {rest.length > 0 && (
                    <>
                        <AppText style={styles.restLabel}>
                            {t('pubquizr.play.final.restLabel')}
                        </AppText>

                        <View style={styles.list}>
                            {rest.map((seat, index) => {
                                // Only where somebody actually won: on a tie there is no
                                // runner-up, just the first seat that finished behind.
                                const runnerUp = outright && seat.place === 2;

                                return (
                                    <SlideFadeIn
                                        key={seat.seat}
                                        offsetY={12}
                                        durationMs={ROW_MS}
                                        delayMs={ROWS_DELAY_MS + index * ROW_STEP_MS}
                                    >
                                        <View style={[styles.row, runnerUp && styles.runnerUp]}>
                                            <AppText
                                                style={[styles.place, runnerUp && styles.onMintMuted]}
                                            >
                                                {seat.place}
                                            </AppText>

                                            <SeatAvatar seat={seat} size={32} />

                                            <View style={styles.who}>
                                                <AppText
                                                    style={[styles.name, runnerUp && styles.onMint]}
                                                    numberOfLines={1}
                                                >
                                                    {seat.name}
                                                </AppText>

                                                {seat.finalist && (
                                                    <AppText
                                                        style={[styles.tag, runnerUp && styles.onMintMuted]}
                                                    >
                                                        {t('pubquizr.play.final.finalist')}
                                                    </AppText>
                                                )}
                                            </View>

                                            <AppText
                                                style={[styles.score, runnerUp && styles.onMint]}
                                            >
                                                {seat.score}
                                            </AppText>
                                        </View>
                                    </SlideFadeIn>
                                )
                            })}
                        </View>
                    </>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <ActionButton
                    size="large"
                    icon="home"
                    text={t('common.backToGames')}
                    onPress={onLeave}
                />
            </View>

            {/* Last, so it falls in front of everything. It takes no room and no touches,
                so the button underneath keeps working while it comes down. */}
            <Confetti active />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%'
    },

    scroller: {
        flex: 1
    },

    content: {
        paddingTop: Spacing.three,
        paddingBottom: Spacing.three
    },

    // The sentence this screen exists to say, at label size rather than as a headline:
    // the card under it is the headline, and two of those would compete.
    over: {
        marginBottom: 10,
        fontSize: 11,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },

    /** An empty table, in practice. Nothing to celebrate and nobody to name. */
    empty: {
        fontSize: 15,
        lineHeight: 15 * 1.5,
        color: theme.colors.textSecondary
    },

    // Lemon and ink, the same "this is the one" every leader row in the app wears —
    // blown up to the size of the moment it is marking.
    card: {
        alignItems: 'center',
        paddingVertical: Spacing.four,
        paddingHorizontal: Spacing.three,
        borderRadius: 26,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.lemon,
        ...theme.shadows.hardLarge
    },

    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },

    bannerText: {
        fontSize: 11,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 2,
        color: Brand.ink
    },

    faces: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: Spacing.three,
        gap: 12
    },

    winnerName: {
        marginTop: Spacing.three,
        fontSize: 32,
        fontWeight: 900,
        lineHeight: 32 * 1.05,
        letterSpacing: -1.2,
        textAlign: 'center',
        color: Brand.ink
    },

    winnerScore: {
        marginTop: 2,
        fontSize: 15,
        fontWeight: 800,
        textAlign: 'center',
        color: 'rgba(15, 13, 18, 0.62)'
    },

    tieLine: {
        marginTop: 10,
        maxWidth: 260,
        fontSize: 13,
        lineHeight: 13 * 1.45,
        textAlign: 'center',
        color: 'rgba(15, 13, 18, 0.62)'
    },

    restLabel: {
        marginTop: Spacing.four,
        marginBottom: 10,
        fontSize: 11,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },

    list: {
        gap: 8
    },

    // Quieter than the rows this screen used to draw: they are the field now rather than
    // the result, and the card above them is what the table is looking at.
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    // The runner-up keeps the mint this game pays finale points in, so the top of the
    // board still reads as the pair who finished the same finale apart.
    runnerUp: {
        backgroundColor: theme.colors.mint,
        borderColor: Brand.ink
    },

    place: {
        width: 16,
        fontSize: 12,
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.textMuted
    },

    // `minWidth: 0` is what lets a long name truncate instead of pushing the score off
    // the end of the row.
    who: {
        flex: 1,
        minWidth: 0
    },

    name: {
        fontSize: 14.5,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    tag: {
        marginTop: 1,
        fontSize: 10.5,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: theme.colors.textMuted
    },

    score: {
        fontSize: 17,
        fontWeight: 900,
        color: theme.colors.text
    },

    // The runner-up's row is mint in both schemes, so its ink has to be too — the dark
    // scheme's own near-white text would disappear into it.
    onMint: {
        color: Brand.ink
    },

    onMintMuted: {
        color: 'rgba(15, 13, 18, 0.6)'
    },

    footer: {
        paddingTop: Spacing.three
    }
}))
