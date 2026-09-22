package quizgen

import (
	"fmt"
	"strings"

	"playhaus-api/internal/i18n"
)

// languages is the language a locale writes its questions in, named the way the prompt has to name it.
var languages = map[i18n.Locale]string{
	i18n.NL: "Dutch",
	i18n.EN: "English",
}

// AvoidSample is how many recent prompts are quoted back as the do-not-repeat list.
const AvoidSample = 60

// systemFor is the half of the prompt that never changes within a run, and so is the half worth caching.
func systemFor(locale i18n.Locale) string {
	return fmt.Sprintf(`You write the weekly quiz for PubquizR, a pub quiz played on one phone passed round a table of three to eight friends. One player reads the question off the screen, the others answer out loud, and the phone keeps the score. Nothing is typed in: every question has to work read aloud, and every answer has to be short enough to shout.

Write every question and every answer in %s, in the register a good quizmaster uses: plain, direct, no winking, no exclamation marks, no emoji. Do not number the questions and do not address the reader.

The audience is Dutch. Assume they know the Netherlands, Europe, football, the music and films everybody has seen, and the history taught in school. Do not assume American sports, American politics, or anything that only makes sense in one country outside Europe.

Accuracy is the whole job. A wrong answer reaches real players with nobody in between to catch it, so only ask what you are certain of. Prefer a fact that has been settled for years over a recent one. Never ask for a current record holder, a current office holder, a league table, a population figure or anything else that moves, unless the question pins it to a year. Where an answer has more than one accepted wording, give the others as aliases rather than picking one and hoping.

A quiz is seven rounds and each round has its own shape. You are asked for one round at a time, and you answer only by calling the emit_round tool. Never write the round out as text.`, languages[locale])
}

// askFor is the request for one round: the count, the brief, and what not to ask again.
func askFor(spec Spec, week Week, locale i18n.Locale, avoid []string) string {
	var out strings.Builder

	day, err := week.Wednesday()
	if err == nil {
		fmt.Fprintf(&out, "This quiz is played on Wednesday %s %d. Anything seasonal should fit that week; nothing should refer to the date itself.\n\n", day.Format("2 January"), day.Year())
	}

	fmt.Fprintf(&out, "Write %s: exactly %d of them.\n\n%s\n", spec.Name, spec.Count, spec.Brief)

	if locale == i18n.NL {
		out.WriteString("\nWrite the categories in English, from the enum, even though the questions are in Dutch.\n")
	}

	if len(avoid) > 0 {
		out.WriteString("\nThese have been asked in recent weeks. Do not ask any of them again, and do not ask a reworded version of one:\n")
		for _, prompt := range avoid[:min(len(avoid), AvoidSample)] {
			fmt.Fprintf(&out, "- %s\n", prompt)
		}
	}

	return out.String()
}

// translateFor is the second locale: the same quiz in another language, so the two stay question for question the same.
func translateFor(spec Spec, locale i18n.Locale, source string) string {
	var out strings.Builder

	fmt.Fprintf(&out, `Below is %s of this week's quiz, written in %s. Put it into %s.

Keep the questions in the same order and keep every one of them: this is the same quiz in another language, not a new round. Translate the meaning rather than the words -- a question has to read as though it had been written in %s -- but do not change what is being asked, and do not change any number, name, date or unit. Keep the answers pointing at the same thing, and give the aliases a player in %s would actually say.

`, spec.Name, languages[i18n.Default], languages[locale], languages[locale], languages[locale])

	fmt.Fprintf(&out, "%s\n", source)

	return out.String()
}

// retryFor names what came back wrong, so the next attempt fixes that rather than starting over.
func retryFor(problem string) string {
	return fmt.Sprintf("That round cannot be used: %s\n\nCall emit_round again with the whole round, corrected.", problem)
}
