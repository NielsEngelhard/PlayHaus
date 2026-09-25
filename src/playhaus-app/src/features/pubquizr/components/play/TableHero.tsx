import AppText from "@/components/text/AppText";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Brand, FontSizes, Spacing, withAlpha } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import type { Seat } from "@/features/pubquizr/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

const TALLY_AVATAR = 18;

interface Props {
    answering: Seat
    // The finale's two players, whose stars and points ride under the spotlight; null in every other round.
    finalists?: [Seat, Seat] | null
    number: number
    quizmaster: Seat
    // Unread since round 1 stopped alternating.
    round?: number
    total: number
    worth: number
    // Whether `worth` is counted in finale stars rather than points.
    stars?: boolean
}

// The hot seat board's part of the header band: who reads, how far into the round, and the one question put to the whole table.
export default function TableHero({ answering, finalists = null, number, quizmaster, stars = false, total, worth }: Props) {
    const t = useT();
    const styles = useStyles();

    const scoring = worth > 0;

    return (
        <View style={styles.hero}>
            <View style={styles.header}>
                <SeatAvatar seat={quizmaster} size={22} />

                <AppText style={styles.headerLabel} numberOfLines={1}>
                    {t('pubquizr.play.turn.quizmasterLabel', { name: quizmaster.name })}
                </AppText>

                <AppText
                    style={styles.count}
                    accessibilityLabel={
                        t('pubquizr.play.questionNumber', { number })
                        + t('pubquizr.play.questionTotal', { total })
                    }
                >
                    {number}
                    <AppText style={styles.countTotal}>
                        {t('pubquizr.play.questionOutOf', { total })}
                    </AppText>
                </AppText>
            </View>

            <View
                style={styles.pips}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
            >
                {Array.from({ length: total }, (_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.pip,
                            index < number && styles.pipDone
                        ]}
                    />
                ))}
            </View>

            <View style={styles.spotlight} accessibilityRole="header">
                <View style={styles.tile}>
                    <Feather name="users" size={19} color={Brand.ink} />
                </View>

                <View style={styles.spotlightBody}>
                    <AppText style={styles.kicker} numberOfLines={1}>
                        {t('pubquizr.play.tableRound')}
                    </AppText>

                    <AppText style={styles.title} numberOfLines={1}>
                        {t('pubquizr.play.whoGotIt', { name: answering.name })}
                    </AppText>
                </View>

                <View style={[styles.badge, scoring && styles.badgeScoring]}>
                    <AppText style={[styles.badgeLabel, scoring && styles.badgeLabelScoring]}>
                        {scoring
                            ? t(stars ? 'pubquizr.play.worthStars' : 'pubquizr.play.worthPoints', { worth })
                            : t('pubquizr.play.noPoint')}
                    </AppText>
                </View>
            </View>

            {finalists !== null && finalists.every(seat => seat.stars !== undefined) && (
                <View style={styles.tallies}>
                    {finalists.map(seat => (
                        <View key={seat.seat} style={styles.tally}>
                            <SeatAvatar seat={seat} size={TALLY_AVATAR} />

                            <AppText style={styles.tallyText} numberOfLines={1}>
                                {t('pubquizr.play.final.tally', { stars: seat.stars ?? 0, score: seat.score })}
                            </AppText>
                        </View>
                    ))}
                </View>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    hero: {
        gap: 9
    },

    tallies: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing.three
    },

    tally: {
        flexShrink: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one
    },

    // Paper on the cobalt band in both schemes, like the header above it.
    tallyText: {
        flexShrink: 1,
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: Brand.textOnAccent
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },

    // Paper on the cobalt band in both schemes.
    headerLabel: {
        flex: 1,
        minWidth: 0,
        fontSize: 12,
        fontWeight: 800,
        color: Brand.textOnAccent
    },

    count: {
        flexShrink: 0,
        fontSize: 11.5,
        fontWeight: 900,
        color: Brand.textOnAccent
    },

    countTotal: {
        color: withAlpha(Brand.textOnAccent, 0.75)
    },

    pips: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        height: 9
    },

    pip: {
        flex: 1,
        height: 5,
        borderRadius: 999,
        backgroundColor: withAlpha(Brand.textOnAccent, 0.35)
    },

    pipDone: {
        backgroundColor: Brand.textOnAccent
    },

    spotlight: {
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 7,
        paddingHorizontal: 11,
        borderRadius: 16,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hard
    },

    tile: {
        width: 36,
        height: 36,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },

    spotlightBody: {
        flex: 1,
        minWidth: 0
    },

    // The design's cobalt, which is the scheme's `focus` and stays legible on the dark paper.
    kicker: {
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.focus
    },

    title: {
        marginTop: 1,
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    badge: {
        flexShrink: 0,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundElement
    },

    badgeScoring: {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.mint
    },

    badgeLabel: {
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.textMuted
    },

    // Ink on mint in both schemes, because the fill is mint in both.
    badgeLabelScoring: {
        color: Brand.ink
    }
}))
