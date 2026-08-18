import AppText from "@/components/text/AppText";
import { FontSizes, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    text: string
}

export default function Tag({ text }: Props) {
    const styles = useStyles();

    return (
        <View style={styles.container}>
            <AppText style={styles.text}>
                {text}
            </AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        alignSelf: 'flex-start'
    },
    text: {
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderRadius: 999,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.two + 2,
        backgroundColor: theme.colors.backgroundSecondary,
        fontSize: FontSizes.xs,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    }
}))
