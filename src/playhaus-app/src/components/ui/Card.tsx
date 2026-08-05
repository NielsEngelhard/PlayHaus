import React from "react";
import { Text, View } from "react-native";

interface Props {
    children: React.ReactNode
}

export default function Card({ children }: Props) {
    return (
        <View>
            <Text>
                {children}
            </Text>
        </View>
    )
}