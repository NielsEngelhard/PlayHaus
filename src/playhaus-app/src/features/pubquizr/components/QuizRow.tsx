import AppText from "@/components/text/AppText";
import { ROUTES } from "@/constants/routes";
import { usePhrase } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Link } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import type { QuizListItem } from "../pubquizr-quizzes";
import { initialsFor, publishedAtPhrase, swatchFor } from "../quiz-shelf";

interface Props {
    quiz: QuizListItem,
    /**
     * Picks this quiz instead of going anywhere.
     *
     * The row is two things depending on whether this is here. On the index it is a
     * link into the setup screen, carrying the quiz it was tapped on; on the setup
     * screen itself there is nowhere left to go, so the same row becomes the choice.
     */
    onSelect?: (quiz: QuizListItem) => void,
    /** Draws the row as the one already chosen. Only meaningful alongside `onSelect`. */
    selected?: boolean
}

const AVATAR_SIZE = 44;

/**
 * One quiz on a shelf: its swatch, what it is called, what is in it, and when it went
 * up.
 *
 * The whole row is the target rather than the chevron at the end of it — the chevron is
 * there to say the row goes somewhere, not to be aimed at.
 */
export default function QuizRow({ quiz, onSelect, selected = false }: Props) {
    const theme = useTheme();
    const styles = useStyles();
    const phrase = usePhrase();

    const swatch = swatchFor(quiz);
    const published = publishedAtPhrase(quiz.publishedAt);

    const body = (
        <>
            <View style={[styles.avatar, { backgroundColor: swatch.color }]}>
                <AppText style={[styles.initials, { color: swatch.foreground }]}>
                    {initialsFor(quiz.title)}
                </AppText>
            </View>

            {/* `minWidth: 0` is what lets the long title truncate instead of
                pushing the chevron off the end of the row. */}
            <View style={styles.body}>
                <AppText style={styles.title} numberOfLines={1}>
                    {quiz.title}
                </AppText>

                {quiz.description !== '' && (
                    <AppText style={styles.description} numberOfLines={2}>
                        {quiz.description}
                    </AppText>
                )}

                {published !== null && (
                    <View style={styles.published}>
                        <Feather name="clock" size={11} color={theme.colors.textMuted} />

                        <AppText style={styles.publishedText}>
                            {phrase(published)}
                        </AppText>
                    </View>
                )}
            </View>

            <Feather
                name={selected ? 'check' : 'chevron-right'}
                size={18}
                color={selected
                    ? theme.colors.focus
                    : theme.scheme === 'dark' ? theme.colors.textMuted : theme.colors.text}
            />
        </>
    );

    // Two different targets rather than one that branches inside `onPress`: a link has
    // to render an anchor on web to be a link at all — right-clickable, openable in a
    // new tab — and a choice on a form must not be one.
    if (onSelect) {
        return (
            <Pressable
                onPress={() => onSelect(quiz)}
                accessibilityRole="radio"
                accessibilityLabel={quiz.title}
                accessibilityState={{ selected, checked: selected }}
                style={[styles.row, selected && styles.rowSelected]}
            >
                {body}
            </Pressable>
        )
    }

    return (
        <Link
            href={{
                pathname: ROUTES.quizzerOneDeviceGameSettings,
                params: { quizId: quiz.id }
            }}
            asChild
        >
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={quiz.title}
                // Flattened: `Link asChild` clones this onto the anchor it renders, and a
                // style array does not survive that trip.
                style={StyleSheet.flatten([styles.row])}
            >
                {body}
            </Pressable>
        </Link>
    )
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark' ? {} : theme.shadows.hardSmall)
    },

    // The one accent that means "this is the one" in either scheme — blue on paper,
    // lemon on the dark canvas — carried on the border and the fill rather than on a
    // badge, so a column of rows shows its answer at a glance.
    rowSelected: {
        borderColor: theme.colors.focus,
        backgroundColor: theme.colors.backgroundFocus
    },

    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        // A swatch is a colour rather than a surface, so light cuts it out of the page
        // with the same ink line and offset every other object on it wears, and dark
        // leaves it to carry itself.
        ...(theme.scheme === 'dark'
            ? {}
            : {
                borderWidth: theme.borderWidth,
                borderColor: theme.colors.border,
                ...theme.shadows.hardSmall
            })
    },

    initials: {
        fontSize: 13.5,
        fontWeight: 900
    },

    body: {
        flex: 1,
        minWidth: 0
    },

    title: {
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: -0.3,
        color: theme.colors.text
    },

    description: {
        marginTop: 3,
        fontSize: 11.5,
        lineHeight: 11.5 * 1.35,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },

    published: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },

    publishedText: {
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.2,
        color: theme.colors.textMuted
    }
}));
