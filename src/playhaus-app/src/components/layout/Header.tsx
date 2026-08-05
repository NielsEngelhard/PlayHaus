import React from "react";
import { StyleSheet, View } from "react-native";
import Logo from "./Logo";
import Tag from "../ui/Tag";
import { APP_VERSION } from "@/constants/global-constants";

export default function Card() {
    return (
        <View style={styles.container}>
            {/* Left */}
            <View>
                <Logo includeAppName={true} />
            </View>

            {/* Right */}
            <View>
                <Tag text={APP_VERSION} />
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