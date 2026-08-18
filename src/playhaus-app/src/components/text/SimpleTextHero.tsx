import AppText from "@/components/text/AppText";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** Newlines are honoured, for a title the design breaks at a chosen word. */
    title: string,
    description?: string
}

/** A page's headline and the line under it. */
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
        width: '100%'
    },
    title: {
        fontSize: 32,
        fontWeight: 900,
        lineHeight: 32 * 1.04,
        letterSpacing: -1.2,
        color: theme.colors.text
    },
    description: {
        marginTop: 10,
        maxWidth: 300,
        fontSize: 14,
        lineHeight: 14 * 1.5,
        color: theme.colors.textSecondary
    }
}))
