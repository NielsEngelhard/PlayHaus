import { Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";
import AppText from "../text/AppText";

interface Props {
    text: string;
    icon?: keyof typeof Feather.glyphMap;
}

export default function Chip({ text, icon }: Props) {
    const styles = useStyles();

    return (
        <View style={styles.chip}>
            {icon && (
                <Feather
                    name={icon}
                    size={14}
                    style={styles.chipIcon}
                />
            )}
            <AppText style={styles.chipText}>{text}</AppText>
        </View>
    );
}

const useStyles = createThemedStyles(theme => ({
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        borderWidth: 1.5,
        borderColor: theme.colors.borderSubtle,
        borderRadius: 999,
        paddingVertical: 3,
        paddingHorizontal: Spacing.two,
    },
    chipText: {
        fontSize: 11,
        fontWeight: "700",
        color: theme.colors.textSecondary,
    },
    chipIcon: {
        color: theme.colors.textSecondary,
    },
}));