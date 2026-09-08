import AppText from "@/components/text/AppText";
import { createThemedStyles } from "@/features/theme/createThemedStyles";

interface Props {
    text: string
}

// A quiet status pill for a fact that is not yet true — "Coming soon", and the like.
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
