import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { FontSizes, Spacing } from "@/constants/theme"
import AppText from "./AppText"

interface Props {
    text: string,
}

export default function BigAccentText({ text }: Props ) {
    const styles = useStyles();

    return (
        <AppText style={styles.accent}>{text}</AppText>
    )
}

const useStyles = createThemedStyles(theme => ({
    accent: {
        fontSize: FontSizes.huge,
        fontWeight: 900,
        lineHeight: FontSizes.huge * 1.1,
        color: theme.colors.backgroundSecondary,
        backgroundColor: theme.colors.text,
        alignSelf: "flex-start",
        paddingHorizontal: Spacing.one,
    }
}))
