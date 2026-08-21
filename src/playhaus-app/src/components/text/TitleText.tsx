import { Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import AppText from "./AppText";

interface Props {
    title: string
}

export default function TitleText({ title }: Props) {
    const styles = useStyles();

    return (
        <AppText style={styles.title}>{title}</AppText>
    )
}

const useStyles = createThemedStyles(theme => ({
    title: {
        fontSize: 16,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 1.8,
        color: theme.colors.textMuted,
        marginBottom: Spacing.three
    },
}))
