import { Colors, hardShadow, Shadows, Spacing } from "@/constants/theme";
import React, { useState } from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";

interface Props {
    children: React.ReactNode
    triggerOnHoverAnimation?: boolean
}

export default function Card({ children, triggerOnHoverAnimation = false }: Props) {
    const [hovered, setHovered] = useState(false);

    return (
        <View
            style={[
                styles.container,
                triggerOnHoverAnimation && hoverTransition,
                triggerOnHoverAnimation && hovered && styles.hovered
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

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.light.backgroundSecondary,
        borderRadius: 16,
        flexDirection: 'column',
        borderWidth: 2,
        borderColor: Colors.light.border,
        padding: Spacing.four,
        width: '100%',
        ...Shadows.hardLarge
    },
    hovered: {
        transform: [{ translateX: -2 }, { translateY: -2 }],
        ...hardShadow(7)
    }
})
