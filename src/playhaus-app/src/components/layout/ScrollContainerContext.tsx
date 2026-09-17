import { Spacing } from "@/constants/theme";
import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode, type RefObject } from "react";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from "react-native";

/** The breathing room left around a revealed node, at whichever end the scroll stops on. */
const GAP = Spacing.three;

interface ScrollContainer {
    /** The scroller itself, for a shell that drives it directly as well. */
    scroller: RefObject<ScrollView | null>,
    // Everything the shell's ScrollView hands back, in one spread.
    viewport: {
        onLayout: (event: LayoutChangeEvent) => void,
        onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void,
        ref: RefObject<ScrollView | null>,
        scrollEventThrottle: number
    },
    // Goes on the one View directly inside the scroller: the frame a reveal measures against.
    content: { ref: RefObject<View | null> },
    reveal: (node: View | null) => void
}

const ScrollContainerContext = createContext<(node: View | null) => void>(() => { });

/** Publishes a scroller to everything under it. Takes the handle as a prop because the shell that owns the `ScrollView` sits outside this provider. */
export function ScrollContainerProvider({ container, children }: { container: ScrollContainer, children: ReactNode }) {
    return (
        <ScrollContainerContext.Provider value={container.reveal}>
            {children}
        </ScrollContainerContext.Provider>
    )
}

// Build the handle a shell publishes. The height and the offset live in refs: neither should repaint the page.
export function useScrollContainer(): ScrollContainer {
    const scroller = useRef<ScrollView | null>(null);
    const content = useRef<View | null>(null);
    const viewportHeight = useRef(0);
    const offset = useRef(0);

    const onLayout = useCallback((event: LayoutChangeEvent) => {
        viewportHeight.current = event.nativeEvent.layout.height;
    }, []);

    const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        offset.current = event.nativeEvent.contentOffset.y;
    }, []);

    const reveal = useCallback((node: View | null) => {
        const frame = content.current;

        // No layout pass yet means there is nothing to measure against.
        if (node === null || frame === null || viewportHeight.current === 0) return;

        node.measureLayout(frame, (_left, top, _width, height) => {
            // Its bottom in view, but never far enough to push its own top off the top.
            const target = Math.max(0, Math.min(top + height + GAP - viewportHeight.current, top - GAP));

            // Downwards only: a node already in view stays where it is.
            if (target > offset.current) scroller.current?.scrollTo({ y: target, animated: true });
        });
    }, []);

    return useMemo(() => ({
        scroller,
        viewport: { onLayout, onScroll, ref: scroller, scrollEventThrottle: 16 },
        content: { ref: content },
        reveal
    }), [onLayout, onScroll, reveal]);
}

/** Bring this node's bottom into view. A no-op outside a registered scroller. */
export function useReveal(): (node: View | null) => void {
    return useContext(ScrollContainerContext);
}
