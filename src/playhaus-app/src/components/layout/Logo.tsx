import { APP_NAME } from "@/constants/global-constants"
import { Colors, FontSizes, Shadows, Spacing } from "@/constants/theme"
import { StyleSheet, Text, View } from "react-native"

interface Props {
    includeAppName: boolean
}

export default function Logo({ includeAppName }: Props) {
    return (
        <View style={styles.container}>
            <View style={styles.iconBubble}>
                <Text style={styles.iconText}>{APP_NAME[0]}</Text>
            </View>

            {(includeAppName == true) && (
                <Text style={styles.fullAppName}>{APP_NAME}</Text>
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