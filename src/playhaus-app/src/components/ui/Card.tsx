import { hardShadow, Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import React, { useState } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    children: React.ReactNode
    triggerOnHoverAnimation?: boolean
    /** For layout only — how the card sits among its siblings. The look lives here. */
    style?: StyleProp<ViewStyle>
}

export default function Card({ children, triggerOnHoverAnimation = false, style }: Props) {
    const styles = useStyles();

    const [hovered, setHovered] = useState(false);

    return (
        <View
            style={[
                styles.container,
                triggerOnHoverAnimation && hoverTransition,
                triggerOnHoverAnimation && hovered && styles.hovered,
                style
            ]}
            onPointerEnter={triggerOnHoverAnimation ? () => setHovered(true) : undefined}
            onPointerLeave={triggerOnHoverAnimation ? () => setHovered(false) : undefined}
        >
            {children}
        </View>
    )
}

const hoverTransition = Platform.select({
    web: { transitionProperty: 'transform, box-shadow', transitionDuration: '120ms' } as unknown as ViewStyle,
    default: undefined
});

const useStyles = createThemedStyles(theme => ({
    container: {
        borderRadius: 16,
        flexDirection: 'column',
        padding: Spacing.four,
        width: '100%',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background,
        ...(theme.scheme === 'dark' ? {} : { boxShadow: '2px 2px 0 0 #0F0D12' })
    },
    hovered: {
        transform: [{ translateX: -2 }, { translateY: -2 }],
        ...hardShadow(7, theme.colors.border)
    }
}))
