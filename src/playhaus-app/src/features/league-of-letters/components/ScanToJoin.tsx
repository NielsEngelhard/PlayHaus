import AppText from "@/components/text/AppText";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { codeFromScan } from "@/features/league-of-letters/join-link";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef } from "react";
import { View } from "react-native";

interface Props {
    visible: boolean,
    /** A join code the camera read and recognised. Fires at most once per opening. */
    onCode: (code: string) => void,
    onClose: () => void
}

/**
 * Joining by pointing the camera at the host's screen.
 *
 * The fastest way in when the host is in the room with you: their code is already on
 * screen, and reading four characters off it out loud is slower and easier to get wrong
 * than holding a phone up to it.
 *
 * A panel rather than part of the card, because a viewfinder is the only thing that should
 * be on screen while it is open — a live camera tucked into the corner of a form is both
 * distracting and, when it is pointed at whatever the phone happens to be facing,
 * faintly alarming. Closing it unmounts the `CameraView`, which is what puts the lens
 * light out; leaving it mounted and merely hidden would not.
 */
export default function ScanToJoin({ visible, onCode, onClose }: Props) {
    const styles = useStyles();
    const t = useT();

    const [permission, requestPermission] = useCameraPermissions();

    /**
     * Whether this opening has already found a code.
     *
     * `onBarcodeScanned` fires per frame, not per code, so a camera resting on a QR for
     * half a second delivers it thirty times. The same shape as the `sent` ref in
     * `JoinCodeCard` and for the same reason: the first one wins and the rest are noise.
     */
    const found = useRef(false);

    // Cleared on the way *in* rather than on the way out. A hit has to keep the latch set
    // through the close — frames already in flight arrive after `onClose` and would each
    // push the room again — so the only safe place to let go of it is the next opening.
    useEffect(() => {
        if (visible) found.current = false;
    }, [visible]);

    function handle(data: string) {
        if (found.current) return;

        const code = codeFromScan(data);

        // Silence is the right answer to a QR that is not ours. A lens sweeping a table
        // crosses parcel labels and menus on the way to the host's screen, and a panel
        // that complained about each one would be unusable.
        if (code === null) return;

        found.current = true;

        // Closed first, so the camera is already gone by the time the room starts loading
        // over the top of it.
        onClose();
        onCode(code);
    }

    /** Leaving without a code. The latch is the opening's business, not this one's. */
    function close() {
        onClose();
    }

    return (
        <PopupModal
            visible={visible}
            title={t('lol.index.join.scanTitle')}
            message={t('lol.index.join.scanCopy')}
            onRequestClose={close}
        >
            <View style={styles.stage}>
                {permission?.granted
                    ? (
                        <CameraView
                            style={styles.camera}
                            facing='back'
                            // Only QR. Every extra format is another detector run against
                            // every frame, and nothing else here encodes a join link.
                            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                            // Latched on the way in rather than unset here: dropping the
                            // handler takes a frame to reach the camera, and more results
                            // arrive in the meantime.
                            onBarcodeScanned={result => handle(result.data)}
                        />
                    )
                    : <Waiting />}
            </View>

            {permission?.granted !== true && (
                <AppText style={styles.note}>
                    {permission !== null && !permission.canAskAgain
                        ? t('lol.index.join.permissionDenied')
                        : t('lol.index.join.permissionAsk')}
                </AppText>
            )}

            {/* Only while there is a question left to answer. Android and the browser both
                refuse a second prompt once it has been turned down for good, so offering
                one there is a button that does nothing. */}
            {permission?.granted !== true && permission?.canAskAgain !== false && (
                <TextButton
                    text={t('lol.index.join.permissionGrant')}
                    variant='primary'
                    fullWidth
                    onPress={() => void requestPermission()}
                />
            )}

            <TextButton
                text={t('lol.index.join.scanCancel')}
                variant='muted'
                fullWidth
                onPress={close}
            />
        </PopupModal>
    )
}

/**
 * What fills the viewfinder before there is one.
 *
 * A flat panel rather than a spinner: nothing is loading. The camera is waiting on an
 * answer from the player, and the line under it is where that answer gets asked for.
 */
function Waiting() {
    const styles = useStyles();

    return <View style={styles.waiting} />;
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        // Square, and the widest the panel allows. A viewfinder that has to be aimed
        // wants to be as big as the thing it is inside of.
        width: '100%',
        aspectRatio: 1,
        marginBottom: Spacing.three,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        // The camera fills its parent, and a square lens feed in a rounded frame keeps
        // its corners unless the frame clips them itself.
        overflow: 'hidden',
        backgroundColor: theme.colors.backgroundInput
    },
    camera: {
        flex: 1
    },
    waiting: {
        flex: 1,
        backgroundColor: theme.colors.backgroundInput
    },
    note: {
        marginBottom: Spacing.three,
        fontSize: FontSizes.sm,
        lineHeight: FontSizes.sm * 1.45,
        color: theme.colors.textSecondary
    }
}))
