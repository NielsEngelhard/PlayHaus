import AppText from "@/components/text/AppText";
import { createThemedStyles } from "@/features/theme/createThemedStyles";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { QuizListResponse } from "../pubquizr-quizzes";
import { useQuizzes } from "../useQuizzes";

export default function QuizList() {
    const q = useQuizzes()

    const [quizzes, setQuizzes] = useState<QuizListResponse | null>();

    useEffect(() => {
        q.getQuizzes().then((resp) => {
            setQuizzes(resp)
        })
    });

    return (
        <View>
            <AppText>{quizzes?.total ?? "niks"}</AppText>
        </View>
    )
}

const useStyles = createThemedStyles(theme => ({

}))