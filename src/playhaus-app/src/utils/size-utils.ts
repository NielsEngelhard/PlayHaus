import { ContentWidth, Spacing } from "@/constants/theme";
import { Platform } from "react-native";

export const COLUMN_WIDTH = ContentWidth + Spacing.four * 2;

// Used for desktop to display items over the full width
export function getReach(windowWidth: number) {
    const bleed = Platform.OS === 'web'
        ? Math.max(0, Math.ceil((windowWidth - COLUMN_WIDTH) / 2))
        : 0;

    return Spacing.six + bleed;
}