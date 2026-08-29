import AppText from "@/components/text/AppText";
import Label from "@/components/text/Label";
import { Brand } from "@/constants/theme";
import { usePhrase, useT } from "@/features/i18n/LanguageContext";
import type { Phrase } from "@/features/i18n/keys";
import RefreshButton from "@/features/reconnect/components/RefreshButton";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    /** How many games are in the list underneath. Drawn as the badge. */
    count: number
    /** When that list came back, or null while there has never been an answer. */
    updated: Phrase | null
    onRefresh: () => void
    busy?: boolean
    disabled?: boolean
}

/**
 * The line that names the list of open games, counts it, and offers to fetch it again.
 *
 * The count is here rather than on the heading because it is the one number on the page
 * that changes: a player who left two games running and comes back to one wants to see
 * that at the top of the section, not to count rows.
 *
 * The timestamp is the plain phrase — "2 minutes ago" — because in a row that already
 * says "still running" and carries a refresh button, "updated" is the only thing it
 * could mean. A screen reader gets the whole sentence instead, since it hears this line
 * on its own rather than beside the button.
 */
export default function StillRunningHeader({
    count,
    updated,
    onRefresh,
    busy = false,
    disabled = false
}: Props) {
    const styles = useStyles();
    const t = useT();
    const phrase = usePhrase();

    return (
        <View style={styles.row}>
            <Label label={t('reconnect.stillRunning')} inline />

            <View style={styles.count}>
                <AppText style={styles.countText}>{count}</AppText>
            </View>

            <View style={styles.spacer} />

            {updated !== null && (
                <AppText
                    style={styles.updated}
                    numberOfLines={1}
                    accessibilityLabel={t('reconnect.updated', { time: phrase(updated) })}
                >
                    {phrase(updated)}
                </AppText>
            )}

            <RefreshButton onPress={onRefresh} busy={busy} disabled={disabled} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9
    },
    count: {
        width: 20,
        height: 20,
        flexShrink: 0,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.lemon : theme.colors.border,
        backgroundColor: theme.colors.lemon,
        alignItems: 'center',
        justifyContent: 'center'
    },
    countText: {
        fontSize: 10.5,
        fontWeight: 900,
        // Ink on lemon in both schemes: the fill is an identity rather than a surface.
        color: Brand.ink
    },
    spacer: {
        flex: 1
    },
    updated: {
        flexShrink: 1,
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    }
}))
