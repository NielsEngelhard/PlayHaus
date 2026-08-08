import React from "react";
import { StyleSheet, View } from "react-native";

interface Props {
    children: React.ReactNode;
}

export default function PageBase({ children }: Props) {
    return (
        <View>
            {children}
        </View>
    )
}

const style = StyleSheet.create({
    
})