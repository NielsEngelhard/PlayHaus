import AppText from "@/components/text/AppText";
import { ROUTES } from "@/constants/routes";
import { Brand, FontSizes, Radii, ShadowReach, Spacing, hardShadow } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Link } from "expo-router";
import { Image, Pressable, View, type ImageStyle } from "react-native";
import type { QuizListItem } from "../pubquizr-quizzes";
import { initialsFor, swatchFor, weekNumberFor } from "../quiz-shelf";

interface Props {
    // Draws the card as this week's new quiz: lemon, heavier, with the week on top.
    featured?: boolean,
    // Picks this quiz instead of going anywhere.
    onSelect?: (quiz: QuizListItem) => void,
    // Makes the card an ordinary button that does this, rather than a link or a choice.
    onPress?: (quiz: QuizListItem) => void,
    quiz: QuizListItem,
    // Draws the card as the one already chosen: focus border, and a tick where the chevron would be.
    selected?: boolean
}

const AVATAR_SIZE = 34;
const PLAYED_DISC_SIZE = 22;
const FEATURED_BORDER = 3;

// Room the headline leaves on its right for the played stamp to sit in.
const STAMP_CLEARANCE = 84;

// A clipped box whose top edge is the only one that shows, since a dashed single side does not draw on iOS.
const RULE_BOX_HEIGHT = 12;

// Ink at reduced strength, for the quieter lines on the lemon card.
const FEATURED_RULE = `${Brand.ink}52`;
const FEATURED_SOFT_INK = `${Brand.ink}B8`;

const AVATAR_IMAGE: ImageStyle = {
    width: '100%',
    height: '100%',
    borderRadius: Radii.full
};

// One quiz on a shelf as a question card: a question from inside it, then what it is called and what it is about.
export default function QuizCard({ quiz, onSelect, onPress, selected = false, featured = false }: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const played = quiz.played === true;
    const swatch = swatchFor(quiz);
    const week = weekNumberFor(quiz);
    const teaser = quiz.teaser?.trim() ?? '';

    const label = played
        ? `${quiz.title}, ${t('pubquizr.index.list.played')}`
        : quiz.title;

    const chevronColor = selected
        ? theme.colors.focus
        : featured ? Brand.ink
            : played || theme.scheme === 'dark' ? theme.colors.textSecondary : theme.colors.text;

    const body = (
        <>
            {played && (
                <View style={styles.stamp}>
                    <AppText style={styles.stampText}>{t('pubquizr.index.list.played')}</AppText>
                </View>
            )}

            {featured && (
                <View style={styles.featuredTop}>
                    <View style={styles.featuredPill}>
                        <AppText style={styles.featuredPillText}>{t('pubquizr.index.list.newThisWeek')}</AppText>
                    </View>

                    {week !== null && (
                        <AppText style={styles.featuredWeek}>{t('pubquizr.index.list.week', { week })}</AppText>
                    )}
                </View>
            )}

            {teaser !== '' && (
                <AppText
                    style={[
                        styles.headline,
                        featured ? styles.inkText : played && styles.mutedText,
                        played && styles.headlineBesideStamp
                    ]}
                >
                    {`“${teaser}”`}
                </AppText>
            )}

            <View style={styles.rule}>
                <View style={[styles.ruleBox, featured && styles.ruleBoxFeatured]} />
            </View>

            <View style={styles.footer}>
                <View
                    style={[
                        styles.avatar,
                        featured
                            ? styles.avatarFeatured
                            : played ? styles.avatarPlayed : { backgroundColor: swatch.color }
                    ]}
                >
                    {quiz.imageUrl !== undefined ? (
                        <Image
                            source={{ uri: quiz.imageUrl }}
                            resizeMode="cover"
                            accessibilityIgnoresInvertColors
                            style={AVATAR_IMAGE}
                        />
                    ) : (
                        <AppText
                            style={[
                                styles.initials,
                                { color: featured || played ? Brand.ink : swatch.foreground }
                            ]}
                        >
                            {initialsFor(quiz)}
                        </AppText>
                    )}
                </View>

                <View style={styles.body}>
                    <View style={styles.titleRow}>
                        <AppText
                            style={[styles.title, featured ? styles.inkText : played && styles.mutedText]}
                            numberOfLines={1}
                        >
                            {quiz.title}
                        </AppText>

                        {played && (
                            <View style={styles.playedDisc}>
                                <Feather name="check" size={12} color={Brand.ink} />
                            </View>
                        )}
                    </View>

                    {quiz.description !== '' && (
                        <AppText
                            style={[styles.description, featured && styles.descriptionFeatured]}
                            numberOfLines={2}
                        >
                            {quiz.description}
                        </AppText>
                    )}
                </View>

                <Feather name={selected ? 'check' : 'chevron-right'} size={18} color={chevronColor} />
            </View>
        </>
    );

    const cardStyle = [styles.card, featured && styles.cardFeatured, selected && styles.cardSelected];

    if (onSelect) {
        return (
            <Pressable
                onPress={() => onSelect(quiz)}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ selected, checked: selected }}
                style={cardStyle}
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
                style={cardStyle}
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
                style={cardStyle}
            >
                {body}
            </Pressable>
        </Link>
    )
}

