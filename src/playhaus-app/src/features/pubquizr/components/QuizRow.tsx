import AppText from "@/components/text/AppText";
import { ROUTES } from "@/constants/routes";
import { Brand } from "@/constants/theme";
import { usePhrase, useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Link } from "expo-router";
import { Image, Pressable, View, type ImageStyle } from "react-native";
import type { QuizListItem } from "../pubquizr-quizzes";
import { initialsFor, publishedAtPhrase, swatchFor } from "../quiz-shelf";

interface Props {
    quiz: QuizListItem,
    // Picks this quiz instead of going anywhere.
    onSelect?: (quiz: QuizListItem) => void,
    // Makes the row an ordinary button that does this, rather than a link or a choice.
    onPress?: (quiz: QuizListItem) => void,
    // Draws the row as the one already chosen: focus border, and a tick where the chevron would be.
    selected?: boolean
}

const AVATAR_SIZE = 56;

// A cover filling the avatar's box, inside whatever border that box is wearing.
const AVATAR_IMAGE: ImageStyle = {
    width: '100%',
    height: '100%',
    borderRadius: 999
};

// One quiz on a shelf: its swatch, what it is called, what is in it, and when it went up.
export default function QuizRow({ quiz, onSelect, onPress, selected = false }: Props) {
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
            {/* One box, filled two ways: a cover when the quiz has one, the initials every quiz has otherwise. */}
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
                        {initialsFor(quiz)}
                    </AppText>
                )}
            </View>

            {/* `minWidth: 0` is what lets the long title truncate instead of pushing the chevron off the end of the row. */}
            <View style={styles.body}>
                <View style={styles.titleRow}>
                    <AppText style={styles.title} numberOfLines={1}>
                        {quiz.title}
                    </AppText>

                    {quiz.played === true && (
                        <View style={styles.playedDisc}>
                            <Feather name="check" size={12} color={Brand.ink} />
                        </View>
                    )}
                </View>

                {quiz.description !== '' && (
                    <AppText style={styles.description} numberOfLines={2}>
                        {quiz.description}
                    </AppText>
                )}

                {published !== null && (
                    <View style={styles.meta}>
                        <View style={styles.published}>
                            <Feather name="clock" size={11} color={theme.colors.textMuted} />

                            <AppText style={styles.publishedText}>
                                {phrase(published)}
                            </AppText>
                        </View>
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

    // Three different targets rather than one that branches inside `onPress`.
    if (onSelect) {
        return (
            <Pressable
                onPress={() => onSelect(quiz)}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ selected, checked: selected }}
                style={[styles.row, selected && styles.rowSelected]}
            >
                {body}
            </Pressable>
        )
    }

    if (onPress) {
        return (
            <Pressable
                onPress={() => onPress(quiz)}
                accessibilityRole="button"
                accessibilityLabel={label}
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
                accessibilityLabel={label}
                style={styles.row}
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
        // The offset is the same in both schemes; the ink line is not.
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

    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },

    title: {
        flexShrink: 1,
        fontSize: 17,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: theme.colors.text
    },

    playedDisc: {
        width: 22,
        height: 22,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },

    description: {
        marginTop: 3,
        fontSize: 12.5,
        lineHeight: 12.5 * 1.35,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },
    meta: {
        marginTop: 7,
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
