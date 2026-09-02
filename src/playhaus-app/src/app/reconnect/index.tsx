import LoadingPage from "@/components/layout/LoadingPage";
import BigIntroText from "@/components/text/BigIntroText";
import Label from "@/components/text/Label";
import InlineNotification from "@/components/ui/InlineNotification";
import { useT } from "@/features/i18n/LanguageContext";
import JoinCodeCard from "@/features/join/components/JoinCodeCard";
import NoGamesCard from "@/features/reconnect/components/NoGamesCard";
import ReconnectableGameCard from "@/features/reconnect/components/ReconnectableGameCard";
import RefreshButton from "@/features/reconnect/components/RefreshButton";
import StillRunningHeader from "@/features/reconnect/components/StillRunningHeader";
import { kindOf, startedAgo } from "@/features/reconnect/game-kinds";
import { useReconnectableGames } from "@/features/reconnect/useReconnectableGames";
import { useTheme } from "@/features/theme/ThemeContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useCooldown } from "@/hooks/useCooldown";
import { View } from "react-native";

const REFRESH_COOLDOWN_MS = 5000;

export default function ReconnectPage() {
    const theme = useTheme();
    const styles = useStyles();
    const t = useT();

    const { games, loading, refreshing, error, loadedAt, refresh } = useReconnectableGames();
    const [coolingDown, startCooldown] = useCooldown(REFRESH_COOLDOWN_MS);

    const updated = loadedAt === null ? null : startedAgo(loadedAt);
    const blocked = loading || refreshing || coolingDown;

    function reload() {
        refresh();
        startCooldown();
    }

    if (games.length > 0) {
        return (
            <View style={styles.container}>
                <BigIntroText
                    title={t('reconnect.hero.resume.title')}
                    accent={t('reconnect.hero.resume.accent')}
                />

                <View style={styles.section}>
                    <StillRunningHeader
                        count={games.length}
                        updated={updated}
                        onRefresh={reload}
                        busy={refreshing}
                        disabled={blocked}
                    />

                    <View style={styles.list}>
                        {games.map(game => {
                            const kind = kindOf(game);
                            if (kind === undefined) return null;

                            return <ReconnectableGameCard key={game.id} game={game} kind={kind} />;
                        })}
                    </View>
                </View>

                <Label label={t('reconnect.orJoin')} rule='around' />

                <JoinCodeCard />
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <BigIntroText
                title={t('reconnect.hero.title')}
                accent={t('reconnect.hero.accent')}
            />

            <JoinCodeCard />

            {/* Only an answered load may say there is nothing running. Until then the rule
                carries the section's own name, so the page does not announce an absence
                it has not established yet. */}
            <Label
                label={loading || error !== null ? t('reconnect.stillRunning') : t('reconnect.nothingRunning')}
                rule='around'
            />

            {loading ? (
                <LoadingPage message={t('reconnect.loading')} />
            ) : error !== null ? (
                <InlineNotification
                    icon='alert-triangle'
                    color={theme.colors.blush}
                    title={t('common.failed')}
                    message={t(error)}
                >
                    <RefreshButton
                        variant='pill'
                        onPress={reload}
                        busy={refreshing}
                        disabled={blocked}
                    />
                </InlineNotification>
            ) : (
                <NoGamesCard onRefresh={reload} busy={refreshing} disabled={blocked} />
            )}
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    container: {
        width: '100%',
        flexDirection: 'column',
        gap: 18
    },
    // The header names the list it is standing on, so the two sit closer to each other
    // than either does to the blocks above and below.
    section: {
        gap: 11
    },
    list: {
        gap: 10
    }
}))
