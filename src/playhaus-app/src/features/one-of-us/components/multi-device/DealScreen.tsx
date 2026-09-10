import AppText from '@/components/text/AppText';
import ActionButton from '@/components/ui/ActionButton';
import AnswerReveal from '@/components/ui/AnswerReveal';
import InGameHeader from '@/components/ui/InGameHeader';
import { Spacing } from '@/constants/theme';
import { useT } from '@/features/i18n/LanguageContext';
import RoleCard from '@/features/one-of-us/components/RoleCard';
import RolesBriefingScreen from '@/features/one-of-us/components/RolesBriefingScreen';
import { OneOfUsRole } from '@/features/one-of-us/models';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { useState } from 'react';
import { View } from 'react-native';

interface Props {
    /** The one thing a living player is told about themselves. */
    amNitwit: boolean
    onDone: () => void
    onLeave: () => void
    /** This player's own line, and empty for the nitwit. */
    prompt: string
}

// The one beat before the game proper: the roles, then your own prompt, once.
export default function DealScreen({ amNitwit, onDone, onLeave, prompt }: Props) {
    const t = useT();
    const styles = useStyles();

    const [briefed, setBriefed] = useState(false);
    const [seen, setSeen] = useState(false);

    // What every table is dealt from, and personal to nobody.
    if (!briefed) {
        return <RolesBriefingScreen onDone={() => setBriefed(true)} onLeave={onLeave} />;
    }

    return (
        <View style={styles.page}>
            <InGameHeader
                onClose={onLeave}
                closeLabel={t('oneOfUs.play.close')}
                label={t('oneOfUs.multiDevice.play.deal.label')}
            />

            <View style={styles.screen}>
                <AppText style={styles.title}>{t('oneOfUs.multiDevice.play.deal.title')}</AppText>

                <AppText style={styles.lede}>{t('oneOfUs.multiDevice.play.deal.intro')}</AppText>

                {/* Still tap-to-reveal: everybody is in one room, so a shoulder is the threat rather than the wire. */}
                <View style={styles.middle}>
                    <AnswerReveal
                        answer={prompt === '' ? t('oneOfUs.play.reveal.noWord') : prompt}
                        onReveal={() => setSeen(true)}
                        // Civilian and Imposter both draw the unknown face, so this cannot leak which one you are.
                        extraContent={
                            <RoleCard
                                role={amNitwit ? OneOfUsRole.Nitwit : OneOfUsRole.Civilian}
                                reveal
                                style={styles.role}
                            />
                        }
                    />
                </View>

                {seen && (
                    <ActionButton
                        size='large'
                        icon='play'
                        text={t('oneOfUs.multiDevice.play.deal.action')}
                        onPress={onDone}
                    />
                )}
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
        gap: Spacing.two
    },

    title: {
        fontSize: 26,
        fontWeight: 900,
        letterSpacing: -0.8,
        color: theme.colors.text
    },

    lede: {
        fontSize: 13.5,
        lineHeight: 13.5 * 1.5,
        fontWeight: 600,
        color: theme.colors.textSecondary
    },

    // The card and its role sit in the middle of whatever room is left.
    middle: {
        flex: 1,
        width: '100%',
        justifyContent: 'center'
    },

    role: {
        marginTop: Spacing.three
    }
}))
