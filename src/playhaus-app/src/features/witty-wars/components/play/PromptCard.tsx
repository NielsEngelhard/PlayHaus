import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { FontSizes } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useWindowDimensions } from "react-native";

interface Props {
    line: string,
    // The smaller cut, for the voting screen where the two answers need the room.
    compact?: boolean
}

// The question both writers are answering, with any player's name already put in.
export default function PromptCard({ line, compact = false }: Props) {
    const styles = useStyles();

    // A long prompt at full size would run off a small phone.
    const { width } = useWindowDimensions();
    const size = compact ? FontSizes.lg : width < 380 ? FontSizes.xl : FontSizes.xxl;

    return (
        <Card>
            <AppText accessibilityRole='header' style={[styles.line, { fontSize: size, lineHeight: size * 1.2 }]}>
                {line}
            </AppText>
        </Card>
    )
}

const useStyles = createThemedStyles(theme => ({
    line: {
        fontWeight: 900,
        letterSpacing: -0.5,
        color: theme.colors.text
    }
}))
