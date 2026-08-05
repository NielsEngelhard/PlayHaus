import { Colors, FontSizes, Spacing } from "@/constants/theme"
import { StyleSheet } from "react-native"
import AppText from "./AppText"

interface Props {
    text: string,
}

export default function BigAccentText({ text }: Props ) {
    return (
        <AppText style={styles.accent}>{text}</AppText>
    )
}

const styles = StyleSheet.create({
    accent: {
        fontSize: FontSizes.huge,
        fontWeight: 900,
        lineHeight: FontSizes.huge * 1.1,
        color: Colors.light.backgroundSecondary,
        backgroundColor: Colors.light.text,
        alignSelf: "flex-start",
        paddingHorizontal: Spacing.one,
    }
})