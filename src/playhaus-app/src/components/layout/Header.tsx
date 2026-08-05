import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Logo from "./Logo";

export default function Card() {
    return (
        <View style={styles.container}>
            {/* Left */}
            <View>
                <Logo includeAppName={true} />
            </View>

            {/* Right */}
            <View>
                <Text>
                    Right
                </Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        height: 75,
        flexDirection: 'row',
        justifyContent: "space-between",
        alignItems: 'center',        
        width: '100%'
    }
})