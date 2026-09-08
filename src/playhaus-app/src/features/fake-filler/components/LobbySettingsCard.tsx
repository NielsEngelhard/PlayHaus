import type { FFGameMode, FFLobbySettings } from "@/api/calls/fake-filler-lobby";
import AppText from "@/components/text/AppText";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import HorizontalButtonSelect from "@/components/ui/HorizontalButtonSelect";
import LanguageSelect from "@/components/ui/LanguageSelect";
import { languageByCode } from "@/constants/languages";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

interface Props {
    settings: FFLobbySettings,
    onChange: (settings: FFLobbySettings) => void
}

/** In the order they are offered. `facts` is the server's default, so it leads. */
const MODES: readonly FFGameMode[] = ['facts', 'creative'];

// What the host is about to start a game on, folded away until they want it.
export default function LobbySettingsCard({ settings, onChange }: Props) {
    const t = useT();
    const styles = useStyles();

    const modeLabel = (mode: FFGameMode) => (
        mode === 'facts' ? t('fakeFiller.lobby.modeFacts') : t('fakeFiller.lobby.modeCreative')
    );

    return (
        <CollapsibleCard
            title={t('fakeFiller.lobby.settingsTitle')}
            // The language is the only half not translated.
            summary={`${modeLabel(settings.gameMode)} · ${languageByCode(settings.locale).label}`}
        >
            {/* One child per ruled section, the same shape `SettingsPageBase` uses. */}
            <View>
                <HorizontalButtonSelect
                    variant='inline'
                    label={t('fakeFiller.lobby.mode')}
                    options={MODES}
                    value={settings.gameMode}
                    getLabel={modeLabel}
                    onChange={gameMode => onChange({ ...settings, gameMode })}
                />

                <AppText style={styles.hint}>
                    {settings.gameMode === 'facts'
                        ? t('fakeFiller.lobby.modeFactsHint')
                        : t('fakeFiller.lobby.modeCreativeHint')}
                </AppText>
            </View>

            <LanguageSelect
                variant='row'
                value={settings.locale}
                onChange={locale => onChange({ ...settings, locale })}
            />
        </CollapsibleCard>
    )
}

const useStyles = createThemedStyles(theme => ({
    hint: {
        marginTop: Spacing.two,
        fontSize: 12,
        lineHeight: 12 * 1.45,
        fontWeight: 600,
        color: theme.colors.textMuted
    }
}))
