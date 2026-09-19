import { useCallback, useRef } from "react";
import type { ScrollView } from "react-native";

// How far the mouse has to travel before a press becomes a drag, so a slightly shaky click still counts as a click.
const DRAG_THRESHOLD = 5;

// A callback ref that lets a mouse drag a horizontal ScrollView, and a vertical wheel scroll it sideways.
export function useDragScroll(): (scroller: ScrollView | null) => void {
    const attached = useRef<{ node: HTMLElement, detach: () => void } | null>(null);

    // Tracks its own node, because Animated's merged ref drops a returned cleanup and may hand over the same node twice.
    return useCallback((scroller: ScrollView | null) => {
        const node: HTMLElement | null = scroller?.getScrollableNode?.() ?? null;
        if (attached.current?.node === node) return;

        attached.current?.detach();
        attached.current = node === null ? null : { node, detach: attach(node) };
    }, []);
}

function attach(node: HTMLElement): () => void {
    let startX = 0;
    let startLeft = 0;
    let pressed = false;
    let dragged = false;

    const overflows = () => node.scrollWidth > node.clientWidth;

    const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType !== 'mouse' || event.button !== 0 || !overflows()) return;

        pressed = true;
        dragged = false;
        startX = event.clientX;
        startLeft = node.scrollLeft;
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    const onPointerMove = (event: PointerEvent) => {
        if (!pressed) return;

        const dx = event.clientX - startX;
        if (!dragged && Math.abs(dx) < DRAG_THRESHOLD) return;

        dragged = true;
        node.style.cursor = 'grabbing';
        node.scrollLeft = startLeft - dx;
    };

    const onPointerUp = () => {
        pressed = false;
        node.style.cursor = '';
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    };

    // Captured on the scroller, so the chip under the mouse never sees the click that ended a drag.
    const onClick = (event: MouseEvent) => {
        if (!dragged) return;

        dragged = false;
        event.preventDefault();
        event.stopPropagation();
    };

    const onSelectOrDrag = (event: Event) => {
        if (pressed) event.preventDefault();
    };

    const onWheel = (event: WheelEvent) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX) || !overflows()) return;

        const max = node.scrollWidth - node.clientWidth;
        const next = Math.min(max, Math.max(0, node.scrollLeft + event.deltaY));
        // At either end the wheel goes back to the page.
        if (next === node.scrollLeft) return;

        event.preventDefault();
        node.scrollLeft = next;
    };

    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('click', onClick, true);
    node.addEventListener('selectstart', onSelectOrDrag);
    node.addEventListener('dragstart', onSelectOrDrag);
    node.addEventListener('wheel', onWheel, { passive: false });

    return () => {
        onPointerUp();
        node.removeEventListener('pointerdown', onPointerDown);
        node.removeEventListener('click', onClick, true);
        node.removeEventListener('selectstart', onSelectOrDrag);
        node.removeEventListener('dragstart', onSelectOrDrag);
        node.removeEventListener('wheel', onWheel);
    };
}
