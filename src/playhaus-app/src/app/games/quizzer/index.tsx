import GameIndexPage from "@/components/layout/GameIndexPage";
import Label from "@/components/text/Label";
import { PUBQUIZR } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { Brand, Gradients, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import ModeCard from "@/features/league-of-letters/components/ModeCard";
import QuizList from "@/features/pubquizr/components/QuizList";
import WeeklyStamp from "@/features/pubquizr/components/WeeklyStamp";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { View } from "react-native";

export default function QuizzerIndexPage() {
    const styles = useStyles();
    const t = useT();

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
                    // Nothing to navigate to yet, and a card that answers a press with
                    // nothing at all is worse than one that says it is not ready.
                    isDisabled={true}
                />
            </View>

            <View style={styles.list}>
                <Label label={t('pubquizr.index.list.label')} />
                <QuizList />
            </View>
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
        marginTop: Spacing.three
    }
}))
