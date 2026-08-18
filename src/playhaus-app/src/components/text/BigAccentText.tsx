import { Spacing } from "@/constants/theme"
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import AppText from "./AppText"

interface Props {
    text: string,
}

/** Font metrics shared with `BigIntroText`, so the two lines of a heading sit flush. */
export const HeadingSize = 34;
export const HeadingLineHeight = HeadingSize * 1.05;

/**
 * The second line of the home heading, set in the app's inverted block: paper letters on
 * a slab of ink.
 *
 * It is the loudest thing on the page on purpose — the heading is the only place the app
 * shouts, and everything under it is chrome by comparison.
 */
export default function BigAccentText({ text }: Props ) {
    const styles = useStyles();

    return (<AppText style={styles.accent}>{text}</AppText>)
}

const useStyles = createThemedStyles(theme => ({
    accent: {
        fontSize: HeadingSize,
        fontWeight: 900,
        lineHeight: HeadingLineHeight,
        letterSpacing: -1.3,
        color: theme.colors.background,
        backgroundColor: theme.colors.text,
        alignSelf: "flex-start",
        paddingHorizontal: Spacing.one,
    }
}))
