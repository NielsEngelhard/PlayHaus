import GameIndexPage from "@/components/layout/GameIndexPage";
import ModeCard from "@/components/ui/ModeCard";
import { PUBQUIZR } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand, Gradients, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import QuizSheet from "@/features/pubquizr/components/QuizSheet";
import QuizzerQuickActionsRow from "@/features/pubquizr/components/QuizzerQuickActionsRow";
import QuizzerRandomUnplayedQuizRow from "@/features/pubquizr/components/QuizzerRandomUnplayedQuizRow";
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
            // Laid over the slab rather than set beside the mark, so it can hang past the corner the way a sticker would.
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
                    navigationUrl={ROUTES.quizzerMultiDeviceGameSettings}
                />
            </View>

            <View style={styles.rows}>
                <QuizzerQuickActionsRow onBrowse={() => setBrowsing(true)} />

                <QuizzerRandomUnplayedQuizRow />
            </View>

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
        </GameIndexPage>
    )
}

const useStyles = createThemedStyles(() => ({
    modes: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 11
    },
    // A gap rather than margins on the rows, so a deck with nothing to deal leaves no space behind.
    rows: {
        marginTop: Spacing.three,
        gap: Spacing.three
    }
}))
