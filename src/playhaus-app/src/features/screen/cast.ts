import { CAST_NAMESPACE, type CastTable } from "@/features/screen/cast-config";
import { useCallback, useEffect, useRef } from "react";
import CastContext, { CastState, useCastChannel, useCastState } from "react-native-google-cast";
import type CastChannel from "react-native-google-cast/lib/typescript/api/CastChannel";

// Puts the shared screen on a Chromecast. The phone sends the join code and nothing else -- the television fetches its own state.
export function useCastTable(code: string): CastTable {
    const state = useCastState();

    const live = useRef<CastChannel | null>(null);
    const asked = useRef(code);

    // The television asks for the code when it connects, in case our first send beat its listener.
    const onMessage = useCallback((message: Record<string, any> | string) => {
        if (typeof message === 'string' || message.type !== 'hello') return;

        void live.current?.sendMessage({ code: asked.current }).catch(() => { });
    }, []);

    const channel = useCastChannel(CAST_NAMESPACE, onMessage);

    // Both kept in refs and updated from an effect rather than during render.
    useEffect(() => { live.current = channel; }, [channel]);
    useEffect(() => { asked.current = code; }, [code]);

    useEffect(() => {
        if (channel === null) return;

        void channel.sendMessage({ code }).catch(() => { });
    }, [channel, code]);

    const show = useCallback(() => { void CastContext.showCastDialog().catch(() => { }); }, []);

    return {
        available: state !== null && state !== undefined && state !== CastState.NO_DEVICES_AVAILABLE,
        connected: state === CastState.CONNECTED,
        show
    };
}
