import AppText from "@/components/text/AppText";
import CrossFade from "@/components/ui/CrossFade";
import PopPressable from "@/components/ui/PopPressable";
import { Brand } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useTheme } from "@/features/theme/ThemeContext";
import Feather from "@expo/vector-icons/Feather";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";

interface Props {
    aliases: string[]
    answer: string
    category?: string
    // Round 2's four options, read out after the question.
    children?: ReactNode
    // Null leaves the cue out; undefined falls back to the read-aloud line.
    cue?: string | null
    // Only reachable without the answer row: the reveal button stays and covers the answer again.
    onHide?: () => void
    onReveal: () => void
    prompt: string
    revealed: boolean
    // False when the children already mark the right answer themselves.
    showAnswerRow?: boolean
    size?: number
}

// The question card on its fanned stack, with the answer kept on the card's own back row.
export default function QuestionStack({
    aliases,
    answer,
    category,
    children,
    cue,
    onHide,
    onReveal,
    prompt,
    revealed,
    showAnswerRow = true,
    size = 23
}: Props) {
    const t = useT();
    const theme = useTheme();
    const styles = useStyles();

    const hasOptions = children !== undefined;

    return (
        <View style={styles.wrapper}>
            <View pointerEvents="none" style={[styles.sheet, styles.sheetBack]} />
            <View pointerEvents="none" style={[styles.sheet, styles.sheetMiddle]} />

            <View style={styles.card}>
                <View style={styles.cueRow}>
                    {cue !== null && (
                        <View style={styles.cue}>
                            <Feather name="volume-2" size={14} color={theme.colors.focus} />

                            <AppText style={styles.cueText} numberOfLines={2}>
                                {cue ?? t('pubquizr.play.readAloud')}
                            </AppText>
                        </View>
                    )}

                    {category !== undefined && category !== '' && (
                        <View style={[styles.category, cue === null && styles.categoryAlone]}>
                            <AppText style={styles.categoryText} numberOfLines={1}>{category}</AppText>
                        </View>
                    )}
                </View>

                {/* Scrolls inside the card rather than spilling over the seat row when four options will not fit a short phone. */}
                <ScrollView
                    style={styles.body}
                    contentContainerStyle={[styles.bodyContent, hasOptions && styles.bodyContentTop]}
                    showsVerticalScrollIndicator={false}
                >
                    <AppText style={[styles.prompt, { fontSize: size, lineHeight: size * 1.15 }]}>
                        {prompt}
                    </AppText>

                    {hasOptions && <View style={styles.options}>{children}</View>}
                </ScrollView>

                {/* Kept on screen once revealed when there is no answer row to take its place, so the card does not jump. */}
                <CrossFade
                    turned={revealed && showAnswerRow}
                    front={(
                        <PopPressable
                            onPress={revealed ? () => onHide?.() : onReveal}
                            accessibilityRole="button"
                            accessibilityLabel={revealed ? t('pubquizr.play.answer.hide') : t('pubquizr.play.answer.reveal')}
                            style={styles.covered}
                        >
                            <View style={styles.eye}>
                                <Feather name={revealed ? 'eye-off' : 'eye'} size={15} color={Brand.ink} />
                            </View>

                            <View style={styles.rowBody}>
                                <AppText style={styles.revealLabel} numberOfLines={1}>
                                    {revealed ? t('pubquizr.play.answer.hide') : t('pubquizr.play.answer.reveal')}
                                </AppText>

                                <AppText style={styles.revealHint} numberOfLines={1}>
                                    {t('pubquizr.play.answer.revealHint')}
                                </AppText>
                            </View>
                        </PopPressable>
                    )}
                    back={(
                        <View style={styles.answerRow}>
                            <View style={styles.rowBody}>
                                <AppText style={styles.answerLabel}>{t('pubquizr.play.answerLabel')}</AppText>

                                <AppText style={styles.answer}>{answer}</AppText>

                                {aliases.length > 0 && (
                                    <AppText style={styles.aliases}>
                                        {t('pubquizr.play.alsoAccept', { answers: aliases.join(', ') })}
                                    </AppText>
                                )}
                            </View>

                            <Feather name="check" size={18} color={Brand.ink} />
                        </View>
                    )}
                />
            </View>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    // Grows into the room there is and gives it back on a short phone, so the seat row below never gets pushed off.
    wrapper: {
        flex: 1,
        minHeight: 190,
        marginHorizontal: 4
    },

    sheet: {
        position: 'absolute',
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        transformOrigin: '50% 100%'
    },

    sheetBack: {
        left: 10,
        right: -4,
        top: 10,
        bottom: -10,
        borderRadius: 20,
        backgroundColor: theme.colors.backgroundSelected,
        transform: [{ rotate: '2deg' }]
    },

    sheetMiddle: {
        left: -4,
        right: 10,
        top: 6,
        bottom: -6,
        borderRadius: 22,
        backgroundColor: theme.colors.backgroundSecondary,
        transform: [{ rotate: '-1.8deg' }]
    },

    card: {
        flex: 1,
        minHeight: 0,
        gap: 10,
        padding: 14,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardLarge
    },

    cueRow: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8
    },

    cue: {
        flexShrink: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7
    },

    cueText: {
        flexShrink: 1,
        fontSize: 10.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.4,
        color: theme.colors.focus
    },

    category: {
        flexShrink: 0,
        maxWidth: '50%',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.background
    },

    categoryAlone: {
        marginLeft: 'auto'
    },

    categoryText: {
        fontSize: 9.5,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        color: theme.colors.textSecondary
    },

    body: {
        flex: 1,
        minHeight: 0
    },

    bodyContent: {
        flexGrow: 1,
        justifyContent: 'center'
    },

    bodyContentTop: {
        justifyContent: 'flex-start',
        gap: 12
    },

    prompt: {
        fontWeight: 900,
        letterSpacing: -0.8,
        color: theme.colors.text
    },

    options: {
        flexShrink: 0,
        marginTop: 'auto'
    },

    // Ink in both schemes, so the lemon eye and the paper label read the same everywhere.
    covered: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9,
        paddingHorizontal: 11,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: theme.scheme === 'dark' ? theme.colors.border : Brand.ink,
        backgroundColor: Brand.ink
    },

    eye: {
        width: 30,
        height: 30,
        flexShrink: 0,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Brand.lemon
    },

    rowBody: {
        flex: 1,
        minWidth: 0
    },

    revealLabel: {
        fontSize: 14,
        fontWeight: 900,
        color: Brand.textOnAccent
    },

    revealHint: {
        marginTop: 1,
        fontSize: 11,
        fontWeight: 600,
        color: 'rgba(254, 251, 248, 0.6)'
    },

    // Mint in both schemes, so everything written on it is ink in both.
    answerRow: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingVertical: 9,
        paddingHorizontal: 11,
        borderRadius: 14,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: theme.colors.mint,
        ...theme.shadows.hardSmall
    },

    answerLabel: {
        fontSize: 9,
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        color: 'rgba(15, 13, 18, 0.65)'
    },

    answer: {
        marginTop: 1,
        fontSize: 19,
        fontWeight: 900,
        letterSpacing: -0.5,
        color: Brand.ink
    },

    aliases: {
        marginTop: 2,
        fontSize: 11.5,
        fontWeight: 700,
        color: 'rgba(15, 13, 18, 0.65)'
    }
}))
