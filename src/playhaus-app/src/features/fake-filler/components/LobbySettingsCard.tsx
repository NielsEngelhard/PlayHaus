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
    maxAnswersPerPlayer: number,
    minAnswersPerPlayer: number,
    settings: FFLobbySettings,
    onChange: (settings: FFLobbySettings) => void
}

/** In the order they are offered. `facts` is the server's default, so it leads. */
const MODES: readonly FFGameMode[] = ['facts', 'creative'];

// Every count the server will take, which is a handful of buttons rather than a stepper.
const countsBetween = (min: number, max: number): number[] => (
    Array.from({ length: Math.max(max - min + 1, 1) }, (_, index) => min + index)
);

// What the host is about to start a game on, folded away until they want it.
export default function LobbySettingsCard({ maxAnswersPerPlayer, minAnswersPerPlayer, settings, onChange }: Props) {
    const t = useT();
    const styles = useStyles();

    const answerCounts = countsBetween(minAnswersPerPlayer, maxAnswersPerPlayer);

    const modeLabel = (mode: FFGameMode) => (
        mode === 'facts' ? t('fakeFiller.lobby.modeFacts') : t('fakeFiller.lobby.modeCreative')
    );

    return (
        <CollapsibleCard
            title={t('fakeFiller.lobby.settingsTitle')}
            // The language is the only half not translated.
            summary={`${modeLabel(settings.gameMode)} · ${t('fakeFiller.lobby.answersSummary', { amount: settings.answersPerPlayer })} · ${languageByCode(settings.locale).label}`}
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

            <View>
                <HorizontalButtonSelect
                    variant='inline'
                    label={t('fakeFiller.lobby.answersPerPlayer')}
                    options={answerCounts}
                    value={settings.answersPerPlayer}
                    getLabel={count => String(count)}
                    onChange={answersPerPlayer => onChange({ ...settings, answersPerPlayer })}
                />

                <AppText style={styles.hint}>
                    {t('fakeFiller.lobby.answersPerPlayerHint')}
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
