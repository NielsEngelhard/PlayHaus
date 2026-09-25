import { Spacing } from "@/constants/theme";
import { ScrollView, StyleSheet, type DimensionValue, type ScrollViewProps } from "react-native";

interface Props extends ScrollViewProps {
    // How far out the edge goes: no further than the gutter around it, or it lands outside whatever clips that.
    bleed?: number
}

const sideOf = (value: DimensionValue | undefined) => typeof value === 'number' ? value : 0;

// A scroller clips both axes, so this pushes its side edges out into the page gutter where a hover pop has room to land.
export default function BleedScrollView({ bleed = Spacing.four, style, contentContainerStyle, ...rest }: Props) {
    const { paddingStart, paddingEnd, ...inner } = StyleSheet.flatten(contentContainerStyle) ?? {};
    const side = inner.paddingHorizontal ?? inner.padding;

    return (
        <ScrollView
            {...rest}
            style={[{ marginHorizontal: -bleed }, style]}
            contentContainerStyle={[
                inner,
                {
                    paddingLeft: bleed + sideOf(paddingStart ?? inner.paddingLeft ?? side),
                    paddingRight: bleed + sideOf(paddingEnd ?? inner.paddingRight ?? side)
                }
            ]}
        />
    )
}
