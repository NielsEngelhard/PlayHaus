import CountryFlag from "@/components/ui/CountryFlag";
import SelectInput, { type SelectOption } from "@/components/ui/SelectInput";
import { LANGUAGES, type LanguageCode } from "@/constants/languages";

/**
 * Built once, at module scope. The list never changes, and the flags are nodes —
 * rebuilding them every render would hand `SelectInput` a new prop and a new set
 * of images each time.
 */
const OPTIONS: SelectOption<LanguageCode>[] = LANGUAGES.map(language => ({
    value: language.code,
    label: language.label,
    description: language.description,
    icon: <CountryFlag code={language.flag} width={24} />
}));

interface Props {
    value: LanguageCode,
    onChange: (value: LanguageCode) => void,
    /**
     * Defaults to `Taal`. The profile screen says what the language is *for*,
     * since there it belongs to the account rather than to the game in front of you.
     */
    label?: string,
    disabled?: boolean
}

/**
 * The language picker, wherever a language is picked: a game's settings, a
 * multiplayer room, the profile.
 *
 * One component rather than an options array each screen builds for itself, which
 * is what it used to be — three copies of the same `LANGUAGES.map` that would have
 * had to grow the flag independently. Everything about how a language looks lives
 * here and in `@/constants/languages`; a screen only says which one is picked.
 */
export default function LanguageSelect({ value, onChange, label = 'Taal', disabled = false }: Props) {
    return (
        <SelectInput
            label={label}
            value={value}
            options={OPTIONS}
            onChange={onChange}
            disabled={disabled}
        />
    )
}
