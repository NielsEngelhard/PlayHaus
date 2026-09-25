import { Spacing } from "@/constants/theme";
import { ScrollView, StyleSheet, type DimensionValue, type ScrollViewProps } from "react-native";

const BLEED = Spacing.four;

const sideOf = (value: DimensionValue | undefined) => typeof value === 'number' ? value : 0;

// A scroller clips both axes, so this pushes its side edges out into the page gutter where a hover pop has room to land.
export default function BleedScrollView({ style, contentContainerStyle, ...rest }: ScrollViewProps) {
    const { paddingStart, paddingEnd, ...inner } = StyleSheet.flatten(contentContainerStyle) ?? {};
    const side = inner.paddingHorizontal ?? inner.padding;

    return (
        <ScrollView
            {...rest}
            style={[styles.bleed, style]}
            contentContainerStyle={[
                inner,
                {
                    paddingLeft: BLEED + sideOf(paddingStart ?? inner.paddingLeft ?? side),
                    paddingRight: BLEED + sideOf(paddingEnd ?? inner.paddingRight ?? side)
                }
            ]}
        />
    )
}

const styles = StyleSheet.create({
    bleed: {
        marginHorizontal: -BLEED
    }
})
