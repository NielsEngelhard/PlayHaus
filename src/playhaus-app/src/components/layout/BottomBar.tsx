import AppText from "@/components/text/AppText";
import { ROUTES } from "@/constants/routes";
import { Brand, BottomBarHeight, Spacing } from "@/constants/theme";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { Link, RelativePathString, usePathname, type Href } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Tab {
    icon: keyof typeof Feather.glyphMap,
    /**
     * Read aloud for every tab, and drawn as well on the `prominent` one — which is why
     * that tab's label is the word the eye should see rather than the fuller phrase a
     * screen reader would like.
     */
    label: string,
    href: Href,
    /** Extra path prefixes that should also light this tab up. */
    alsoMatches?: string[],
    /**
     * Draws this tab as a wide labelled pill instead of an icon.
     *
     * Exactly one tab wears it. Games is the reason the app is open, and four identical
     * circles made it a peer of Profile; the pill is what stops that, so it stays named
     * whether or not you are standing in it.
     */
    prominent?: true
}

const TABS: Tab[] = [
    { icon: 'grid', label: 'Games', href: ROUTES.home as RelativePathString, alsoMatches: ['/games'], prominent: true },
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

    // The active tab is the one bright fill down here, so its contents take whichever ink
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

                    // The idle pill is a surface with type on it rather than a glyph
                    // floating in the bar, so it reads at full strength while the plain
                    // icons stay muted.
                    const ink = active
                        ? activeInk
                        : tab.prominent ? theme.colors.text : theme.colors.textMuted

                    return (
                        <Link key={tab.label} href={tab.href} asChild>
                            <Pressable
                                // Flattened: `Link asChild` clones this onto the anchor it renders, and a
                                // style array does not survive that merge.
                                style={StyleSheet.flatten([styles.item, tab.prominent && styles.itemProminent])}
                                accessibilityRole='link'
                                accessibilityLabel={tab.label}
                                accessibilityState={{ selected: active }}
                            >
                                {tab.prominent ? (
                                    <View style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}>
                                        <Feather name={tab.icon} size={19} color={ink} />

                                        <AppText style={[styles.pillLabel, { color: ink }]} numberOfLines={1}>
                                            {tab.label}
                                        </AppText>
                                    </View>
                                ) : (
                                    <View style={[styles.icon, active && styles.iconActive]}>
                                        <Feather name={tab.icon} size={21} color={ink} />
                                    </View>
                                )}
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
        paddingHorizontal: 6,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...(theme.scheme === 'dark'
            ? {}
            : { boxShadow: '3px 3px 0 0 #0F0D12, 0 14px 24px -14px rgba(15, 13, 18, 0.55)' })
    },
    /**
     * The three icon tabs split whatever the pill leaves, evenly. That even split is what
     * keeps the glyphs on a rhythm: each sits in the middle of its own third, so the last
     * one stays clear of the bar's rounded end, and none of them moves sideways when the
     * fill travels from one tab to another.
     */
    item: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center'
    },
    // Sized by its label instead, and never squeezed by the icons beside it.
    itemProminent: {
        // `flex: 1` on `item` also pins flexBasis to 0, so overriding grow and shrink alone
        // would leave a zero-width box and the pill would spill out of the bar.
        flexBasis: 'auto',
        flexGrow: 0,
        flexShrink: 0
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
    },
    pill: {
        height: 46,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 15,
        borderRadius: 999,
        borderWidth: theme.borderWidth
    },
    pillActive: {
        backgroundColor: theme.colors.primary,
        // Same rule as `iconActive`: the ring is light's, not dark's.
        borderColor: theme.scheme === 'dark' ? theme.colors.primary : theme.colors.border
    },
    pillIdle: {
        // A step off the bar in either direction — light drops to the page's own paper,
        // dark climbs a rung — so the pill is still an object when it isn't the fill.
        backgroundColor: theme.scheme === 'dark'
            ? theme.colors.backgroundSelected
            : theme.colors.background,
        borderColor: theme.colors.borderStrong
    },
    pillLabel: {
        fontSize: 13.5,
        fontWeight: 900
    }
}))
