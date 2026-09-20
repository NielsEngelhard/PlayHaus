import { isLanguageCode } from "@/constants/languages";
import { useAuth } from "@/features/auth/useAuth";
import { useEffect } from "react";

// A screen speaks the room's language, not the television's: its own guest account was made before it knew which room it was joining.
export function useScreenLanguage(locale: string | undefined): void {
    const { patchUser, user } = useAuth();

    const wanted = isLanguageCode(locale) ? locale : null;
    const mismatched = wanted !== null && user !== null && user.locale !== wanted;

    useEffect(() => {
        if (!mismatched || wanted === null) return;

        // Only this device's copy of the account: the guest itself is nobody's and keeps whatever it was made with.
        patchUser({ locale: wanted });
    }, [mismatched, wanted, patchUser]);
}
