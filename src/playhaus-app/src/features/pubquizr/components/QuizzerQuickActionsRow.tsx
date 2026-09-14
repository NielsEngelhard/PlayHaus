import SmallButton from "@/components/ui/SmallButton";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useRouter, type RelativePathString } from "expo-router";
import { View } from "react-native";

interface Props {
    onBrowse: () => void
}

// The two things to do from the index page that are not a way to play. Holds no quiz data, so it paints with the mode cards.
export default function QuizzerQuickActionsRow({ onBrowse }: Props) {
    const styles = useStyles();
    const t = useT();
    const router = useRouter();

    return (
        <View style={styles.row}>
            <SmallButton
                icon="monitor"
                title={t('pubquizr.index.tableScreen.title')}
                subtitle={t('pubquizr.index.tableScreen.subtitle')}
                onPress={() => router.push(ROUTES.quizzerTableDoor as RelativePathString)}
            />

            <SmallButton
                icon="grid"
                title={t('pubquizr.index.allQuizzes.title')}
                subtitle={t('pubquizr.index.allQuizzes.subtitle')}
                onPress={onBrowse}
            />
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    row: {
        flexDirection: 'row',
        gap: 11
    }
}));
