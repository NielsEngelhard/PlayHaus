import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { APP_NAME } from "@/constants/global-constants"
import { FontSizes, Spacing } from "@/constants/theme"
import AppText from "@/components/text/AppText"
import { View } from "react-native"

interface Props {
    includeAppName: boolean
}

export default function Logo({ includeAppName }: Props) {
    const styles = useStyles();

    return (
        <View style={styles.container}>
            <View style={styles.iconBubble}>
                <AppText style={styles.iconText}>{APP_NAME[0]}</AppText>
            </View>

            {(includeAppName == true) && (
                <AppText style={styles.fullAppName}>{APP_NAME}</AppText>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    iconBubble: {
        backgroundColor: theme.colors.lemon,
        width: 35,
        height: 35,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.border,
        ...theme.shadows.hard
    },
    iconText: {
        fontWeight: 900,
        fontSize: FontSizes.lg
    },
    fullAppName: {
        fontWeight: 900,
        fontSize: FontSizes.lg
    }
}))
