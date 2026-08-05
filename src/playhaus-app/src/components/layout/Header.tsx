import React from "react";
import { StyleSheet, View } from "react-native";
import Logo from "./Logo";
import Tag from "../ui/Tag";
import { APP_VERSION } from "@/constants/global-constants";
import { Link, RelativePathString } from "expo-router";
import { ROUTES } from "@/constants/routes";

export default function Card() {
    return (
        <View style={styles.container}>
            {/* Left */}
            <View>
                <Link href={ROUTES.home as RelativePathString}>
                    <Logo includeAppName={true} />
                </Link>
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