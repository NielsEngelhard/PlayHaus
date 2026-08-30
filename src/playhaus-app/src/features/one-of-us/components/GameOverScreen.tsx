import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import Confetti from "@/components/ui/Confetti";
import SeatAvatar from "@/components/ui/SeatAvatar";
import TextButton from "@/components/ui/TextButton";
import { Brand, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { OneOfUsRole } from "@/features/one-of-us/models";
import type { Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { ScrollView, View } from "react-native";

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
    onAgain: () => void
    onLeave: () => void
}

/**
 * How it ended, and who everybody was.
 *
 * The whole table is revealed at once rather than a winner announced. The question the
 * game has been asking for the last ten minutes is "which of you was lying", and a
 * screen that answered only "the civilians won" would leave the one thing everybody
 * actually wants unsaid — including for the players who went out in round one and have
 * been watching ever since.
 *
 * Both words are shown together for the same reason. Half the fun afterwards is
 * realising how close the two were, and neither half means much on its own.
 */
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

    return (
        <View style={styles.screen}>
            {/* Both sides get it. The imposters winning is just as much a result as
                the civilians winning, and a celebration that only fired one way would
                be the app taking a side. */}
            <Confetti active />

            <ScrollView
                style={styles.scroller}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <AppText style={styles.title}>
                    {civiliansWon
                        ? t('oneOfUs.play.over.civilians')
                        : t('oneOfUs.play.over.imposters')}
                </AppText>

                <AppText style={styles.why}>
                    {civiliansWon
                        ? t('oneOfUs.play.over.civiliansWhy')
                        : t('oneOfUs.play.over.impostersWhy')}
                </AppText>

                <View style={styles.words}>
                    <View style={styles.word}>
                        <AppText style={styles.wordLabel}>
                            {t('oneOfUs.play.over.civilianWord')}
                        </AppText>
                        <AppText style={styles.wordText}>{word}</AppText>
                    </View>

                    <View style={[styles.word, styles.imposterWord]}>
                        <AppText style={styles.wordLabel}>
                            {t('oneOfUs.play.over.imposterWord')}
                        </AppText>
                        <AppText style={styles.wordText}>{imposterWord}</AppText>
                    </View>
                </View>

                <AppText style={styles.rolesTitle}>
                    {t('oneOfUs.play.over.rolesTitle')}
                </AppText>

                <View style={styles.list}>
                    {players.map(({ seat, role, votedOut }) => {
                        const imposter = role === OneOfUsRole.Imposter;

                        return (
                            <View
                                key={seat.seat}
                                style={[styles.row, imposter && styles.imposterRow]}
                            >
                                <SeatAvatar seat={seat} size={36} />

                                <View style={styles.who}>
                                    <AppText
                                        style={[styles.name, imposter && styles.onPrimary]}
                                        numberOfLines={1}
                                    >
                                        {seat.name}
                                    </AppText>

                                    {votedOut && (
                                        <AppText
                                            style={[styles.fate, imposter && styles.onPrimaryMuted]}
                                        >
                                            {t('oneOfUs.play.over.votedOut')}
                                        </AppText>
                                    )}
                                </View>

                                <AppText style={[styles.tag, imposter && styles.onPrimary]}>
                                    {imposter
                                        ? t('oneOfUs.play.over.imposterTag')
                                        : t('oneOfUs.play.over.civilianTag')}
                                </AppText>
                            </View>
                        )
                    })}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <ActionButton
                    size="large"
                    icon="refresh-cw"
                    text={t('oneOfUs.play.over.again')}
                    onPress={onAgain}
                />

                <TextButton
                    text={t('common.backToGames')}
                    variant="muted"
                    onPress={onLeave}
                />
            </View>
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
        paddingTop: Spacing.four,
        paddingBottom: Spacing.three
    },

    title: {
        fontSize: 38,
        fontWeight: 900,
        lineHeight: 38 * 1.03,
        letterSpacing: -1.5,
        color: theme.colors.text
    },

    why: {
        marginTop: 10,
        fontSize: 15,
        fontWeight: 600,
        lineHeight: 15 * 1.5,
        color: theme.colors.textSecondary
    },

    words: {
        marginTop: Spacing.four,
        gap: 8
    },

    word: {
        padding: 14,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },

    // The imposters' half in the game's own orange, so the pair reads as two sides
    // rather than as one list of two facts.
    imposterWord: {
        borderColor: Brand.ink,
        backgroundColor: Brand.primary
    },

    wordLabel: {
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.textMuted
    },

    wordText: {
        marginTop: 5,
        fontSize: 19,
        fontWeight: 900,
        lineHeight: 19 * 1.25,
        letterSpacing: -0.5,
        color: theme.colors.text
    },

    rolesTitle: {
        marginTop: Spacing.four,
        fontSize: 11,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted
    },

    list: {
        marginTop: 10,
        gap: 8
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    imposterRow: {
        borderColor: Brand.ink,
        backgroundColor: Brand.primary
    },

    who: {
        flex: 1,
        minWidth: 0
    },

    name: {
        fontSize: 15.5,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    fate: {
        marginTop: 1,
        fontSize: 11,
        fontWeight: 700,
        color: theme.colors.textMuted
    },

    tag: {
        flexShrink: 0,
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: theme.colors.textMuted
    },

    // The imposter rows are orange in both schemes, so their ink has to be fixed too.
    onPrimary: {
        color: Brand.ink
    },

    onPrimaryMuted: {
        color: 'rgba(15, 13, 18, 0.6)'
    },

    footer: {
        paddingTop: Spacing.three,
        gap: Spacing.two
    }
}))