const useStyles = createThemedStyles(theme => ({
    card: {
        gap: Spacing.two,
        padding: Spacing.three,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardSmall
    },

    cardFeatured: {
        borderWidth: FEATURED_BORDER,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon,
        ...theme.shadows.hardLarge
    },

    cardSelected: {
        borderColor: theme.colors.focus,
        backgroundColor: theme.colors.backgroundFocus
    },

    stamp: {
        position: 'absolute',
        top: Spacing.three,
        right: Spacing.two,
        zIndex: 1,
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.one,
        borderRadius: Radii.sm,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint,
        transform: [{ rotate: '7deg' }],
        ...theme.shadows.hardSmall
    },

    stampText: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        color: Brand.ink
    },

    featuredTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.two
    },

    featuredPill: {
        paddingHorizontal: Spacing.two,
        paddingVertical: Spacing.one,
        borderRadius: Radii.full,
        backgroundColor: Brand.ink
    },

    featuredPillText: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        color: Brand.lemon
    },

    featuredWeek: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        color: FEATURED_SOFT_INK
    },

    headline: {
        fontSize: FontSizes.lg,
        lineHeight: FontSizes.lg * 1.3,
        fontWeight: 900,
        letterSpacing: -0.4,
        color: theme.colors.text
    },

    headlineBesideStamp: {
        marginRight: STAMP_CLEARANCE
    },

    inkText: {
        color: Brand.ink
    },

    mutedText: {
        color: theme.colors.textSecondary
    },

    rule: {
        height: theme.borderWidth,
        overflow: 'hidden'
    },

    ruleBox: {
        height: RULE_BOX_HEIGHT,
        borderWidth: theme.borderWidth,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderMuted
    },

    ruleBoxFeatured: {
        borderColor: FEATURED_RULE
    },

    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },

    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        flexShrink: 0,
        borderRadius: Radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.hardSmall,
        ...(theme.scheme === 'dark'
            ? {}
            : { borderWidth: theme.borderWidth, borderColor: theme.colors.border })
    },

    avatarFeatured: {
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.textOnAccent,
        ...hardShadow(ShadowReach.hardSmall, Brand.ink)
    },

    avatarPlayed: {
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderMuted,
        backgroundColor: theme.colors.backgroundElement,
        boxShadow: 'none'
    },

    initials: {
        fontSize: FontSizes.sm,
        fontWeight: 900
    },

    body: {
        flex: 1,
        minWidth: 0
    },

    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.one
    },

    title: {
        flexShrink: 1,
        fontSize: FontSizes.lg,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: theme.colors.text
    },

    playedDisc: {
        width: PLAYED_DISC_SIZE,
        height: PLAYED_DISC_SIZE,
        flexShrink: 0,
        borderRadius: Radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint
    },

    description: {
        marginTop: Spacing.half,
        fontSize: FontSizes.xs,
        lineHeight: FontSizes.xs * 1.3,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },

    descriptionFeatured: {
        color: FEATURED_SOFT_INK
    }
}));
