import type { ScrollView } from "react-native";

const noop = (_scroller: ScrollView | null) => { };

// Touch already swipes a horizontal ScrollView natively; only a desktop mouse needs the help in `useDragScroll.web.ts`.
export function useDragScroll(): (scroller: ScrollView | null) => void {
    return noop;
}
