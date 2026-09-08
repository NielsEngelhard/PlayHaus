import AppText from "@/components/text/AppText";
import Label from "@/components/text/Label";
import Toggle from "@/components/ui/Toggle";
import { Brand, Spacing } from "@/constants/theme";
import type { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import { OneOfUsRole } from "@/features/one-of-us/models";
import { canDisableRole, TOGGLEABLE_ROLES } from "@/features/one-of-us/oou-settings";
import { faceOf } from "@/features/one-of-us/roles";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

interface Props {
    /** Which imposter roles are switched on. */
    enabled: OneOfUsRole[]
    onToggle: (role: OneOfUsRole) => void
    /** Locks the whole group, e.g. while the game is being created. */
    disabled?: boolean
}

// What a role's switch says about itself, which is not what its card says in the game.
const SETTING_NOTES: Partial<Record<OneOfUsRole, TranslationKey>> = {
    [OneOfUsRole.Imposter]: 'oneOfUs.settings.roles.imposter.description',
    [OneOfUsRole.Nitwit]: 'oneOfUs.settings.roles.nitwit.description'
}

// What one switch says about its role, falling back to what the role says in the game.
function noteOf(role: OneOfUsRole): TranslationKey {
    return SETTING_NOTES[role] ?? faceOf(role).explanation
}

// Which roles this table is willing to be dealt.
export default function RolesSettingRow({ enabled, onToggle, disabled = false }: Props) {
    const t = useT();
    const styles = useStyles();

    // Written out rather than assumed to be all of them.
    const locked = enabled.length === 1;

    return (
        <View>
            <Label
                label={t('oneOfUs.settings.roles.title')}
                value={t('oneOfUs.settings.roles.count', {
                    enabled: enabled.length,
                    total: TOGGLEABLE_ROLES.length
                })}
            />

            <AppText style={styles.intro}>
                {t('oneOfUs.settings.roles.description')}
            </AppText>

            <View style={styles.list}>
                {TOGGLEABLE_ROLES.map(role => {
                    const on = enabled.includes(role);
                    const face = faceOf(role);

                    return (
                        <View key={role} style={styles.row}>
                            {/* The role's own colour, as the disc it wears on its card in the game. */}
                            <View style={[styles.badge, { backgroundColor: face.fill }]}>
                                <Feather name={face.icon} size={15} color={Brand.ink} />
                            </View>

                            <View style={styles.text}>
                                <AppText style={styles.name}>{t(face.name)}</AppText>

                                <AppText style={styles.note}>{t(noteOf(role))}</AppText>
                            </View>

                            <Toggle
                                value={on}
                                onValueChange={() => onToggle(role)}
                                label={t(face.name)}
                                disabled={disabled || !canDisableRole(enabled, role)}
                            />
                        </View>
                    )
                })}
            </View>

            {locked && (
                <AppText style={styles.locked}>
                    {t('oneOfUs.settings.roles.locked')}
                </AppText>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // The same size and colour as `SettingsPageBase`'s own intro.
    intro: {
        marginTop: -Spacing.half,
        fontSize: 12.5,
        fontWeight: 500,
        lineHeight: 12.5 * 1.4,
        color: theme.colors.textMuted
    },

    list: {
        marginTop: Spacing.three,
        gap: Spacing.three
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },

    badge: {
        width: 32,
        height: 32,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink
    },

    text: {
        flex: 1,
        minWidth: 0
    },

    // The same two sizes `ToggleRow` sets a setting's name and line at.
    name: {
        fontSize: 15,
        lineHeight: 15 * 1.2,
        fontWeight: 800,
        color: theme.colors.text
    },

    note: {
        marginTop: 3,
        fontSize: 12.5,
        lineHeight: 12.5 * 1.4,
        fontWeight: 500,
        color: theme.colors.textMuted
    },

    locked: {
        marginTop: Spacing.three,
        fontSize: 12,
        fontWeight: 600,
        color: theme.colors.textFaint
    }
}))
