import AppText from "@/components/text/AppText";
import BackButton from "@/components/ui/BackButton";
import TextButton from "@/components/ui/TextButton";
import TextField from "@/components/ui/TextField";
import { PUBQUIZR } from "@/constants/games";
import { ROUTES } from "@/constants/routes";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { JOIN_CODE_LENGTH, resolveJoinCode, sanitize } from "@/features/join/join-code";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useRouter, type RelativePathString } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

// The shared screen's way in. It types the code because a laptop cannot scan the QR off its own display.
export default function QuizzerTableDoorPage() {
    const router = useRouter();
    const styles = useStyles();
    const t = useT();

    const [code, setCode] = useState('');

    const target = resolveJoinCode(code);
    const ready = target.kind === 'route' && target.game === PUBQUIZR;

    // Only once the whole code is in: a half-typed code is not a wrong one.
    const rejected = code.length === JOIN_CODE_LENGTH && !ready;

    function open() {
        if (!ready) return;

        router.push(ROUTES.quizzerTable(code) as RelativePathString);
    }

    return (
        <View style={styles.screen}>
            <BackButton href={ROUTES.quizzerIndex} />

            <View style={styles.words}>
                <AppText style={styles.title}>{t('pubquizr.table.door.title')}</AppText>

                <AppText style={styles.message}>{t('pubquizr.table.door.message')}</AppText>
            </View>

            <TextField
                autoCapitalize='characters'
                autoFocus
                label={t('pubquizr.table.door.codeLabel')}
                onChangeText={value => setCode(sanitize(value))}
                onSubmitEditing={open}
                placeholder={t('pubquizr.table.door.placeholder')}
                returnKeyType='go'
                value={code}
            />

            {rejected && (
                <AppText style={styles.rejected}>{t('pubquizr.table.door.rejected')}</AppText>
            )}

            <TextButton disabled={!ready} fullWidth onPress={open} text={t('pubquizr.table.door.open')} />
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    screen: {
        flex: 1,
        width: '100%',
        gap: Spacing.four
    },
    words: {
        gap: Spacing.two
    },
    title: {
        fontSize: FontSizes.xxl,
        fontWeight: 900,
        color: theme.colors.text
    },
    message: {
        fontSize: FontSizes.md,
        fontWeight: 500,
        color: theme.colors.textSecondary
    },
    rejected: {
        fontSize: FontSizes.sm,
        fontWeight: 700,
        color: theme.colors.blush
    }
}))
