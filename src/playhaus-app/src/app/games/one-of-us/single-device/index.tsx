import { createSingleDeviceOneOfUsGame } from "@/api/calls/one-of-us-single-device";
import SettingsPageBase from "@/components/layout/SettingsPageBase";
import LanguageSelect from "@/components/ui/LanguageSelect";
import PlayerNamesInput from "@/components/ui/PlayerNamesInput";
import StartGameButton from "@/components/ui/StartGameButton";
import ToggleRow from "@/components/ui/ToggleRow";
import { ONE_OF_US } from "@/constants/games";
import { DEFAULT_LANGUAGE, LanguageCode } from "@/constants/languages";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/features/auth/useAuth";
import { TranslationKey } from "@/features/i18n/keys";
import { useT } from "@/features/i18n/LanguageContext";
import TableRingPreview from "@/features/one-of-us/components/TableRingPreview";
import { oneOfUsErrorMessage } from "@/features/one-of-us/game-errors";
import { seatedNames, tableProblem } from "@/features/one-of-us/one-device-table";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/features/one-of-us/oou-settings";
import { readTable, writeTable } from "@/features/one-of-us/table-store";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { router, type RelativePathString } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

export default function OneOfUsSingleDeviceIndexPage() {
    const t = useT();
    const auth = useAuth()
    const styles = useStyles()

    const [names, setNames] = useState<string[]>([]);
    /**
     * The language picked on this screen, or null while it is still whatever the
     * account says.
     *
     * Derived rather than copied into state by an effect. The account arrives a moment
     * after this screen first paints, and an effect that wrote it into state would both
     * render once with the wrong flag and overwrite a choice made in that moment. Null
     * means "nobody has chosen", which is the only thing this needs to remember.
     */
    const [picked, setPicked] = useState<LanguageCode | null>(null);
    const language = picked ?? auth.user?.locale ?? DEFAULT_LANGUAGE;
    const [wordsOnly, setWordsOnly] = useState<boolean>(false);
    const [error, setError] = useState<TranslationKey | null>(null);
    const [starting, setStarting] = useState(false);

    function editNames(next: string[]) {
        setNames(next);
        if (error !== null) setError(null);
    }

    /**
     * Starts the game, or says why it cannot.
     *
     * The table is checked here rather than by the button being disabled: a form that
     * silently will not submit leaves somebody looking for the seat they typed twice.
     * `tableProblem` names the one thing wrong with it, in the game's own words.
     */
    async function start() {
        if (starting) return;

        const problem = tableProblem(names);
        if (problem !== null) {
            setError(problem);
            return;
        }

        setStarting(true)
        setError(null)

        const seated = seatedNames(names);
        void writeTable(seated);

        try {
            const gameId = await createSingleDeviceOneOfUsGame({
                locale: language,
                playerNames: seated,
                wordOnly: wordsOnly
            });

            // A create that answered without an id is a create that did not happen,
            // whatever its status said. Pushing on it would land the table on a game
            // screen with nothing behind it.
            if (gameId === null) {
                setError('oneOfUs.errors.generic');
                return;
            }

            // `push`, so the back gesture returns to this form — the game itself leaves
            // with `replace`, which is what stops the two bouncing off each other.
            router.push(ROUTES.oneOfUsPlaySingleDeviceGame(gameId) as RelativePathString)
        } catch (failure) {
            setError(oneOfUsErrorMessage(failure));
        } finally {
            setStarting(false)
        }
    }

    /**
     * Last week's table, if this phone remembers one.
     *
     * The ref guards against the effect seeding twice, and against seeding over names
     * somebody has already started typing — the read is asynchronous, so the form is
     * live for as long as the keychain takes to answer.
     */
    const seeded = useRef(false);
    useEffect(() => {
        void (async () => {
            const remembered = await readTable();
            if (seeded.current || remembered === null) return;

            seeded.current = true;
            setNames(current => current.some(name => name !== '')
                ? current
                : padToMinimum(remembered));
        })();
    }, []);

    return (
        <View style={styles.container}>
            <SettingsPageBase
                game={ONE_OF_US}
                title={t('oneOfUs.singleDevice.title')}
                intro={t('oneOfUs.singleDevice.description')}
                back={ROUTES.oneOfUsIndex as RelativePathString}
                preview={<TableRingPreview names={names} />}
                previewCaption={t('common.player.seated', { players: seatedNames(names).length })}
                error={error === null ? undefined : t(error)}
                action={
                    <StartGameButton
                        text={starting ? t('common.busy') : t('common.start')}
                        onPress={start}
                        disabled={starting}
                    />
                }
            >
                {/* One child per ruled section — bare on the sheet, no cards. */}
                <PlayerNamesInput
                    minPlayers={MIN_PLAYERS}
                    maxPlayers={MAX_PLAYERS}
                    names={names}
                    onChange={editNames}
                    disabled={starting}
                />

                <LanguageSelect
                    variant='row'
                    value={language}
                    onChange={locale => setPicked(locale)}
                />

                <ToggleRow
                    flush
                    value={wordsOnly}
                    onChange={value => setWordsOnly(value)}
                    label={t('oneOfUs.settings.wordsOnly.title')}
                    description={t('oneOfUs.settings.wordsOnly.description')}
                />
            </SettingsPageBase>
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    // Only here to pass the window's height through to the base, which is the page.
    container: {
        flex: 1,
        width: '100%'
    }
}))

/**
 * A remembered table, padded out to the fewest seats the game can be played with.
 *
 * Outside the component so the effect that seeds the form can call it: a function
 * declared in the body is not in scope until the render that declares it has got that
 * far, and the effect runs from a closure over an earlier one.
 */
function padToMinimum(names: string[]): string[] {
    return names.length >= MIN_PLAYERS
        ? names
        : [...names, ...Array.from({ length: MIN_PLAYERS - names.length }, () => '')];
}
