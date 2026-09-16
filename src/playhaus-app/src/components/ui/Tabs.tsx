import AppText from "@/components/text/AppText"
import AnimatedPressable from "@/components/ui/AnimatedPressable"
import { usePressPop } from "@/components/ui/usePressPop"
import { Brand } from "@/constants/theme"
import { createThemedStyles } from "@/features/theme/createThemedStyles"
import { View } from "react-native"

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
            {tabs.map(tab => (
                <TabItem
                    key={tab}
                    active={tab === activeTab}
                    label={getLabel?.(tab) ?? tab}
                    onPress={() => onClick(tab)}
                />
            ))}
        </View>
    )
}

interface TabItemProps {
    active: boolean
    label: string
    onPress: () => void
}

function TabItem({ active, label, onPress }: TabItemProps) {
    const styles = useStyles();
    const pop = usePressPop();

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={pop.onPressIn}
            onPressOut={pop.onPressOut}
            onHoverIn={pop.onHoverIn}
            onHoverOut={pop.onHoverOut}
            accessibilityRole="tab"
            accessibilityLabel={label}
            aria-selected={active}
            style={[styles.tab, active && styles.tabActive, pop.animatedStyle]}
        >
            <AppText style={active ? styles.labelActive : styles.label}>
                {label}
            </AppText>
        </AnimatedPressable>
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
