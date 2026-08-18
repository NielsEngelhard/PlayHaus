import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native"
import AppText from "./AppText"
import BigAccentText, { HeadingLineHeight, HeadingSize } from "./BigAccentText"

interface Props {
    title: string,
    accent?: string
}

/** The home page's headline: a plain first line, then the inverted block underneath. */
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
        width: 'auto',
        alignItems: 'flex-start'
    },
    title: {
        fontSize: HeadingSize,
        fontWeight: 900,
        lineHeight: HeadingLineHeight,
        letterSpacing: -1.3,
        color: theme.colors.text
    }
}))
