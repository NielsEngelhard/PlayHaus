import AppText from "@/components/text/AppText";
import { Colors, FontSizes, Spacing } from "@/constants/theme";
import { View } from "react-native";

interface Props {
    text: string
}

export default function Tag({ text }: Props) {
    return (
        <View>
            <AppText style={{
                borderWidth: 2,
                borderColor: Colors.light.border,
                borderRadius: 14,
                paddingVertical: 2,
                paddingHorizontal: Spacing.three,
                backgroundColor: Colors.light.backgroundSecondary,
                fontWeight: 500
            }}>
                {text}
            </AppText>
        </View>
    )
}