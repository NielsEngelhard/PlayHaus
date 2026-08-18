import AppText from "@/components/text/AppText";
import Card from "@/components/ui/Card";
import { FontSizes, Spacing } from "@/constants/theme";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    label: string,
    value: string,
    icon?: keyof typeof Feather.glyphMap
}

/** A card that shows one labelled, read-only value. */
export default function ValueCard({ label, value, icon }: Props) {
    const theme = useTheme();
    const styles = useStyles();

    return (
        <Card>
            <AppText style={styles.label}>{label}</AppText>

            <View style={styles.row}>
                {icon && (
                    <Feather
                        name={icon}
                        size={20}
                        color={theme.colors.textSecondary}
                    />
                )}

                <AppText style={styles.value}>{value}</AppText>
            </View>
        </Card>
    )
}

const useStyles = createThemedStyles(theme => ({
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 2.2,
        color: theme.colors.textSecondary
    },
    row: {
        marginTop: Spacing.two,
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.two
    },
    value: {
        flex: 1,
        fontSize: FontSizes.lg,
        fontWeight: 700,
        color: theme.colors.text
    }
}))
