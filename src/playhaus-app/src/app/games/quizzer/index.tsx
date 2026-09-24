import GameIndexPage from "@/components/layout/GameIndexPage";
import ModeCard from "@/components/ui/ModeCard";
import SimpleButton from "@/components/ui/SimpleButton";
import { PUBQUIZR } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand, Gradients, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import PlayModeSheet, { type PlayMode } from "@/features/pubquizr/components/PlayModeSheet";
import QuizLibraryStack from "@/features/pubquizr/components/QuizLibraryStack";
import QuizSheet from "@/features/pubquizr/components/QuizSheet";
import WeeklyStamp from "@/features/pubquizr/components/WeeklyStamp";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useRouter, type RelativePathString } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

export default function QuizzerIndexPage() {
    const styles = useStyles();
    const t = useT();
    const router = useRouter();

    const [browsing, setBrowsing] = useState(false);
    const [choosing, setChoosing] = useState(false);

    // The mode is fixed when the room opens, so it is asked before there is a room.
    function open(mode: PlayMode) {
        setChoosing(false);
        router.push((mode === 'screen' ? ROUTES.quizzerScreenRoom : ROUTES.quizzerMultiDeviceGameSettings) as RelativePathString);
    }

    return (
        <GameIndexPage
            name={PUBQUIZR.name}
            icon={PUBQUIZR.icon}
            gradient={PUBQUIZR.gradient}
            accentInk={PUBQUIZR.accentInk}
            description={t('pubquizr.index.description')}
            minMaxPlayers={PUBQUIZR.minMaxPlayersIndicator}
            deviceMode={PUBQUIZR.deviceMode}
            durationInMinutes={PUBQUIZR.minutesAverage}
            // Laid over the slab rather than set beside the mark, so it can hang past the corner the way a sticker would.
            stamp={
                <WeeklyStamp
                    letters={t('pubquizr.index.weekly.weekday')}
                    caption={t('pubquizr.index.weekly.promise')}
                />
            }
        >
            <View style={styles.container}>
                <View style={styles.modes}>
                    <ModeCard
                        solid
                        watermark="1"
                        icon='smartphone'
                        gradient={Gradients.lemon}
                        iconInk={Brand.ink}
                        highlight={0.5}
                        onFill="ink"
                        title={t('pubquizr.index.oneDevice.title')}
                        description={t('pubquizr.index.oneDevice.description')}
                        action={t('pubquizr.index.oneDevice.action')}
                        navigationUrl={ROUTES.quizzerOneDeviceGameSettings}
                    />

                    <ModeCard
                        solid
                        watermark="10"
                        icon='monitor'
                        gradient={PUBQUIZR.gradient}
                        iconInk={Brand.ink}
                        highlight={0.35}
                        onFill="paper"
                        title={t('pubquizr.index.multiDevice.title')}
                        description={t('pubquizr.index.multiDevice.description')}
                        action={t('pubquizr.index.multiDevice.action')}
                        onPress={() => setChoosing(true)}
                    />
                </View>

                <SimpleButton
                    action={t('pubquizr.index.centralScreen.action')}
                    description={t('pubquizr.index.centralScreen.description')}
                    icon='tv'
                    // The room opens with the screen switched on, so the host never has to find the toggle.
                    onPress={() => router.push(ROUTES.quizzerScreenRoom as RelativePathString)}
                    title={t('pubquizr.index.centralScreen.title')}
                />
            </View>

            <PlayModeSheet onClose={() => setChoosing(false)} onPick={open} visible={choosing} />

            {/* The rows in here go where the rows on the page go, but by hand. */}
            <QuizSheet
                visible={browsing}
                onClose={() => setBrowsing(false)}
                onOpen={quiz => {
                    setBrowsing(false);
                    router.push({
                        pathname: ROUTES.quizzerOneDeviceGameSettings as RelativePathString,
                        params: { quizId: quiz.id }
                    });
                }}
            />

            <QuizLibraryStack onPress={() => setBrowsing(true)} />
        </GameIndexPage>
    )
}

const useStyles = createThemedStyles(() => ({
    container: {
        gap: 11
    },

    modes: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 11
    },
}))
