import LoadingPage from "@/components/layout/LoadingPage";
import AppText from "@/components/text/AppText";
import BigIntroText from "@/components/text/BigIntroText";
import InlineNotification from "@/components/ui/InlineNotification";
import { usePhrase, useT } from "@/features/i18n/LanguageContext";
import JoinCodeCard from "@/features/reconnect/components/JoinCodeCard";
import ReconnectableGameCard from "@/features/reconnect/components/ReconnectableGameCard";
import RefreshBar from "@/features/reconnect/components/RefreshBar";
import { kindOf, startedAgo } from "@/features/reconnect/game-kinds";
import { useReconnectableGames } from "@/features/reconnect/useReconnectableGames";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useCooldown } from "@/hooks/useCooldown";
import Feather from "@expo/vector-icons/Feather";
import { View } from "react-native";

const REFRESH_COOLDOWN_MS = 5000;

export default function ReconnectPage() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();
    const phrase = usePhrase();

    const { games, loading, refreshing, error, loadedAt, refresh } = useReconnectableGames();
    const [coolingDown, startCooldown] = useCooldown(REFRESH_COOLDOWN_MS);

    const updated = loadedAt === null ? null : startedAgo(loadedAt);

    return (
        <View style={styles.container}>
            <View style={styles.hero}>
                <BigIntroText
                    title={t(`reconnect.hero.title`)}
                    accent={t(`reconnect.hero.accent`)}
                />                

                {updated !== null && (
                    <View style={styles.updated}>
                        <Feather name='refresh-cw' size={12} color={theme.colors.textMuted} />

                        <AppText style={styles.updatedText}>
                            {updated !== null && t('reconnect.updated', { time: phrase(updated) })}
                        </AppText>
                    </View>
                )}
            </View>

            <JoinCodeCard />

            {loading ? (
                <LoadingPage message={t('reconnect.loading')} />
            ) : error !== null ? (
                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('common.failed')}
                    message={t(error)}
                />
            ) : games.length === 0 ? (
                // <NoGamesCard />
                <AppText>{t('reconnect.noGames')}</AppText>
            ) : (
                <View style={styles.list}>
                    {games.map(game => {
                        const kind = kindOf(game);
                        if (kind === undefined) return null;

                        return <ReconnectableGameCard key={game.id} game={game} kind={kind} />;
                    })}
                </View>
            )}

            <RefreshBar
                onPress={() => {
                    refresh();
                    startCooldown();
                }}
                busy={refreshing}
                disabled={loading || refreshing || coolingDown}
            />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        width: '100%',
        flexDirection: 'column',
        gap: 20
    },
    hero: {
        marginTop: 8
    },
    description: {
        marginTop: 10,
        maxWidth: 290,
        fontSize: 14,
        lineHeight: 14 * 1.5,
        color: theme.colors.textSecondary
    },
    updated: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7
    },
    updatedText: {
        fontSize: 11.5,
        fontWeight: 700,
        color: theme.colors.textMuted
    },
    list: {
        gap: 12
    }
}))
