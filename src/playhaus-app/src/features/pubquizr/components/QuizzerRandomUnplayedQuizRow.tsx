import AppText from "@/components/text/AppText";
import { ROUTES } from "@/constants/routes";
import { Brand, hardShadow, Spacing } from "@/constants/theme";
import { useT, useUiLanguage } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Link } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import type { QuizListItem } from "../pubquizr-quizzes";
import { initialsFor, newestQuizId, shuffle, swatchFor } from "../quiz-shelf";
import { useQuizzes } from "../useQuizzes";

const DECK_SIZE = 5;
const CARD_WIDTH = 226;
const CARD_GAP = 12;

// The side padding `Chrome` gives a page, which the deck reaches back out into so it scrolls to the window's edge.
const GUTTER = Spacing.four;

// A hand of quizzes this host has not played yet, dealt at random.
export default function QuizzerRandomUnplayedQuizRow() {
    const styles = useStyles();
    const t = useT();
    const locale = useUiLanguage();

    const quizzes = useQuizzes('all');

    // Dealt once per shelf, not per render: a deck that reshuffles under your thumb is unusable.
    const deck = useMemo(() => {
        if (quizzes.status !== 'ready') return { picks: [], newestId: null };

        const unplayed = quizzes.items.filter(quiz => quiz.played !== true);

        return { picks: shuffle(unplayed).slice(0, DECK_SIZE), newestId: newestQuizId(quizzes.items) };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quizzes.status, locale]);

    if (deck.picks.length === 0) return null;

    return (
        <View style={styles.section}>
            <AppText style={styles.heading}>
                {t('pubquizr.index.pickOne')}
            </AppText>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + CARD_GAP}
                decelerationRate="fast"
                style={styles.deck}
                contentContainerStyle={styles.deckContent}
            >
                {deck.picks.map(quiz => (
                    <QuizCard key={quiz.id} quiz={quiz} isNewest={quiz.id === deck.newestId} />
                ))}
            </ScrollView>
        </View>
    )
}

function QuizCard({ quiz, isNewest }: { quiz: QuizListItem, isNewest: boolean }) {
    const styles = useStyles();
    const t = useT();

    const swatch = swatchFor(quiz);

    return (
        <View style={styles.card}>
            <View style={styles.topRow}>
                {isNewest && (
                    <View style={styles.badge}>
                        <AppText style={styles.badgeText}>
                            {t('pubquizr.index.newBadge')}
                        </AppText>
                    </View>
                )}

                <View style={[styles.swatch, { backgroundColor: swatch.color }]}>
                    <AppText style={[styles.swatchInitials, { color: swatch.foreground }]}>
                        {initialsFor(quiz)}
                    </AppText>
                </View>
            </View>

            <AppText style={styles.title} numberOfLines={2}>
                {quiz.title}
            </AppText>

            {quiz.description !== '' && (
                <AppText style={styles.description} numberOfLines={2}>
                    {quiz.description}
                </AppText>
            )}

            <Link
                href={{
                    pathname: ROUTES.quizzerOneDeviceGameSettings,
                    params: { quizId: quiz.id }
                }}
                asChild
            >
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t('pubquizr.index.playThis')}: ${quiz.title}`}
                    style={styles.play}
                >
                    <AppText style={styles.playText}>
                        {t('pubquizr.index.playThis')}
                    </AppText>

                    <Feather name="arrow-right" size={18} color={Brand.secondary} />
                </Pressable>
            </Link>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    section: {
        gap: 12
    },

    heading: {
        fontSize: 17,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: theme.colors.text
    },

    deck: {
        marginHorizontal: -GUTTER
    },

    // Room underneath for the cards' hard shadow, which the scroll view would otherwise clip.
    deckContent: {
        paddingHorizontal: GUTTER,
        paddingBottom: 4,
        gap: CARD_GAP
    },

    // A cobalt poster in both schemes, the way `WeeklyStamp` is.
    card: {
        width: CARD_WIDTH,
        flexShrink: 0,
        borderRadius: 24,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: Brand.secondary,
        padding: 15,
        gap: 11,
        ...hardShadow(4, Brand.ink)
    },

    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },

    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: Brand.lemon
    },

    badgeText: {
        fontSize: 9,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: Brand.ink
    },

    swatch: {
        width: 48,
        height: 48,
        flexShrink: 0,
        // Pinned right even when there is no badge beside it.
        marginLeft: 'auto',
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Brand.ink,
        ...hardShadow(2, Brand.ink)
    },

    swatchInitials: {
        fontSize: 14,
        fontWeight: 900
    },

    title: {
        fontSize: 23,
        fontWeight: 900,
        letterSpacing: -0.8,
        lineHeight: 23 * 1.1,
        color: Brand.textOnAccent
    },

    description: {
        fontSize: 13.5,
        lineHeight: 13.5 * 1.35,
        fontWeight: 700,
        color: Brand.textOnAccent,
        opacity: 0.85
    },

    play: {
        marginTop: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        borderRadius: 999,
        backgroundColor: Brand.textOnAccent
    },

    playText: {
        fontSize: 17,
        fontWeight: 900,
        color: Brand.ink
    }
}));
