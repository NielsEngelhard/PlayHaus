import AppText from "@/components/text/AppText";
import { Colors, Shadows, Spacing } from "@/constants/theme";
import React from "react";
import { StyleSheet, View } from "react-native";

interface Props {
    children: React.ReactNode
}

export default function Card({ children }: Props) {
    return (
        <View style={styles.container}>
            <AppText>
                {children}
            </AppText>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.light.backgroundSecondary,
        borderRadius: 14,
        flexDirection: 'column',
        borderWidth: 2,
        borderColor: Colors.light.border,
        padding: Spacing.three,
        width: '100%',
        ...Shadows.hard        
    }
})