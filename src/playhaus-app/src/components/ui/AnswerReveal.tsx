import AppText from "@/components/text/AppText";
import PopPressable from "@/components/ui/PopPressable";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import React, { useState } from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";

interface Props {
    answer: string
    letter?: string
    aliases?: string[]
    onReveal?: () => void
    onHide?: () => void
    compact?: boolean
    style?: StyleProp<ViewStyle>
    initiallyRevealed?: boolean
    extraContent?: React.ReactNode
}

export default function AnswerReveal({
    answer,
    letter,
    aliases,
    onReveal,
    onHide,
    compact = false,
    style,
    initiallyRevealed = false,
    extraContent
}: Props) {
    const t = useT();
    const styles = useStyles();

    const [revealed, setRevealed] = useState<boolean>(initiallyRevealed);

    function onHidePressed() {
        setRevealed(false);
        if (onHide) onHide();
    }

    function onRevealPressed() {
        setRevealed(true);
        if (onReveal) onReveal();
    }    

    if (!revealed) {
        return (
            <PopPressable
                onPress={onRevealPressed}
                accessibilityRole="button"
                accessibilityLabel={t('pubquizr.play.answer.reveal')}
                style={[styles.panel, compact && styles.compactPanel, style]}
            >
                <View style={styles.covered}>
                    <View style={styles.eye}>
                        <Feather name="eye" size={16} color={Brand.ink} />
                    </View>

                    <View style={styles.coveredText}>
                        <AppText style={styles.revealLabel}>
                            {t('pubquizr.play.answer.reveal')}
                        </AppText>

                        <AppText style={styles.revealHint}>
                            {t('pubquizr.play.answer.revealHint')}
                        </AppText>
                    </View>
                </View>
            </PopPressable>
        )
    }

    return (
        <>
            <View style={[styles.panel, compact && styles.compactPanel, style]}>
                <View style={styles.open}>
                    <View style={styles.said}>
                        <View style={styles.warning}>
                            <Feather name="eye-off" size={14} color={Brand.lemon} />

                            <AppText style={styles.warningText}>
                                {compact
                                    ? t('pubquizr.play.closest.answerLabel')
                                    : t('pubquizr.play.onlyYouSeeThis')}
                            </AppText>
                        </View>

                        <View style={styles.answerRow}>
                            {letter !== undefined && (
                                <AppText style={styles.letter}>{letter}</AppText>
                            )}

                            <AppText
                                style={[styles.answer, compact && styles.compactAnswer]}
                            >
                                {answer}
                            </AppText>
                        </View>

                        {(aliases && aliases.length > 0 && !compact) && (
                            <AppText style={styles.aliases}>
                                {t('pubquizr.play.alsoAccept', { answers: aliases.join(', ') })}
                            </AppText>
                        )}
                    </View>

                    <Pressable
                        onPress={onHidePressed}
                        accessibilityRole="button"
                        accessibilityLabel={t('pubquizr.play.closest.hide')}
                        // Hit slop rather than a taller pill: the control has to clear 44
                        // points to be hittable and the bar it sits in is 46 tall, so the
                        // room has to come from around it rather than from inside it.
                        hitSlop={10}
                        style={styles.hide}
                    >
                        <Feather name="eye-off" size={13} color="rgba(254, 251, 248, 0.7)" />

                        <AppText style={styles.hideLabel}>
                            {t('pubquizr.play.closest.hide')}
                        </AppText>
                    </Pressable>
                </View>
            </View>

            {extraContent && (
                <>
                    {extraContent}
                </>
            )}        
        </>
    )
}

const useStyles = createThemedStyles(theme => ({
    panel: {
        flexShrink: 0,
        justifyContent: 'center',
        padding: 15,
        borderRadius: 20,
        borderWidth: theme.borderWidth,
        // Ink on ink in the dark scheme would be an invisible edge, so the border
        // steps up to the scheme's own rather than staying the slab's colour.
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink,
        backgroundColor: Brand.ink
    },

    compactPanel: {
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 16
    },

    covered: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },

    // Lemon on the ink slab: the one warm thing on the covered panel, so the tap
    // target reads as an invitation rather than as a disabled block.
    eye: {
        width: 34,
        height: 34,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Brand.lemon
    },

    coveredText: {
        flex: 1,
        minWidth: 0
    },

    revealLabel: {
        fontSize: 15,
        fontWeight: 900,
        letterSpacing: -0.2,
        color: Brand.textOnAccent
    },

    revealHint: {
        marginTop: 2,
        fontSize: 11.5,
        fontWeight: 600,
        color: 'rgba(254, 251, 248, 0.6)'
    },

    open: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },

    said: {
        flex: 1,
        minWidth: 0
    },

    warning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7
    },

    warningText: {
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: Brand.lemon
    },

    answerRow: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 10
    },

    // Lemon, and a good deal smaller than the words beside it. It is the index rather
    // than the answer: the thing you find the row by, not the thing you read out.
    letter: {
        flexShrink: 0,
        fontSize: 15,
        fontWeight: 900,
        color: Brand.lemon
    },

    // Paper in both schemes: the slab under it is ink in both.
    answer: {
        flex: 1,
        minWidth: 0,
        fontSize: 26,
        fontWeight: 900,
        letterSpacing: -0.7,
        color: Brand.textOnAccent
    },

    compactAnswer: {
        fontSize: 24,
        letterSpacing: -0.6
    },

    aliases: {
        marginTop: 6,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 12 * 1.4,
        // Quieter than the answer without being a second colour: the same paper,
        // stepped back, so the two read as one thing said twice.
        color: 'rgba(254, 251, 248, 0.6)'
    },

    hide: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: 'rgba(254, 251, 248, 0.3)'
    },

    hideLabel: {
        fontSize: 11,
        fontWeight: 800,
        color: 'rgba(254, 251, 248, 0.7)'
    }
}))
