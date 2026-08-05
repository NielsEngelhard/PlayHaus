import { Colors, FontSizes } from "@/constants/theme"
import { StyleSheet, View } from "react-native"
import AppText from "./AppText"
import BigAccentText from "./BigAccentText"

interface Props {
    title: string,
    accent?: string
}

export default function BigIntroText({ title, accent }: Props ) {
    return (
        <View style={styles.container}>
            <AppText style={styles.title}>{title}</AppText>

            {accent && (
                <BigAccentText text={accent} />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: 'auto'
    },
    title: {
        fontSize: FontSizes.huge,
        fontWeight: 900,
        lineHeight: FontSizes.huge * 1.1,
        color: Colors.light.text
    },
    accent: {
        fontSize: FontSizes.huge,
        fontWeight: 900,
        lineHeight: FontSizes.huge * 1.1,
        color: Colors.light.backgroundSecondary,
        backgroundColor: Colors.light.background
    }
})