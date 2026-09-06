import AppText from "@/components/text/AppText";
import { ROUTES } from "@/constants/routes";
import { Brand, hardShadow } from "@/constants/theme";
import { usePhrase, useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";
import { initialsFor, publishedAtPhrase, swatchFor } from "../quiz-shelf";
import { useQuizzes } from "../useQuizzes";

/**
 * The one quiz the picker answers with instead of asking about.
 *
 * Nine times in ten the pick is the newest unplayed weekly quiz, so that is what this
 * shows — played already or not — rather than making everyone scan the shelf below it to
 * find the same answer themselves.
 */
export default function NewQuizCard() {
    const t = useT();
    const styles = useStyles();
    const phrase = usePhrase();

    const quizzes = useQuizzes('weekly');

    // Bonus furniture, not load-bearing: a stalled or empty weekly shelf means there is
    // nothing honest to feature here, so this renders nothing rather than its own
    // spinner or error state — `QuizList` below is already saying that.
    if (quizzes.status !== 'ready' || quizzes.items.length === 0) return null;

    const quiz = quizzes.items.find(item => item.played !== true) ?? quizzes.items[0];

    const swatch = swatchFor(quiz);
    const published = publishedAtPhrase(quiz.publishedAt);

    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                <View style={styles.badge}>
                    <AppText style={styles.badgeText}>
                        {t('pubquizr.index.newQuiz.badge')}
                    </AppText>
                </View>

                <View style={styles.spacer} />

                {published !== null && (
                    <View style={styles.published}>
                        <Feather name="clock" size={11} color={Brand.textOnAccent} style={styles.publishedIcon} />

                        <AppText style={styles.publishedText}>
                            {phrase(published)}
                        </AppText>
                    </View>
                )}
            </View>

            <View style={styles.middle}>
                <View style={[styles.swatch, { backgroundColor: swatch.color }]}>
                    <AppText style={[styles.swatchInitials, { color: swatch.foreground }]}>
                        {initialsFor(quiz.title)}
                    </AppText>
                </View>

                <View style={styles.body}>
                    <AppText style={styles.title} numberOfLines={2}>
                        {quiz.title}
                    </AppText>

                    {quiz.description !== '' && (
                        <AppText style={styles.description} numberOfLines={2}>
                            {quiz.description}
                        </AppText>
                    )}
                </View>
            </View>

            <Link
                href={{
                    pathname: ROUTES.quizzerOneDeviceGameSettings,
                    params: { quizId: quiz.id }
                }}
                asChild
            >
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('pubquizr.index.newQuiz.play')}
                    style={styles.play}
                >
                    <AppText style={styles.playText}>
                        {t('pubquizr.index.newQuiz.play')}
                    </AppText>

                    <Feather name="arrow-right" size={17} color={Brand.secondary} />
                </Pressable>
            </Link>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    // A poster rather than a themed surface, the way `WeeklyStamp` is: the card is
    // always this blue, at midnight too, so its ink and paper come from `Brand` rather
    // than from `theme.colors`, which would flip them with the scheme.
    card: {
        borderRadius: 26,
        borderWidth: 2,
        borderColor: Brand.ink,
        backgroundColor: Brand.secondary,
        padding: 16,
        gap: 14,
        ...hardShadow(4, Brand.ink)
    },

    topRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },

    spacer: {
        flex: 1
    },

    badge: {
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: Brand.lemon
    },

    badgeText: {
        fontSize: 10,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: Brand.ink
    },

    published: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },

    publishedIcon: {
        opacity: 0.75
    },

    publishedText: {
        fontSize: 10.5,
        fontWeight: 700,
        color: Brand.textOnAccent,
        opacity: 0.8
    },

    middle: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14
    },

    swatch: {
        width: 56,
        height: 56,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Brand.ink,
        ...hardShadow(3, Brand.ink)
    },

    swatchInitials: {
        fontSize: 16,
        fontWeight: 900
    },

    body: {
        flex: 1,
        minWidth: 0
    },

    title: {
        fontSize: 24,
        fontWeight: 900,
        letterSpacing: -0.9,
        color: Brand.textOnAccent
    },

    description: {
        marginTop: 6,
        fontSize: 12.5,
        lineHeight: 12.5 * 1.4,
        fontWeight: 700,
        color: Brand.textOnAccent,
        opacity: 0.82
    },

    play: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 50,
        borderRadius: 999,
        backgroundColor: Brand.textOnAccent
    },

    playText: {
        fontSize: 15,
        fontWeight: 900,
        color: Brand.ink
    }
}));
