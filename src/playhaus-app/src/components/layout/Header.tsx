import React from "react";
import { StyleSheet, View } from "react-native";
import Logo from "./Logo";
import Tag from "../ui/Tag";
import { useHeaderTagValue } from "./HeaderTagContext";
import { Link, RelativePathString } from "expo-router";
import { ROUTES } from "@/constants/routes";

export default function Header() {
    const tag = useHeaderTagValue();

    return (
        <View style={styles.container}>
            {/* Left */}
            <View>
                <Link href={ROUTES.home as RelativePathString}>
                    <Logo includeAppName={true} />
                </Link>
            </View>

            {/* Right — whatever the current page claimed, or the app version. */}
            <View>
                <Tag text={tag} />
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
