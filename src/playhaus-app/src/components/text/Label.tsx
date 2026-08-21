import { Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import AppText from "./AppText";

interface Props {
    label: string
}

export default function Label({ label }: Props) {
    const styles = useStyles();
    
    return (
        <AppText style={styles.label}>{label}</AppText>
    )
}

const useStyles = createThemedStyles(theme => ({
    label: {
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted,
        marginBottom: Spacing.two
    }
}))