import AppText from '@/components/text/AppText';
import BottomSheet from '@/components/ui/BottomSheet';
import SimpleButton from '@/components/ui/SimpleButton';
import { Brand, FontSizes, Spacing } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useTheme } from '@/features/theme/ThemeContext';
import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';

/** Which way a multi device room is played, settled before the room exists. */
export type PlayMode = 'phones' | 'screen';

interface Props {
    onClose: () => void,
    onPick: (mode: PlayMode) => void,
    visible: boolean
}

// The question in front of a multi device room: does a big screen play along?
export default function PlayModeSheet({ onClose, onPick, visible }: Props) {
    const styles = useStyles();
    const t = useT();
    const theme = useTheme();

    return (
        <BottomSheet onClose={onClose} visible={visible}>
            <View style={styles.body}>
                <View style={styles.words}>
                    <AppText style={styles.title}>{t('pubquizr.index.playMode.title')}</AppText>

                    <AppText style={styles.message}>{t('pubquizr.index.playMode.message')}</AppText>
                </View>

                <View style={styles.options}>
                    <SimpleButton
                        description={t('pubquizr.index.playMode.phonesOnly.description')}
                        icon='smartphone'
                        note={t('pubquizr.index.playMode.phonesOnly.need')}
                        onPress={() => onPick('phones')}
                        tileColor={Brand.mint}
                        title={t('pubquizr.index.playMode.phonesOnly.title')}
                    />

                    <SimpleButton
                        description={t('pubquizr.index.playMode.withScreen.description')}
                        icon='monitor'
                        note={t('pubquizr.index.playMode.withScreen.need')}
                        onPress={() => onPick('screen')}
                        tileColor={Brand.lemon}
                        title={t('pubquizr.index.playMode.withScreen.title')}
                    />
                </View>

                <View style={styles.locked}>
                    <Feather name='lock' size={12} color={theme.colors.textMuted} />

                    <AppText style={styles.lockedText}>{t('pubquizr.index.playMode.locked')}</AppText>
                </View>
            </View>
        </BottomSheet>
    )
}

const useStyles = createThemedStyles(theme => ({
    body: {
        gap: Spacing.three,
        paddingTop: Spacing.two,
        paddingBottom: Spacing.two
    },

    words: {
        gap: Spacing.one
    },

    title: {
        fontSize: FontSizes.xl,
        fontWeight: 900,
        letterSpacing: -0.4,
        color: theme.colors.text
    },

    message: {
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.4,
        color: theme.colors.textSecondary
    },

    options: {
        gap: Spacing.two
    },

    locked: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.one
    },

    lockedText: {
        fontSize: FontSizes.xs,
        fontWeight: 700,
        color: theme.colors.textMuted
    }
}));
