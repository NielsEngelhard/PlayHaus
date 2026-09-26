import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import FlipOver from "@/components/ui/FlipOver";
import HandoffScreen from "@/components/ui/HandoffScreen";
import PopPressable from "@/components/ui/PopPressable";
import SlideFadeIn from "@/components/ui/SlideFadeIn";
import { Brand, FontSizes, Radii, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import OouBand from "@/features/one-of-us/components/OouBand";
import TableStrip from "@/features/one-of-us/components/TableStrip";
import { OneOfUsRole } from "@/features/one-of-us/models";
import { joinNames, type Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import Feather from "@expo/vector-icons/Feather";
import { useState } from "react";
import { View } from "react-native";

interface Props {
    from: Seat | null
    number: number
    onDone: () => void
    onLeave: () => void
    person: Seat
    queue: Seat[]
    role: OneOfUsRole
    // Everybody at the table, in the order the phone goes round.
    table: Seat[]
    total: number
    word: string | null
}

const CARD = 300;
const EYE = 40;
// Long words step down a size so they stay on one line of the card.
const LONG_WORD = 10;
const VERY_LONG_WORD = 14;

export default function WordRevealScreen({
    from,
    number,
    onDone,
    onLeave,
    person,
    queue,
    role,
    table,
    total,
    word
}: Props) {
    const t = useT();
    const styles = useStyles();

    const [claimed, setClaimed] = useState(false);
    const [seen, setSeen] = useState(false);

    if (!claimed) {
        return (
            <HandoffScreen
                person={person}
                from={from}
                toneNumber={number}
                step={t('oneOfUs.play.reveal.step', { number, total })}
                title={t('oneOfUs.play.reveal.title', { name: person.name })}
                body={from === null
                    ? t('oneOfUs.play.reveal.bodyFirst', { name: person.name })
                    : t('oneOfUs.play.reveal.body', { from: from.name })}
                note={t('oneOfUs.play.reveal.note')}
                action={t('oneOfUs.play.reveal.action', { name: person.name })}
                onReady={() => setClaimed(true)}
            />
        )
    }

    const next = queue.length === 0 ? null : queue[0];
    const blank = word === null || word === '';
    const shown = blank ? t('oneOfUs.play.reveal.noWord') : word;
    const wordSize = shown.length > VERY_LONG_WORD
        ? FontSizes.xxl
        : shown.length > LONG_WORD ? FontSizes.xxxl : FontSizes.huge;

    return (
        <View style={styles.page}>
            <OouBand
                onClose={onLeave}
                closeLabel={t('oneOfUs.play.close')}
                label={t('oneOfUs.play.reveal.bandLabel')}
                count={`${number}/${total}`}
                title={t('oneOfUs.play.reveal.yourWord', { name: person.name })}
            >
                <TableStrip
                    seats={table}
                    markOf={seat => seat.seat < person.seat
                        ? 'done'
                        : seat.seat === person.seat ? 'focus' : 'pending'}
                />
            </OouBand>

            <View style={styles.middle}>
                <View style={styles.stack}>
                    <View style={[styles.backing, styles.backingViolet]} />
                    <View style={[styles.backing, styles.backingPaper]} />

                    <FlipOver
                        turned={seen}
                        front={(
                            <PopPressable
                                onPress={() => setSeen(true)}
                                accessibilityRole="button"
                                accessibilityLabel={t('oneOfUs.play.reveal.secretLabel')}
                                style={styles.card}
                            >
                                <View style={styles.eye}>
                                    <Feather name="eye" size={FontSizes.lg} color={Brand.ink} />
                                </View>

                                <AppText style={styles.cover}>{t('oneOfUs.play.reveal.secretLabel')}</AppText>
                            </PopPressable>
                        )}
                        back={(
                            <View style={styles.card}>
                                <AppText style={styles.label}>{t('oneOfUs.play.note.label')}</AppText>

                                <AppText
                                    style={[styles.word, { fontSize: wordSize, lineHeight: wordSize }]}
                                    numberOfLines={2}
                                >
                                    {shown}
                                </AppText>

                                <AppText style={styles.blurb}>
                                    {t(role === OneOfUsRole.Nitwit
                                        ? 'oneOfUs.play.note.blurbBlank'
                                        : 'oneOfUs.play.note.blurb')}
                                </AppText>
                            </View>
                        )}
                    />
                </View>
            </View>

            <View style={styles.footer}>
                {next !== null && (
                    <AppText style={styles.after}>
                        {t('oneOfUs.play.reveal.after', {
                            names: joinNames(queue.map(seat => seat.name), t('common.and'))
                        })}
                    </AppText>
                )}

                {seen && (
                    <SlideFadeIn offsetY={BUTTON_RISE} durationMs={BUTTON_MS} delayMs={BUTTON_DELAY_MS}>
                        <ActionButton
                            icon={next === null ? 'play' : 'arrow-right'}
                            text={next === null
                                ? t('oneOfUs.play.reveal.lastDone')
                                : t('oneOfUs.play.reveal.remember', { name: next.name })}
                            onPress={onDone}
                        />
                    </SlideFadeIn>
                )}
            </View>
        </View>
    )
}

const BUTTON_RISE = 16;
const BUTTON_MS = 280;
// Waits for the card to finish turning.
const BUTTON_DELAY_MS = 200;
// Holds the room the button will take, so the card does not jump when it arrives.
const FOOTER_MIN = 80;

const useStyles = createThemedStyles(theme => ({
    page: {
        flex: 1,
        width: '100%',
        paddingHorizontal: Spacing.three,
        paddingBottom: Spacing.four
    },
    middle: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: Spacing.four
    },
    stack: {
        alignSelf: 'center',
        width: CARD,
        maxWidth: '100%'
    },
    backing: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth
    },
    // A pale fill, so its outline stays ink in the dark as well.
    backingViolet: {
        borderColor: Brand.ink,
        backgroundColor: Brand.violet,
        transform: [{ rotate: '6deg' }]
    },
    backingPaper: {
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        transform: [{ rotate: '-4deg' }]
    },
    card: {
        alignItems: 'center',
        gap: Spacing.three,
        paddingVertical: Spacing.five,
        paddingHorizontal: Spacing.four,
        borderRadius: Radii.xl,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.backgroundSecondary,
        ...theme.shadows.hardLarge
    },
    eye: {
        width: EYE,
        height: EYE,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radii.full,
        borderWidth: theme.borderWidth,
        borderColor: Brand.ink,
        backgroundColor: Brand.lemon
    },
    cover: {
        fontSize: FontSizes.md,
        fontWeight: 900,
        textAlign: 'center',
        color: theme.colors.text
    },
    label: {
        fontSize: FontSizes.xs,
        fontWeight: 900,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: theme.colors.textSecondary
    },
    word: {
        fontWeight: 900,
        letterSpacing: -1.6,
        textAlign: 'center',
        color: theme.colors.text
    },
    blurb: {
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.5,
        fontWeight: 500,
        textAlign: 'center',
        color: theme.colors.textSecondary
    },
    footer: {
        flexShrink: 0,
        minHeight: FOOTER_MIN,
        gap: Spacing.two,
        justifyContent: 'flex-end'
    },
    after: {
        fontSize: FontSizes.sm,
        fontWeight: 700,
        textAlign: 'center',
        color: theme.colors.textSecondary
    }
}))
