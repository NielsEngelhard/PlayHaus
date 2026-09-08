import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { Image, type ImageSource } from "expo-image";

interface Props {
    /** The game's own icon, e.g. `require("@/assets/icons/pubquizr-icon.svg")`. */
    icon: ImageSource,
    /** Read aloud in place of the icon, which on its own says nothing. */
    label: string
}

const SIZE = 34;

// A game's own square mark, for the right of the header on its front page.
export default function GameMark({ icon, label }: Props) {
    const styles = useStyles();

    return (
        <Image
            source={icon}
            style={styles.tile}
            accessibilityRole='image'
            accessibilityLabel={label}
        />
    )
}

const useStyles = createThemedStyles(theme => ({
    tile: {
        width: SIZE,
        height: SIZE,
        flexShrink: 0,
        borderRadius: 10,
        // Matches the wordmark opposite it, so the two ends of the row sit at one height.
        boxShadow: `2px 2px 0 0 ${theme.colors.shadow}`
    }
}))
