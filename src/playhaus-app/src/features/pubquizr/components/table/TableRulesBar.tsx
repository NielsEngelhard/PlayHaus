import AppText from "@/components/text/AppText";
import { Brand, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import TableChrome from "@/features/pubquizr/components/table/TableChrome";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

const MARK = 26;
const RULE_SIZE = 15;
const LABEL_SIZE = 11;
const CODE_SIZE = 22;

interface Props {
    /** The code a latecomer joins on, which lives here all evening. */
    code: string
    /** Nothing is being played, so the screen's one control may draw full attention. */
    idle: boolean
    /** This round in one sentence, and empty in the waiting room. */
    rule: string
    scale: number
}

// The foot of the screen: what this round asks of the table, and how to get in on it.
export default function TableRulesBar({ code, idle, rule, scale }: Props) {
    const t = useT();
    const styles = useStyles();

    const mark = Math.round(MARK * scale);

    return (
        <View
            style={[
                styles.bar,
                {
                    gap: Math.round(Spacing.three * scale),
                    paddingVertical: Math.round(Spacing.two * scale),
                    paddingHorizontal: Math.round(Spacing.four * scale)
                }
            ]}
        >
            {rule !== '' && (
                <>
                    <View style={[styles.mark, { width: mark, height: mark, borderRadius: Math.round(Radii.full * scale) }]}>
                        <AppText style={[styles.markText, { fontSize: Math.round(LABEL_SIZE * scale) }]}>?</AppText>
                    </View>

                    <AppText style={[styles.rule, { fontSize: Math.round(RULE_SIZE * scale) }]} numberOfLines={2}>
                        {rule}
                    </AppText>
                </>
            )}

            <View style={[styles.join, { gap: Math.round(Spacing.two * scale) }]}>
                <AppText style={[styles.label, { fontSize: Math.round(LABEL_SIZE * scale) }]}>
                    {t('pubquizr.table.playAlong')}
                </AppText>

                <AppText style={[styles.code, { fontSize: Math.round(CODE_SIZE * scale) }]}>{code}</AppText>

                <TableChrome idle={idle} scale={scale} />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    bar: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: theme.borderWidth,
        borderTopColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary
    },

    // Lemon in both schemes, so the ink on it reads the same everywhere.
    mark: {
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },

    markText: {
        fontWeight: 900,
        color: Brand.ink
    },

    rule: {
        flex: 1,
        minWidth: 0,
        fontWeight: 700,
        color: theme.colors.textSecondary
    },

    join: {
        marginLeft: 'auto',
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center'
    },

    label: {
        fontWeight: 900,
        letterSpacing: 1.8,
        textTransform: 'uppercase',
        color: theme.colors.textMuted
    },

    code: {
        fontWeight: 900,
        letterSpacing: 2,
        color: theme.colors.text
    }
}))
