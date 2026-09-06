import GameIndexPage from "@/components/layout/GameIndexPage";
import ModeCard from "@/components/ui/ModeCard";
import TextButton from "@/components/ui/TextButton";
import { PUBQUIZR } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand, Gradients, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import NewQuizCard from "@/features/pubquizr/components/NewQuizCard";
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
            // Laid over the slab rather than set beside the mark, so it can hang past
            // the corner the way a sticker would.
            stamp={
                <WeeklyStamp
                    letters={t('pubquizr.index.weekly.weekday')}
                    caption={t('pubquizr.index.weekly.promise')}
                />
            }
        >
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
                    icon='users'
                    gradient={PUBQUIZR.gradient}
                    iconInk={Brand.ink}
                    highlight={0.35}
                    onFill="paper"
                    title={t('pubquizr.index.multiDevice.title')}
                    description={t('pubquizr.index.multiDevice.description')}
                    action={t('pubquizr.index.multiDevice.action')}
                    isDisabled={true}
                />
            </View>

            <View style={styles.list}>
                <NewQuizCard />

                <TextButton
                    text={t('pubquizr.index.list.seeAll')}
                    onPress={() => setBrowsing(true)}
                    variant="neutral"
                    fullWidth
                />
            </View>

            {/*
              * The rows in here go where the rows on the page go, but by hand: the sheet
              * is a `Modal`, and on native that is a root of its own, so a route pushed
              * from under one would leave it hanging over the setup screen it opened.
              * Closed first, then pushed.
              */}
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
        </GameIndexPage>
    )
}

const useStyles = createThemedStyles(() => ({
    modes: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 11
    },
    list: {
        marginTop: Spacing.three,
        gap: Spacing.three
    }
}))
