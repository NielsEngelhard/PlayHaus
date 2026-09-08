import AppText from "@/components/text/AppText"
import { Brand } from "@/constants/theme"
import { createThemedStyles } from "@/features/theme/createThemedStyles"
import { Pressable, View } from "react-native"

interface Props<T extends string> {
    activeTab: T
    tabs: readonly T[]
    onClick: (tab: T) => void
    // How a tab is spelled on screen.
    getLabel?: (tab: T) => string
}

const TAB_HEIGHT = 34;

// One row, one choice: a track holding a pill per option, with the chosen one filled in.
export default function Tabs<T extends string>({ activeTab, tabs, onClick, getLabel }: Props<T>) {
    const styles = useStyles();

    return (
        <View style={styles.track} accessibilityRole="tablist">
            {tabs.map(tab => {
                const active = tab === activeTab;
                const label = getLabel?.(tab) ?? tab;

                return (
                    <Pressable
                        key={tab}
                        onPress={() => onClick(tab)}
                        accessibilityRole="tab"
                        accessibilityLabel={label}
                        aria-selected={active}
                        style={[styles.tab, active && styles.tabActive]}
                    >
                        <AppText style={active ? styles.labelActive : styles.label}>
                            {label}
                        </AppText>
                    </Pressable>
                )
            })}
        </View>
    )
}

const useStyles = createThemedStyles(theme => {
    const dark = theme.scheme === 'dark';

    return {
        track: {
            flexDirection: 'row',
            gap: 5,
            padding: 5,
            borderRadius: 16,
            borderWidth: theme.borderWidth,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.backgroundSecondary,
            ...theme.shadows.hardSmall
        },

        tab: {
            flex: 1,
            height: TAB_HEIGHT,
            borderRadius: 11,
            alignItems: 'center',
            justifyContent: 'center'
        },

        // The two schemes fill this with opposite things for the same reason.
        tabActive: {
            backgroundColor: dark ? theme.colors.lemon : theme.colors.text
        },

        label: {
            fontSize: 12.5,
            fontWeight: 800,
            color: theme.colors.textSecondary
        },

        labelActive: {
            fontSize: 12.5,
            fontWeight: 900,
            color: dark ? Brand.ink : Brand.textOnAccent
        }
    }
})
