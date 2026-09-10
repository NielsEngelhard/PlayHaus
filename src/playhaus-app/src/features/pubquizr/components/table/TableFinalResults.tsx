import AppText from "@/components/text/AppText";
import Confetti from "@/components/ui/Confetti";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { FinalStanding } from "@/features/pubquizr/round-seven";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    /** The shared screen's type scale -- see `table-scale.ts`. */
    scale: number
    /** Winner first. See `finalStandingsOf`. */
    standings: FinalStanding[]
}

// Where the whole evening ended, on the shared screen. No way out of it: the phones leave by their own button.
export default function TableFinalResults({ scale, standings }: Props) {
    const styles = useStyles();
    const t = useT();

    const top = standings[0];
    // Nobody wins on a tie.
    const leaders = top === undefined ? [] : standings.filter(seat => seat.score === top.score);
    const outright = leaders.length === 1;

    // Everybody the card did not already name.
    const rest = standings.slice(leaders.length);

    return (
        <View style={[styles.stage, { gap: Math.round(16 * scale) }]}>
            <AppText style={[styles.over, { fontSize: Math.round(11 * scale) }]}>
                {t('pubquizr.play.final.title')}
            </AppText>

            {top === undefined ? (
                <AppText style={[styles.empty, { fontSize: Math.round(18 * scale) }]}>
                    {t('pubquizr.play.final.description')}
                </AppText>
            ) : (
                <View
                    style={[
                        styles.card,
                        {
                            gap: Math.round(10 * scale),
                            paddingVertical: Math.round(18 * scale),
                            paddingHorizontal: Math.round(34 * scale)
                        }
                    ]}
                >
                    <View style={[styles.banner, { gap: Math.round(6 * scale) }]}>
                        <Feather name="award" size={Math.round(15 * scale)} color={Brand.ink} />

                        <AppText style={[styles.bannerText, { fontSize: Math.round(11 * scale) }]}>
                            {outright
                                ? t('pubquizr.play.final.winnerLabel')
                                : t('pubquizr.play.final.tieLabel')}
                        </AppText>
                    </View>

                    {/* One portrait where there is a winner, the joint leaders side by side where there is not. */}
                    <View style={[styles.faces, { gap: Math.round(12 * scale) }]}>
                        {leaders.map(seat => (
                            <SeatAvatar
                                key={seat.seat}
                                raised
                                seat={seat}
                                size={Math.round((outright ? 96 : 64) * scale)}
                            />
                        ))}
                    </View>

                    <AppText numberOfLines={2} style={[styles.winner, { fontSize: Math.round(38 * scale) }]}>
                        {outright ? top.name : t('pubquizr.play.final.tieTitle')}
                    </AppText>

                    <AppText style={[styles.points, { fontSize: Math.round(19 * scale) }]}>
                        {t('pubquizr.play.final.points', { score: top.score })}
                    </AppText>

                    {!outright && (
                        <AppText style={[styles.points, { fontSize: Math.round(14 * scale) }]}>
                            {t('pubquizr.play.final.tieDescription')}
                        </AppText>
                    )}
                </View>
            )}

            {rest.length > 0 && (
                <View style={[styles.chips, { gap: Math.round(8 * scale) }]}>
                    {rest.map(seat => {
                        // Only where somebody actually won: on a tie there is no runner-up, just the first seat that finished behind.
                        const runnerUp = outright && seat.place === 2;

                        return (
                            <View
                                key={seat.seat}
                                style={[
                                    styles.chip,
                                    runnerUp && styles.runnerUp,
                                    {
                                        gap: Math.round(8 * scale),
                                        paddingVertical: Math.round(6 * scale),
                                        paddingHorizontal: Math.round(10 * scale)
                                    }
                                ]}
                            >
                                <AppText
                                    style={[
                                        styles.place,
                                        runnerUp && styles.onMint,
                                        { fontSize: Math.round(12 * scale) }
                                    ]}
                                >
                                    {seat.place}
                                </AppText>

                                <SeatAvatar seat={seat} size={Math.round(28 * scale)} />

                                <AppText
                                    numberOfLines={1}
                                    style={[
                                        styles.name,
                                        runnerUp && styles.onMint,
                                        { fontSize: Math.round(15 * scale) }
                                    ]}
                                >
                                    {seat.name}
                                </AppText>

                                {seat.finalist && (
                                    <AppText
                                        style={[
                                            styles.tag,
                                            runnerUp && styles.onMint,
                                            { fontSize: Math.round(9 * scale) }
                                        ]}
                                    >
                                        {t('pubquizr.play.final.finalist')}
                                    </AppText>
                                )}

                                <AppText
                                    style={[
                                        styles.score,
                                        runnerUp && styles.onMint,
                                        { fontSize: Math.round(20 * scale) }
                                    ]}
                                >
                                    {seat.score}
                                </AppText>
                            </View>
                        )
                    })}
                </View>
            )}

            {/* Last, so it falls in front of everything. */}
            <Confetti active />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Fills the frame's middle rather than sizing to its contents, so the shower falls across the whole screen.
    stage: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center'
    },
    over: {
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },
    /** An empty table, in practice. Nothing to celebrate and nobody to name. */
    empty: {
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textSecondary
    },
    card: {
        alignItems: 'center',
        borderRadius: 26,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.lemon,
        ...theme.popShadow(theme.colors.shadow)
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    bannerText: {
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: Brand.ink
    },
    faces: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    winner: {
        fontWeight: 900,
        letterSpacing: -1.2,
        textAlign: 'center',
        color: Brand.ink
    },
    points: {
        fontWeight: 800,
        textAlign: 'center',
        color: Brand.ink
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundSecondary
    },
    // Mint in both schemes, the same "this one" every other second place wears.
    runnerUp: {
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },
    place: {
        fontWeight: 900,
        color: theme.colors.textMuted
    },
    name: {
        fontWeight: 800,
        letterSpacing: -0.2,
        color: theme.colors.text
    },
    tag: {
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },
    score: {
        fontWeight: 900,
        letterSpacing: -0.4,
        color: theme.colors.text
    },
    onMint: {
        color: Brand.ink
    }
}))
