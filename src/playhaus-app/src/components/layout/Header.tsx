import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import { Link, RelativePathString } from "expo-router";
import { StyleSheet, View } from "react-native";
import Tag from "../ui/Tag";
import { useHeaderTagValue } from "./HeaderTagContext";
import Logo from "./Logo";

export default function Header() {
    const tag = useHeaderTagValue();

    const auth = useAuth()

    return (
        <View style={styles.container}>
            {/* Left */}
            <View>
                <Link href={ROUTES.home as RelativePathString}>
                    <Logo includeAppName={true} />
                </Link>
            </View>

            {/* Right — whatever the current page claimed, or the app version. */}
            <View style={styles.tagsContainer}>                
                {(auth && auth.user)  && (
                    <Tag text={auth.user?.name} />
                )}
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
    },
    tagsContainer: {
        flexDirection: 'row',
        gap: Spacing.two
    }
})
