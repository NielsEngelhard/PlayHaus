import AppText from "@/components/text/AppText";
import PopupModal from "@/components/ui/PopupModal";
import TextButton from "@/components/ui/TextButton";
import { FontSizes, Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { codeFromScan } from "@/features/join/join-link";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef } from "react";
import { View } from "react-native";

interface Props {
    visible: boolean,
    /** A join code the camera read and recognised. Fires at most once per opening. */
    onCode: (code: string) => void,
    onClose: () => void
}

// Joining by pointing the camera at the host's screen.
export default function ScanToJoin({ visible, onCode, onClose }: Props) {
    const styles = useStyles();
    const t = useT();

    const [permission, requestPermission] = useCameraPermissions();

    // Whether this opening has already found a code.
    const found = useRef(false);

    // Cleared on the way *in* rather than on the way out.
    useEffect(() => {
        if (visible) found.current = false;
    }, [visible]);

    function handle(data: string) {
        if (found.current) return;

        const code = codeFromScan(data);

        // Silence is the right answer to a QR that is not ours.
        if (code === null) return;

        found.current = true;

        // Closed first, so the camera is already gone by the time the room starts loading over the top of it.
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
            title={t('join.scanTitle')}
            message={t('join.scanCopy')}
            onRequestClose={close}
        >
            <View style={styles.stage}>
                {permission?.granted
                    ? (
                        <CameraView
                            style={styles.camera}
                            facing='back'
                            // Only QR.
                            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                            // Latched on the way in rather than unset here.
                            onBarcodeScanned={result => handle(result.data)}
                        />
                    )
                    : <Waiting />}
            </View>

            {permission?.granted !== true && (
                <AppText style={styles.note}>
                    {permission !== null && !permission.canAskAgain
                        ? t('join.permissionDenied')
                        : t('join.permissionAsk')}
                </AppText>
            )}

            {/* Only while there is a question left to answer. */}
            {permission?.granted !== true && permission?.canAskAgain !== false && (
                <TextButton
                    text={t('join.permissionGrant')}
                    variant='primary'
                    fullWidth
                    onPress={() => void requestPermission()}
                />
            )}

            <TextButton
                text={t('join.scanCancel')}
                variant='muted'
                fullWidth
                onPress={close}
            />
        </PopupModal>
    )
}

// What fills the viewfinder before there is one.
function Waiting() {
    const styles = useStyles();

    return <View style={styles.waiting} />;
}

const useStyles = createThemedStyles(theme => ({
    stage: {
        // Square, and the widest the panel allows.
        width: '100%',
        aspectRatio: 1,
        marginBottom: Spacing.three,
        borderRadius: 18,
        borderWidth: theme.borderWidth,
        borderColor: theme.colors.borderStrong,
        // The camera fills its parent, and a square lens feed in a rounded frame keeps its corners unless the frame clips them itself.
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
