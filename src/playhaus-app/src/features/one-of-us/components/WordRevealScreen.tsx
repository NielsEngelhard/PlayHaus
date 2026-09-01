import AppText from "@/components/text/AppText";
import ActionButton from "@/components/ui/ActionButton";
import AnswerReveal from "@/components/ui/AnswerReveal";
import HandoffScreen from "@/components/ui/HandoffScreen";
import InGameHeader from "@/components/ui/InGameHeader";
import SeatAvatar from "@/components/ui/SeatAvatar";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import RoleCard from "@/features/one-of-us/components/RoleCard";
import type { OneOfUsRole } from "@/features/one-of-us/models";
import { joinNames, type Seat } from "@/features/table/seats";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
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
    total: number
    word: string | null
}

export default function WordRevealScreen({
    from,
    number,
    onDone,
    onLeave,
    person,
    queue,
    role,
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

    return (
        <View style={styles.page}>
            <InGameHeader
                onClose={onLeave}
                closeLabel={t('oneOfUs.play.close')}
                label={t('oneOfUs.play.reveal.step', { number, total })}
            />

            <View style={styles.screen}>
                <AppText style={styles.name}>{person.name}</AppText>

                <AnswerReveal
                    key={person.seat}
                    answer={word ?? t('oneOfUs.play.reveal.noWord')}
                    onReveal={() => setSeen(true)}
                    extraContent={<RoleCard role={role} style={styles.role} />}
                />

                <View style={styles.footer}>
                    {next !== null && (
                        <View style={styles.queue}>
                            <View style={styles.queueFaces}>
                                {queue.map((seat, index) => (
                                    <View
                                        key={seat.seat}
                                        style={index === 0 ? undefined : styles.overlap}
                                    >
                                        <SeatAvatar seat={seat} size={24} />
                                    </View>
                                ))}
                            </View>

                            <AppText style={styles.queueText} numberOfLines={2}>
                                {t('oneOfUs.play.reveal.queue', {
                                    names: joinNames(queue.map(seat => seat.name), t('common.and'))
                                })}
                            </AppText>
                        </View>
                    )}

                    {seen && (
                        <ActionButton
                            size="large"
                            icon={next === null ? 'play' : 'arrow-right'}
                            text={next === null
                                ? t('oneOfUs.play.reveal.lastDone')
                                : t('oneOfUs.play.reveal.done', { name: next.name })}
                            onPress={onDone}
                        />
                    )}
                </View>
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
        paddingTop: Spacing.four
    },
    name: {
        fontSize: 34,
        fontWeight: 900,
        letterSpacing: -1.2,
        color: theme.colors.text
    },
    role: {
        marginTop: 10
    },
    footer: {
        marginTop: 'auto',
        minHeight: 66,
        gap: Spacing.two,
        justifyContent: 'flex-end'
    },
    queue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: theme.colors.borderMuted
    },
    queueFaces: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    overlap: {
        marginLeft: -8
    },

    queueText: {
        flex: 1,
        minWidth: 0,
        fontSize: 11.5,
        fontWeight: 700,
        lineHeight: 11.5 * 1.4,
        color: theme.colors.textMuted
    }
}))
