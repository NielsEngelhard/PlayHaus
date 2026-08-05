import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import { StyleSheet, View } from "react-native";

interface Props {
    text: string
}

export default function Tag({ text }: Props) {
    return (
        <View style={styles.container}>
            <AppText style={styles.text}>
                {text}
            </AppText>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignSelf: 'flex-start'
    },
    text: {
        borderWidth: 2,
        borderColor: Colors.light.border,
        borderRadius: 999,
        paddingVertical: Spacing.one,
        paddingHorizontal: Spacing.two + 2,
        backgroundColor: Colors.light.backgroundSecondary,
        fontSize: FontSizes.xs,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    }
})
