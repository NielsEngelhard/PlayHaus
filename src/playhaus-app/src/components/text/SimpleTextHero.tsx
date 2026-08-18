import AppText from "@/components/text/AppText";
import { FontSizes, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    title: string,
    description?: string
}

/**
 * A page's opening title and blurb. Smaller than `BigIntroText` — that one is for the
 * home page's statement, this one heads up an ordinary page.
 */
export default function SimpleTextHero({ title, description }: Props) {
    const styles = useStyles();

    return (
        <View style={styles.container}>
            <AppText style={styles.title}>{title}</AppText>

            {description && (
                <AppText style={styles.description}>{description}</AppText>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        paddingHorizontal: Spacing.one,
        width: '100%'
    },
    title: {
        fontSize: FontSizes.xxxl,
        fontWeight: 900,
        lineHeight: FontSizes.xxxl * 1.1,
        letterSpacing: -0.7,
        color: theme.colors.text
    },
    description: {
        marginTop: Spacing.two,
        maxWidth: 448,
        fontSize: FontSizes.md,
        lineHeight: FontSizes.md * 1.5,
        color: theme.colors.textSecondary
    }
}))
