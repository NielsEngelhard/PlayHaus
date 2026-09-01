import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import InGameHeader from "@/components/ui/InGameHeader";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import RoleCard from "@/features/one-of-us/components/RoleCard";
import { faceOf, ROLES } from "@/features/one-of-us/roles";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { ScrollView, View } from "react-native";

interface Props {
    onDone: () => void
    onLeave: () => void
}

export default function RolesBriefingScreen({ onDone, onLeave }: Props) {
    const t = useT();
    const styles = useStyles();

    return (
        <View style={styles.page}>
            <InGameHeader
                onClose={onLeave}
                closeLabel={t('oneOfUs.play.close')}
                label={t('oneOfUs.play.briefing.title')}
            />

            <View style={styles.screen}>
                <AppText style={styles.intro}>
                    {t('oneOfUs.play.briefing.intro')}
                </AppText>

                <ScrollView
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                >
                    {ROLES.map(role => (
                        <RoleCard
                            key={role}
                            role={role}
                            label={t('oneOfUs.play.briefing.roleLabel')}
                            explanation={t(faceOf(role).briefing)}
                        />
                    ))}
                </ScrollView>

                <ActionButton
                    size="large"
                    icon="arrow-right"
                    text={t('oneOfUs.play.briefing.action')}
                    onPress={onDone}
                />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    page: {
        flex: 1,
        width: '100%',
        paddingHorizontal: Spacing.four,
        paddingBottom: Spacing.four
    },

    screen: {
        flex: 1,
        width: '100%',
        paddingTop: Spacing.four,
        gap: Spacing.three
    },

    intro: {
        fontSize: 15,
        fontWeight: 700,
        lineHeight: 15 * 1.45,
        color: theme.colors.textSecondary
    },

    list: {
        flex: 1
    },

    listContent: {
        gap: 10,
        paddingBottom: 4
    }
}))
