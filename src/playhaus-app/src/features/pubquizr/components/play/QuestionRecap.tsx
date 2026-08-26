import AppText from "@/components/text/AppText";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import { Pressable } from "react-native";

interface Props {
    prompt: string
    /**
     * What the row is for, at a glance. A speaker where tapping re-reads the question in
     * place, an arrow where tapping goes back to it.
     */
    icon: keyof typeof Feather.glyphMap
    /** The small print on the right, which is also the accessibility label. */
    hint: string
    /** Let the whole question wrap instead of cutting it off after one line. */
    expanded?: boolean
    onPress: () => void
}

/**
 * The question, once it has stopped being the thing on screen.
 *
 * Both rounds reach the same moment: the question has been read out, and what happens
 * next needs the room the question was taking. Neither can simply drop it — somebody at
 * the table always asks for it again, and a quizmaster who has to go back a screen to
 * find it will read it out from memory instead, which is how a table ends up answering
 * two different questions.
 *
 * So it shrinks to one line and stays tappable. Where that tap leads differs — round 2
 * unfolds it in place, round 3 goes back to the screen it came from — which is why the
 * press is the caller's rather than this component's.
 */
export default function QuestionRecap({ prompt, icon, hint, expanded = false, onPress }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${prompt} — ${hint}`}
            style={styles.row}
        >
            <Feather name={icon} size={14} color={theme.colors.textMuted} />

            {/* `minWidth: 0` is what makes the ellipsis happen: without it the text
                sizes to its content and pushes the hint off the end of the row. */}
            <AppText
                style={styles.prompt}
                numberOfLines={expanded ? undefined : 1}
            >
                {prompt}
            </AppText>

            {!expanded && (
                <AppText style={styles.hint}>{hint}</AppText>
            )}
        </Pressable>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Quieter than a card and flatter than one: no shadow, and a fill a step back from
    // the cards around it. This is the question demoted, and it should look demoted.
    row: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        minHeight: 44,
        paddingVertical: 9,
        paddingHorizontal: 11,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundElement
    },

    prompt: {
        flex: 1,
        minWidth: 0,
        fontSize: 13.5,
        fontWeight: 800,
        lineHeight: 13.5 * 1.3,
        color: theme.colors.textSecondary
    },

    hint: {
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 800,
        color: theme.colors.textMuted
    }
}))
