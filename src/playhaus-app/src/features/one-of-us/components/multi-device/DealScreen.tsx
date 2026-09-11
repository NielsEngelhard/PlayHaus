import AppText from '@/components/text/AppText';
import { Spacing } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import PinButton from '@/features/one-of-us/components/PinButton';
import WordNote from '@/features/one-of-us/components/WordNote';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useState } from 'react';
import { View } from 'react-native';

interface Props {
    /** The one thing a living player is told about themselves. */
    amNitwit: boolean
    onDone: () => void
    /** This player's own line, and empty for the nitwit. */
    prompt: string
}

// The one beat before the game proper: the briefje you drew, once.
export default function DealScreen({ amNitwit, onDone, prompt }: Props) {
    const t = useT();
    const styles = useStyles();

    const [seen, setSeen] = useState(false);

    return (
        <View style={styles.screen}>
            <AppText style={styles.title}>{t('oneOfUs.multiDevice.play.deal.title')}</AppText>

            {/* Still covered until it is tapped: everybody is in one room, so a shoulder is the threat rather than the wire. */}
            <View style={styles.middle}>
                <WordNote
                    blurb={t(amNitwit
                        ? 'oneOfUs.play.note.blurbBlank'
                        : 'oneOfUs.play.note.blurb')}
                    coverHint={t('oneOfUs.play.note.coverHint')}
                    coverLabel={t('oneOfUs.play.note.cover')}
                    label={t('oneOfUs.play.note.label')}
                    onReveal={() => setSeen(true)}
                    whenBlank={t('oneOfUs.play.reveal.noWord')}
                    word={prompt === '' ? null : prompt}
                />
            </View>

            {seen && (
                <PinButton
                    icon='arrow-right'
                    text={t('oneOfUs.multiDevice.play.deal.action')}
                    onPress={onDone}
                />
            )}
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%',
        paddingHorizontal: Spacing.four,
        paddingTop: Spacing.three,
        paddingBottom: Spacing.four,
        gap: Spacing.two
    },

    title: {
        fontSize: 21,
        fontWeight: 900,
        letterSpacing: -0.8,
        lineHeight: 21 * 1.1,
        color: theme.colors.text
    },

    // The stack sits in the middle of whatever room the title and the button leave.
    middle: {
        flex: 1,
        width: '100%',
        justifyContent: 'center'
    }
}))
