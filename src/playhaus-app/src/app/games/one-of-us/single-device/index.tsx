import { createSingleDeviceOneOfUsGame } from "@/api/calls/one-of-us-single-device";
import SimpleTextHero from "@/components/text/SimpleTextHero";
import InlineNotification from "@/components/ui/InlineNotification";
import LanguageSelect from "@/components/ui/LanguageSelect";
import PlayerNamesInput from "@/components/ui/PlayerNamesInput";
import ToggleRow from "@/components/ui/ToggleRow";
import { DEFAULT_LANGUAGE, LanguageCode } from "@/constants/languages";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/features/auth/useAuth";
import { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import StartGameButton from "@/features/league-of-letters/components/StartGameButton";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/features/one-of-us/oou-settings";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { readTable, writeTable } from "../table-store";

export default function OneOfUsSingleDeviceIndexPage() {
    const t = useT();
    const auth = useAuth()
    const styles = useStyles()

    const [names, setNames] = useState<string[]>([]);
    const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
    const [wordsOnly, setWordsOnly] = useState<boolean>(false);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [starting, setStarting] = useState(false);

    const canStart = names.length >= MAX_PLAYERS && !starting;

    function editNames(next: string[]) {
        setNames(next);
        if (error !== null) setError(null);
    }

    async function start() {
        debugger;
        if (!canStart) return;

        setStarting(true)
        setError(null)

        void writeTable(names);

        try {
            const gameId = await createSingleDeviceOneOfUsGame({
                locale: language,
                playerNames: names,
                wordOnly: wordsOnly
            });

            router.push(ROUTES.oneOfUsPlaySingleDeviceGame(gameId))
        } finally {
            setStarting(false)
        }
    }

    /**
     * e.g. Last week's table, if this phone remembers one.
     */
    const seeded = useRef(false);
    useEffect(() => {
        void (async () => {
            const remembered = await readTable();
            if (!seeded.current || remembered === null) return;

            seeded.current = true;
            setNames(current => current.some(name => name !== '')
                ? current
                : padToMinimum(remembered));
        })();
    }, []);        

    function padToMinimum(names: string[]): string[] {
        return names.length >= MIN_PLAYERS
            ? names
            : [...names, ...Array.from({ length: MIN_PLAYERS - names.length }, () => '')];
    }    

    // Set language
    useEffect(() => {
        if (!auth.user) return;
        setLanguage(auth.user.locale)
    }, [auth.user]);

    return (
        <View>
            <SimpleTextHero
                title={t('oneOfUs.singleDevice.title')}
                description={t('oneOfUs.singleDevice.description')}
            />

            {error !== null && (
                <InlineNotification
                    icon="alert-triangle"
                    title={t('common.failed')}
                    message={t(error)}
                />
            )}            

            <PlayerNamesInput
                minPlayers={MIN_PLAYERS}
                maxPlayers={MAX_PLAYERS}
                names={names}
                onChange={editNames}
                disabled={starting}
            />

            <View style={styles.language}>
                <LanguageSelect
                    value={language}
                    onChange={locale => setLanguage(locale)}
                />
            </View>

            <ToggleRow
                value={wordsOnly}
                onChange={value => setWordsOnly(value)}
                label={t('oneOfUs.settings.wordsOnly.title')}
                description={t('oneOfUs.settings.wordsOnly.description')}
                icon="zap"
            />            

            <View style={styles.footer}>
                <StartGameButton
                    text={starting ? t('common.busy') : t('common.start')}
                    onPress={start}
                    disabled={starting || canStart}
                />
            </View>                    
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({
    container: {
        flex: 1,
        width: '100%'
    },
    language: {
        marginTop: 14
    },
    footer: {
        marginTop: 'auto',
        paddingTop: Spacing.four
    },    
}))