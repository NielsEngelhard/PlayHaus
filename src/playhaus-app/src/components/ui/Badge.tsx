import AppText from "@/components/text/AppText";
import { createThemedStyles } from "@/features/theme/createThemedStyles";

interface Props {
    text: string
}

/**
 * A quiet status pill for a fact that is not yet true — "Coming soon", and the like.
 *
 * Outlined and lettered in `theme.colors.secondary` rather than the neutral palette: it
 * is not a sticker like the "New" badge on `GameTeaserCard`, which earns brand ink and
 * lemon because it is announcing something, but it is still the app's own accent rather
 * than plain grey — the fill stays flat so the colour reads as a tint, not a control.
 */
export function Badge({ text }: Props) {
    const styles = useStyles();

    return (
        <AppText style={styles.badge}>{text}</AppText>
    );
}

const useStyles = createThemedStyles(theme => ({
    badge: {
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.secondary,
        backgroundColor: theme.colors.backgroundElement,
        paddingHorizontal: 8,
        paddingVertical: 3,
        fontSize: 10.5,
        fontWeight: 800,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: theme.colors.secondary
    }
}))
