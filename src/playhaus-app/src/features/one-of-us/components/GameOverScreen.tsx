import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import Confetti from "@/components/ui/Confetti";
import InGameHeader from "@/components/ui/InGameHeader";
import SeatAvatar from "@/components/ui/SeatAvatar";
import TextButton from "@/components/ui/TextButton";
import { Brand, ShadowReach, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { OneOfUsRole, withCivilians } from "@/features/one-of-us/models";
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
 *
 * The nitwit is listed on the imposters' side of the room but tagged and coloured as
 * itself: "who was lying" and "who was given nothing at all" are two different answers,
 * and the second one is the one the table will want to hear about afterwards.
 *
 * It wears the same band every other screen in the game does, and no track under it:
 * there is nothing left to be part of the way through. The band's arrow and the muted
 * button in the footer are the same way out, kept in both places because this screen is
 * long enough to scroll and the way out should not be something you have to reach.
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
            <InGameHeader
                onClose={onLeave}
                closeLabel={t('oneOfUs.play.close')}
                label={t('oneOfUs.play.over.label')}
            />

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
                        const lied = !withCivilians(role);
                        const nitwit = role === OneOfUsRole.Nitwit;

                        return (
                            <View
                                key={seat.seat}
                                style={[
                                    styles.row,
                                    lied && styles.imposterRow,
                                    nitwit && styles.nitwitRow
                                ]}
                            >
                                <SeatAvatar seat={seat} size={36} />

                                <View style={styles.who}>
                                    <AppText
                                        style={[styles.name, lied && styles.onPrimary]}
                                        numberOfLines={1}
                                    >
                                        {seat.name}
                                    </AppText>

                                    {votedOut && (
                                        <AppText
                                            style={[styles.fate, lied && styles.onPrimaryMuted]}
                                        >
                                            {t('oneOfUs.play.over.votedOut')}
                                        </AppText>
                                    )}
                                </View>

                                <AppText style={[styles.tag, lied && styles.onPrimary]}>
                                    {nitwit
                                        ? t('oneOfUs.play.over.nitwitTag')
                                        : lied
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
    // The gutters are this screen's own: the page it is drawn on has claimed the app's
    // chrome and hands it the bare window, and the band above reaches back out through
    // them. See `useChromeless`.
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
        paddingTop: Spacing.four,
        paddingRight: ShadowReach.hardSmall,
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

    // Lemon rather than orange, and applied over `imposterRow` so the row keeps the
    // inked border and the inked text that come with being on that side.
    nitwitRow: {
        backgroundColor: Brand.lemon
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
