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

/**
 * What a role's switch says about itself, which is not what its card says in the game.
 *
 * `ROLE_FACES` already carries a name and an explanation, and the name is reused here —
 * one role should not be called two things in one app. The explanation is not: in the
 * game it is addressed to the one person holding the phone and written to be read in the
 * ten seconds before they act on it, where here it is addressed to whoever is setting the
 * table up and has to answer a different question — what changes about the game if this
 * is off. So the descriptions live beside the switches rather than in `roles.ts`.
 */
const SETTING_NOTES: Partial<Record<OneOfUsRole, TranslationKey>> = {
    [OneOfUsRole.Imposter]: 'oneOfUs.settings.roles.imposter.description',
    [OneOfUsRole.Nitwit]: 'oneOfUs.settings.roles.nitwit.description'
}

/**
 * What one switch says about its role, falling back to what the role says in the game.
 *
 * Partial rather than complete, because the civilian has no switch and giving it a line
 * here would be writing copy for a control that does not exist. The fallback is for a
 * role added to `TOGGLEABLE_ROLES` before somebody has written its setting line: a
 * sentence from the game is the wrong voice, but a blank space is worse.
 */
function noteOf(role: OneOfUsRole): TranslationKey {
    return SETTING_NOTES[role] ?? faceOf(role).explanation
}

/**
 * Which roles this table is willing to be dealt.
 *
 * Only the imposter side is switchable — see `TOGGLEABLE_ROLES` for why the civilian and
 * the mayor are not — so the row is a short list of the liars rather than a picture of
 * the whole table. Every role left on *can* be dealt; how many of each still comes from
 * the table's size, which is the server's business and deliberately not a setting.
 *
 * The last switch still standing is drawn disabled rather than left live and rejected on
 * submit. A table with no imposters in it is not a gentler game, it is a game that cannot
 * end: the civilians only ever win by voting out the last liar. That is worth saying in
 * the group's own footnote, because a switch that will not move and does not say why
 * reads as a bug.
 */
export default function RolesSettingRow({ enabled, onToggle, disabled = false }: Props) {
    const t = useT();
    const styles = useStyles();

    // Written out rather than assumed to be all of them: the last one on is the one that
    // cannot be turned off, and the footnote below only belongs on a group in that state.
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
                            {/* The role's own colour, as the disc it wears on its card in
                                the game. Both fills are fixed in either scheme, so the
                                glyph on top of one is inked rather than themed. */}
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
    // The same size and colour as `SettingsPageBase`'s own intro, so the line under the
    // section label reads as part of the page's voice rather than as a notice.
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

    // The same two sizes `ToggleRow` sets a setting's name and line at, because that is
    // what the row under this one is and the two have to read as the same kind of thing.
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
