import Card from "@/components/ui/Card";
import { Spacing } from "@/constants/theme";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from "react-native";

const noop = () => { };

interface Props {
    children: ReactNode
    // Android's hardware back.
    onRequestClose?: () => void
}

// The card-over-a-dimmed-app the auth forms live in.
export default function AuthSheet({ children, onRequestClose }: Props) {
    const styles = useStyles();

    return (
        <Modal
            visible
            transparent
            animationType='fade'
            statusBarTranslucent
            onRequestClose={onRequestClose ?? noop}
        >
            <KeyboardAvoidingView
                style={styles.backdrop}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* The signup form plus an on-screen keyboard outgrows a short phone. */}
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps='handled'
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.sheet}>
                        <Card>{children}</Card>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Modal>
    )
}

const useStyles = createThemedStyles(theme => ({
    backdrop: {
        flex: 1,
        // Dimmed rather than opaque: the app stays visible behind the sheet.
        backgroundColor: theme.colors.scrimStrong
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.four
    },
    sheet: {
        width: '100%',
        maxWidth: 420
    }
}))
