import { createThemedStyles } from "@/features/theme/createThemedStyles";
import AppText from "./AppText";

interface Props {
    text: string
}

export default function({ text }: Props) {
    const styles = useStyles();

    return (
        <AppText style={styles.hint}>
            {text}
        </AppText>        
    )
}

const useStyles = createThemedStyles(theme => ({
    hint: {
        marginTop: 9,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 600,
        color: theme.colors.textMuted
    }
}))