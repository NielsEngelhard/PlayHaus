import Label from "@/components/text/Label";
import { ROUTES } from "@/constants/routes";
import { Spacing } from "@/constants/theme";
import { useT } from "@/features/i18n/LanguageContext";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useRouter, type RelativePathString } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { featuredQuiz, peekQuizzes } from "../quiz-shelf";
import { usePlayableQuizzes } from "../useQuizzes";
import { QuizSkeleton } from "./QuizBrowser";
import QuizRow from "./QuizRow";
import QuizSheet from "./QuizSheet";
import RuleButton from "./RuleButton";

/** How much of the shelf the page shows before handing over to the sheet. */
const PEEK_ROWS = 3;

/**
 * A taste of the shelf, and the way into the rest of it.
 *
 * The index page used to end in the whole shelf: a bordered panel with tabs, a search
 * field and 336px of rows that scrolled inside a page that was already scrolling. It was
 * the last thing on a long page, so finding a quiz meant scrolling down to a small box
 * and then scrolling the box — two gestures, the second of them inside the first, and on
 * Android the two arguing over which of them a flick belonged to.
 *
 * So the page keeps the part that is worth having on a page — a few quizzes you can see
 * without doing anything — and the browse moves into `QuizSheet`, where it has the whole
 * screen and is the only thing on it that scrolls. **There is no scroller here at all.**
 * Three rows is few enough to simply lay on the page, which is the entire point: nothing
 * on this page scrolls except the page.
 *
 * The rows are links rather than a choice, as they were before: with nothing on this
 * page to pick a quiz *for*, tapping one goes to the setup screen carrying it.
 */
export default function QuizPeek() {
    const t = useT();
    const styles = useStyles();

    const router = useRouter();

    const [browsing, setBrowsing] = useState(false);

    /*
     * Both shelves, for one row of copy each.
     *
     * The rows come off the weekly shelf — the peek is a taste of what is new, and the
     * sheet is where the rest of the shelves live. But the count beside the label and on
     * the way through is about everything the sheet holds, so it cannot be the weekly
     * shelf's own total: "see all 11" over a sheet of twenty-six is a worse number than
     * none. Sharing `NewQuizCard`'s request rather than adding one — see `usePlayableQuizzes`.
     */
    const shelves = usePlayableQuizzes();
    const quizzes = shelves.weekly;

    // Worked out the same way the card above works it out, from the same list, so the
    // two cannot disagree about which quiz is already spoken for.
    const featured = featuredQuiz(quizzes.items);
    const rows = peekQuizzes(quizzes.items, featured, PEEK_ROWS);

    /*
     * The count is only worth saying once it is a number.
     *
     * A shelf still on its way has a total of zero, and "see all 0" is both wrong and
     * the kind of wrong that outlives the request in a screenshot. So until the answer
     * is in — and if it never comes — the way through says only where it goes.
     *
     * Which is also the whole of the failure state. Whatever went wrong, the sheet is
     * where it gets explained and where the retry lives, and this sits directly under a
     * card that has already decided to say nothing for the same reason. Two quiet
     * components beat one page carrying two accounts of one failed request.
     */
    const counted = shelves.ready && rows.length > 0;

    return (
        <View style={styles.peek}>
            <Label
                label={t('pubquizr.index.list.label')}
                value={shelves.ready
                    ? t('pubquizr.index.list.total', { quizzes: shelves.total })
                    : undefined}
            />

            <View style={styles.rows}>
                {quizzes.status === 'loading' ? (
                    <QuizSkeleton rows={PEEK_ROWS} />
                ) : (
                    rows.map(quiz => <QuizRow key={quiz.id} quiz={quiz} />)
                )}

                {/* Shown even with no rows above it: a shelf that could not be reached
                    is still a shelf, and this is the way to the screen that says so. */}
                <RuleButton
                    text={counted
                        ? t('pubquizr.index.list.seeAll', { quizzes: shelves.total })
                        : t('pubquizr.index.list.browse')}
                    onPress={() => setBrowsing(true)}
                />
            </View>

            {/*
              * The rows in here go where the rows on the page go, but by hand: the sheet
              * is a `Modal`, and on native that is a root of its own, so a route pushed
              * from under one would leave it hanging over the setup screen it opened.
              * Closed first, then pushed — see `QuizRow`'s `onPress`.
              */}
            <QuizSheet
                visible={browsing}
                onClose={() => setBrowsing(false)}
                onOpen={quiz => {
                    setBrowsing(false);
                    router.push({
                        pathname: ROUTES.quizzerOneDeviceGameSettings as RelativePathString,
                        params: { quizId: quiz.id }
                    });
                }}
            />
        </View>
    )
}

const useStyles = createThemedStyles(() => ({
    peek: {
        width: '100%'
    },

    // The same gap the rows keep inside the sheet, so the two read as one list seen in
    // two places rather than as two lists.
    rows: {
        gap: 9,
        marginTop: Spacing.one
    }
}));
