import { getGamesPlayedStats, type GamesPlayedStats } from "@/api/calls/global-stats";
import LoadingPage from "@/components/layout/LoadingPage";
import AppText from "@/components/text/AppText";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import Card from "@/components/ui/Card";
import InlineNotification from "@/components/ui/InlineNotification";
import TextButton from "@/components/ui/TextButton";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";

const ROWS: [label: string, key: keyof GamesPlayedStats][] = [
    ['lol_wod_played', 'lolWodPlayed'],
    ['lol_solo_played', 'lolSoloPlayed'],
    ['lol_mp_played', 'lolMpPlayed'],
    ['qz_singledevice_played', 'qzSingleDevicePlayed'],
    ['qz_multidevice_played', 'qzMultiDevicePlayed'],
    ['qz_multidevice_withhostscreen_played', 'qzMultiDeviceWithHostScreenPlayed'],
    ['oou_single_device_played', 'oouSingleDevicePlayed'],
    ['oou_multidevice_played', 'oouMultiDevicePlayed'],
    ['ff_played', 'ffPlayed'],
    ['ww_played', 'wwPlayed']
];

export default function GlobalStatsPage() {
    const styles = useStyles();
    const t = useT();

    const [stats, setStats] = useState<GamesPlayedStats | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    const retry = useCallback(() => {
        setFailed(false);
        setAttempt(n => n + 1);
    }, []);

    useEffect(() => {
        let cancelled = false;

        getGamesPlayedStats().then(
            result => { if (!cancelled) setStats(result); },
            () => { if (!cancelled) setFailed(true); }
        );

        return () => { cancelled = true };
    }, [attempt]);

    return (
        <View style={styles.container}>
            <SimpleTextHero title={t('globalStats.title')} />

            {failed && (
                <InlineNotification icon='alert-triangle' title={t('common.failed')} message={t('globalStats.failed')}>
                    <TextButton text={t('common.retry')} onPress={retry} />
                </InlineNotification>
            )}

            {!failed && !stats && <LoadingPage message={t('globalStats.loading')} />}

            {stats && (
                <Card>
                    {ROWS.map(([label, key]) => (
                        <View key={key} style={styles.row}>
                            <AppText style={styles.label}>{label}</AppText>
                            <AppText style={styles.value}>{stats[key]}</AppText>
                        </View>
                    ))}
                </Card>
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        width: '100%',
        gap: Spacing.four
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.three,
        paddingVertical: Spacing.two,
        borderBottomWidth: theme.borderWidth,
        borderBottomColor: theme.colors.border
    },
    label: {
        flexShrink: 1,
        fontSize: FontSizes.sm,
        color: theme.colors.textSecondary
    },
    value: {
        fontSize: FontSizes.sm,
        fontWeight: '700',
        color: theme.colors.text
    }
}))
