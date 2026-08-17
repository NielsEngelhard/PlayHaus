import Card from "@/components/ui/Card";
import { Spacing } from "@/constants/theme";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from "react-native";

const noop = () => { };

interface Props {
    children: ReactNode
    /**
     * Android's hardware back. Leave it out for a sheet there is deliberately no
     * way past — the gate — and pass the close for one that is an offer.
     */
    onRequestClose?: () => void
}

/**
 * The card-over-a-dimmed-app the auth forms live in.
 *
 * Shared by the gate, which stands in front of the app until there is a session,
 * and by the account modal a guest opens from their profile. The forms inside
 * are the same either way, so the chrome around them has to be too — a second
 * hand-rolled copy would drift the moment one of them was touched.
 *
 * Not `PopupModal`: that one is a titled panel with an actions row, and these
 * are full forms that bring their own header.
 */
export default function AuthSheet({ children, onRequestClose }: Props) {
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
                {/* The signup form plus an on-screen keyboard outgrows a short phone,
                    so the card scrolls rather than clipping its submit button. */}
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

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        // Dimmed rather than opaque: the app stays visible behind the sheet, so it
        // reads as "not yet" rather than as a different app.
        backgroundColor: 'rgba(15, 13, 18, 0.6)'
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
})
