import { CAST_APP_ID, CAST_NAMESPACE, type CastTable } from '@/features/screen/cast-config';
import { useCallback, useEffect, useRef, useState } from 'react';

// The sender framework has to come from gstatic; Chrome only wires it to its own Cast support from there.
const SENDER_SDK = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';

type MessageListener = (namespace: string, message: string) => void;

interface CastSession {
    addMessageListener: (namespace: string, listener: MessageListener) => void
    removeMessageListener: (namespace: string, listener: MessageListener) => void
    sendMessage: (namespace: string, message: object) => Promise<unknown>
}

interface CastContext {
    addEventListener: (type: string, handler: () => void) => void
    getCastState: () => string
    getCurrentSession: () => CastSession | null
    removeEventListener: (type: string, handler: () => void) => void
    requestSession: () => Promise<unknown>
    setOptions: (options: object) => void
}

interface CastFramework {
    CastContext: { getInstance: () => CastContext }
    CastContextEventType: { CAST_STATE_CHANGED: string, SESSION_STATE_CHANGED: string }
    CastState: { CONNECTED: string, NO_DEVICES_AVAILABLE: string }
}

type CastWindow = Window & {
    __onGCastApiAvailable?: (available: boolean) => void
    cast?: { framework?: CastFramework }
    chrome?: { cast?: { AutoJoinPolicy: { ORIGIN_SCOPED: string } } }
}

let loading: Promise<CastFramework | null> | null = null;

// One script tag per page, however many screens ask for it.
function loadCastFramework(): Promise<CastFramework | null> {
    // The static prerender runs this in Node, and a browser without Chrome's Cast support has nothing to load.
    if (typeof window === 'undefined' || (window as CastWindow).chrome === undefined) return Promise.resolve(null);
    if (loading !== null) return loading;

    const host = window as CastWindow;

    loading = new Promise(resolve => {
        host.__onGCastApiAvailable = available => {
            const framework = host.cast?.framework;
            const policy = host.chrome?.cast?.AutoJoinPolicy.ORIGIN_SCOPED;

            if (!available || framework === undefined || policy === undefined) {
                resolve(null);
                return;
            }

            framework.CastContext.getInstance().setOptions({ receiverApplicationId: CAST_APP_ID, autoJoinPolicy: policy });
            resolve(framework);
        };

        const script = document.createElement('script');
        script.src = SENDER_SDK;
        script.async = true;
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
    });

    return loading;
}

// Puts the shared screen on a Chromecast from Chrome. Same contract as the native sender: the code and nothing else.
export function useCastTable(code: string): CastTable {
    const [framework, setFramework] = useState<CastFramework | null>(null);
    const [castState, setCastState] = useState<string | null>(null);
    const [session, setSession] = useState<CastSession | null>(null);

    const asked = useRef(code);
    useEffect(() => { asked.current = code; }, [code]);

    useEffect(() => {
        let mounted = true;
        void loadCastFramework().then(found => { if (mounted) setFramework(found); });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        if (framework === null) return;

        const context = framework.CastContext.getInstance();
        const { CAST_STATE_CHANGED, SESSION_STATE_CHANGED } = framework.CastContextEventType;

        const onCastState = () => setCastState(context.getCastState());
        const onSession = () => setSession(context.getCurrentSession());

        context.addEventListener(CAST_STATE_CHANGED, onCastState);
        context.addEventListener(SESSION_STATE_CHANGED, onSession);
        onCastState();
        onSession();

        return () => {
            context.removeEventListener(CAST_STATE_CHANGED, onCastState);
            context.removeEventListener(SESSION_STATE_CHANGED, onSession);
        };
    }, [framework]);

    // The television asks for the code when it connects, in case our first send beat its listener.
    useEffect(() => {
        if (session === null) return;

        const onMessage: MessageListener = (_namespace, raw) => {
            let message: { type?: unknown } | null = null;
            try {
                message = JSON.parse(raw);
            } catch {
                return;
            }

            if (message?.type !== 'hello') return;

            void session.sendMessage(CAST_NAMESPACE, { code: asked.current }).catch(() => { });
        };

        session.addMessageListener(CAST_NAMESPACE, onMessage);
        return () => session.removeMessageListener(CAST_NAMESPACE, onMessage);
    }, [session]);

    useEffect(() => {
        if (session === null) return;

        void session.sendMessage(CAST_NAMESPACE, { code }).catch(() => { });
    }, [session, code]);

    // Chrome's own picker, which also offers "stop casting" once a session runs. Closing it rejects, which is not a failure.
    const show = useCallback(() => {
        void framework?.CastContext.getInstance().requestSession().catch(() => { });
    }, [framework]);

    return {
        available: framework !== null && castState !== null && castState !== framework.CastState.NO_DEVICES_AVAILABLE,
        connected: framework !== null && castState === framework.CastState.CONNECTED,
        show
    };
}
