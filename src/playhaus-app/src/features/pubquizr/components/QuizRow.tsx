import AppText from "@/components/text/AppText";
import Chip from "@/components/ui/Chip";
import { ROUTES } from "@/constants/routes";
import { usePhrase, useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Link } from "expo-router";
import { Image, Pressable, StyleSheet, View, type ImageStyle } from "react-native";
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
 * A cover filling the avatar's box, inside whatever border that box is wearing.
 *
 * Outside `useStyles` because it holds no colour — the one thing a module-level style
 * object cannot be trusted with, since `StyleSheet.create` would freeze it to whichever
 * scheme happened to be current at import. It is also the wrong shape for that sheet:
 * every entry there is a `ViewStyle`, and an `Image` takes an `ImageStyle`.
 */
const AVATAR_IMAGE: ImageStyle = {
    width: '100%',
    height: '100%',
    borderRadius: 999
};

/**
 * One quiz on a shelf: its swatch, what it is called, what is in it, and when it went
 * up.
 *
 * The whole row is the target rather than the chevron at the end of it — the chevron is
 * there to say the row goes somewhere, not to be aimed at.
 */
export default function QuizRow({ quiz, onSelect, selected = false }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();
    const phrase = usePhrase();

    const swatch = swatchFor(quiz);
    const published = publishedAtPhrase(quiz.publishedAt);

    const label = quiz.played
        ? `${quiz.title}, ${t('pubquizr.index.list.played')}`
        : quiz.title;

    const body = (
        <>
            {/* One box, filled two ways: a cover when the quiz has one, the initials
                every quiz has otherwise. The swatch stays behind either — it is the
                fallback when there is no image, and the placeholder underneath one that
                has not arrived, which is the whole of the loading state this needs. */}
            <View style={[styles.avatar, { backgroundColor: swatch.color }]}>
                {quiz.imageUrl !== undefined ? (
                    <Image
                        source={{ uri: quiz.imageUrl }}
                        resizeMode="cover"
                        accessibilityIgnoresInvertColors
                        style={AVATAR_IMAGE}
                    />
                ) : (
                    <AppText style={[styles.initials, { color: swatch.foreground }]}>
                        {initialsFor(quiz.title)}
                    </AppText>
                )}
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

                {(published !== null || quiz.played === true) && (
                    <View style={styles.meta}>
                        {published !== null && (
                            <View style={styles.published}>
                                <Feather name="clock" size={11} color={theme.colors.textMuted} />

                                <AppText style={styles.publishedText}>
                                    {phrase(published)}
                                </AppText>
                            </View>
                        )}

                        {quiz.played === true && (
                            <Chip text={t('pubquizr.index.list.played')} icon="check" />
                        )}
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
                accessibilityLabel={label}
                accessibilityState={{ selected, checked: selected }}
                style={[styles.row, quiz.played === true && styles.rowPlayed, selected && styles.rowSelected]}
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
                accessibilityLabel={label}
                // Flattened: `Link asChild` clones this onto the anchor it renders, and a
                // style array does not survive that trip.
                style={StyleSheet.flatten([styles.row, quiz.played === true && styles.rowPlayed])}
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
        ...theme.shadows.hardSmall
    },
    rowPlayed: {
        opacity: 0.72
    },

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
        // The offset is the same in both schemes; the ink line is not. A swatch is a
        // colour rather than a surface, and in dark a mid-grey ring around a bright fill
        // mutes the colour instead of framing it.
        ...theme.shadows.hardSmall,
        ...(theme.scheme === 'dark'
            ? {}
            : { borderWidth: theme.borderWidth, borderColor: theme.colors.border })
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
    meta: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8
    },

    published: {
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
