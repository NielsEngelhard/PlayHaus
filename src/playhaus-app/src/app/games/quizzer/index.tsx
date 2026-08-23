import Label from "@/components/text/Label";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import { PUBQUIZR_NAME } from "@/constants/games";
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
        <View style={styles.container}>
            {/* The stamp is laid over the hero rather than set beside it, so it can
                hang past the top edge the way a sticker would. The text is held to a
                column narrow enough to pass underneath it. */}
            <View style={styles.hero}>
                <View style={styles.heroText}>
                    <SimpleTextHero
                        title={PUBQUIZR_NAME}
                        description={t('pubquizr.index.description')}
                    />
                </View>

                <WeeklyStamp
                    letters={t('pubquizr.index.weekly.weekday')}
                    caption={t('pubquizr.index.weekly.promise')}
                    style={styles.stamp}
                />
            </View>

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
                    gradient={Gradients.secondary}
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

            <View>
                <Label label={t('pubquizr.index.list.label')} />
                <QuizList />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    container: {
        width: '100%',
        gap: Spacing.three
    },
    hero: {
        width: '100%'
    },
    // The stamp is roughly 100 wide and the design lets the copy run right up to it,
    // so the column stops where the sticker starts.
    heroText: {
        maxWidth: 240
    },
    stamp: {
        position: 'absolute',
        right: 0,
        top: -4
    },
    modes: {
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 11
    }
}))
