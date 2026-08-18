import { ROUTES } from "@/constants/routes";
import { Brand, BottomBarHeight, Spacing } from "@/constants/theme";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Link, RelativePathString, usePathname, type Href } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Tab {
    icon: keyof typeof Feather.glyphMap,
    /** The bar is icon-only, so this exists for screen readers rather than the eye. */
    label: string,
    href: Href,
    /** Extra path prefixes that should also light this tab up. */
    alsoMatches?: string[]
}

const TABS: Tab[] = [
    { icon: 'grid', label: 'Alle games', href: ROUTES.home as RelativePathString, alsoMatches: ['/games'] },
    { icon: 'wifi', label: 'Reconnect', href: ROUTES.reconnect as RelativePathString },
    { icon: 'users', label: 'Vrienden', href: ROUTES.friends as RelativePathString },
    { icon: 'settings', label: 'Profiel', href: ROUTES.profile as RelativePathString }
]

function isUnder(pathname: string, prefix: string): boolean {
    return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function isActive(tab: Tab, pathname: string): boolean {
    const path = String(tab.href)
    // '/' is a prefix of every route, so home has to match exactly.
    const own = path === '/' ? pathname === '/' : isUnder(pathname, path)
    return own || (tab.alsoMatches?.some(prefix => isUnder(pathname, prefix)) ?? false)
}

export default function BottomBar() {
    const theme = useTheme();
    const styles = useStyles();
    const insets = useSafeAreaInsets()
    const pathname = usePathname()

    // The active tab is the one bright fill down here, so its icon takes whichever ink
    // stays readable on orange in this scheme.
    const activeInk = theme.scheme === 'dark' ? Brand.ink : Brand.textOnAccent;

    return (
        <View
            pointerEvents="box-none"
            style={[styles.wrapper, { paddingBottom: Spacing.three + insets.bottom }]}
        >
            <View style={styles.bar}>
                {TABS.map(tab => {
                    const active = isActive(tab, pathname)

                    return (
                        <Link key={tab.label} href={tab.href} asChild>
                            <Pressable
                                style={styles.item}
                                accessibilityRole='link'
                                accessibilityLabel={tab.label}
                                accessibilityState={{ selected: active }}
                            >
                                <View style={[styles.icon, active && styles.iconActive]}>
                                    <Feather
                                        name={tab.icon}
                                        size={21}
                                        color={active ? activeInk : theme.colors.textMuted}
                                    />
                                </View>
                            </Pressable>
                        </Link>
                    )
                })}
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    wrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingHorizontal: Spacing.three
    },
    bar: {
        width: '100%',
        // Lines up with the content column above it.
        maxWidth: 600,
        height: BottomBarHeight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 6,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark'
            ? {}
            : { boxShadow: '3px 3px 0 0 #0F0D12, 0 14px 24px -14px rgba(15, 13, 18, 0.55)' })
    },
    item: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center'
    },
    icon: {
        width: 46,
        height: 46,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center'
    },
    iconActive: {
        backgroundColor: theme.colors.primary,
        // Light rings the active pip to match the rest of its chrome; dark lets the
        // orange do the work on its own.
        borderWidth: theme.scheme === 'dark' ? 0 : theme.borderWidth,
        borderColor: theme.colors.border
    }
}))
