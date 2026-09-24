import BottomSheet from '@/components/ui/BottomSheet';
import { createThemedStyles } from '@/features/theme/createThemedStyles';
import { KeyboardAvoidingView, Platform } from 'react-native';
import type { QuizListItem } from '../pubquizr-quizzes';
import QuizBrowser from './QuizBrowser';

// How much of the window the sheet takes. The browse is a list, so it takes very nearly all of it.
const SHEET_HEIGHT = 0.92;

interface Props {
    onClose: () => void,
    // What a row does on the index, where picking is not what it is for.
    onOpen?: (quiz: QuizListItem) => void,
    /** Picks a quiz. Left out on the index, where a row goes to the setup screen. */
    onSelect?: (quiz: QuizListItem) => void,
    /** The quiz already chosen, ticked wherever it turns up in the rows. */
    selectedQuizId?: string,
    visible: boolean
}

// The browse, over whatever asked for it.
export default function QuizSheet({ visible, onClose, onSelect, onOpen, selectedQuizId }: Props) {
    const styles = useStyles();

    return (
        <BottomSheet heightRatio={SHEET_HEIGHT} onClose={onClose} visible={visible}>
            {/* The search field is at the top of the browser and the rows run under it. */}
            <KeyboardAvoidingView
                style={styles.body}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <QuizBrowser
                    onSelect={onSelect}
                    onOpen={onOpen}
                    selectedQuizId={selectedQuizId}
                    onClose={onClose}
                />
            </KeyboardAvoidingView>
        </BottomSheet>
    )
}

const useStyles = createThemedStyles(() => ({
    body: {
        flex: 1,
        minHeight: 0
    }
}));
