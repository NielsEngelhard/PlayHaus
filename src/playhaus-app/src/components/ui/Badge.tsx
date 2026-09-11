import AppText from "@/components/text/AppText";
import { createThemedStyles } from "@/features/theme/createThemedStyles";

interface Props {
    text: string,
    /** Overrides the badge's default accent with the caller's own colour, e.g. a game's brand colour. */
    color?: string
}

// A quiet status pill for a fact that is not yet true — "Coming soon", and the like.
export function Badge({ text, color }: Props) {
    const styles = useStyles();

    return (
        <AppText style={[styles.badge, color !== undefined && { borderColor: color, color }]}>
            {text}
        </AppText>
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
