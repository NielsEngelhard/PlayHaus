import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { FontSizes } from "@/constants/theme"
import { View } from "react-native"
import AppText from "./AppText"
import BigAccentText from "./BigAccentText"

interface Props {
    title: string,
    accent?: string
}

export default function BigIntroText({ title, accent }: Props ) {
    const styles = useStyles();

    return (
        <View style={styles.container}>
            <AppText style={styles.title}>{title}</AppText>

            {accent && (
                <BigAccentText text={accent} />
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        width: 'auto'
    },
    title: {
        fontSize: FontSizes.huge,
        fontWeight: 900,
        lineHeight: FontSizes.huge * 1.1,
        color: theme.colors.text
    },
    accent: {
        fontSize: FontSizes.huge,
        fontWeight: 900,
        lineHeight: FontSizes.huge * 1.1,
        color: theme.colors.backgroundSecondary,
        backgroundColor: theme.colors.background
    }
}))
