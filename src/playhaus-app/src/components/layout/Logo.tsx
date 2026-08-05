import { APP_NAME } from "@/constants/global-constants"
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme"
import AppText from "@/components/text/AppText"
import { StyleSheet, View } from "react-native"

interface Props {
    includeAppName: boolean
}

export default function Logo({ includeAppName }: Props) {
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

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    iconBubble: {
        backgroundColor: Colors.light.lemon,
        width: 35,
        height: 35,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.light.border,
        ...Shadows.hard
    },
    iconText: {
        fontWeight: 900,
        fontSize: FontSizes.lg
    },
    fullAppName: {
        fontWeight: 900,
        fontSize: FontSizes.lg
    }
})