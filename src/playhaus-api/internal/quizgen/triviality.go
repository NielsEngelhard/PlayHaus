package quizgen

import (
	"regexp"
	"slices"

	"playhaus-api/internal/pubquizr"
)

// graded are the rounds where the table has to think; 4 and 5 are meant to be familiar.
var graded = []int{pubquizr.RoundOpen, pubquizr.RoundChoice, pubquizr.RoundClosest, pubquizr.RoundDoubleDown, pubquizr.RoundFinale}

// A normalized prompt matching one of these is not a question: every adult answers it without recalling anything.
var trivialShapes = []*regexp.Regexp{
	regexp.MustCompile(`kleur (krijg|krijgt) je als`),
	regexp.MustCompile(`(colour|color) do you get (if|when|by)`),
	regexp.MustCompile(`welke kleur (heeft|hebben|is|zijn) (de |het |een )?(gras|sneeuw|zon|maan|lucht|hemel|zee|melk|bloed|banaan|tomaat|wolk|wolken|brandweerauto|brievenbus)`),
	regexp.MustCompile(`what (colour|color) (is|are) (the |a |an )?(grass|snow|sun|moon|sky|sea|milk|blood|banana|tomato|cloud|clouds|fire engine|postbox)`),
	regexp.MustCompile(`welke (twee |drie )?kleuren (heeft|hebben|zitten in) de vlag`),
	regexp.MustCompile(`what (two |three )?(colours|colors) (is|are|does) .*flag`),
	regexp.MustCompile(`hoeveel (benen|poten|vingers|tenen|ogen|oren|vleugels|wielen|zijden|hoeven) (heeft|hebben)`),
	regexp.MustCompile(`how many (legs|paws|fingers|toes|eyes|ears|wings|wheels|sides|hooves) does`),
	regexp.MustCompile(`hoeveel (seconden|minuten|uren|dagen|weken|maanden) (zitten er|gaan er|passen er)? ?(in|heeft|hebben) (een |de |1 )?(minuut|uur|dag|etmaal|week|maand|jaar)`),
	regexp.MustCompile(`how many (seconds|minutes|hours|days|weeks|months) (are there |are |go )?(in|does) (a |an |one |1 )?(minute|hour|day|week|month|year)`),
	regexp.MustCompile(`(welk dier|wat voor dier) (zegt|maakt het geluid)`),
	regexp.MustCompile(`welk geluid maakt (een|de) (koe|hond|kat|schaap|varken|eend|haan|kip)`),
	regexp.MustCompile(`(which|what) animal (says|goes)`),
	regexp.MustCompile(`what (sound|noise) does (a|an|the) (cow|dog|cat|sheep|pig|duck|rooster|hen) make`),
	regexp.MustCompile(`in welke (kamer|ruimte) van (het|een) huis`),
	regexp.MustCompile(`in (which|what) room of (the|a) house`),
	regexp.MustCompile(`(waar|in welke winkel) koop je (normaal |gewoonlijk )?(je )?(brood|vlees|medicijnen|bloemen|kaas|boeken)`),
	regexp.MustCompile(`(where|which shop) do you (normally |usually )?buy (your )?(bread|meat|medicine|flowers|cheese|books)`),
	regexp.MustCompile(`waarmee droog je je af`),
	regexp.MustCompile(`what do you dry yourself with`),
}

// tooEasy names the first prompt in the round that nobody at the table would have to think about.
func (r Round) tooEasy() string {
	if !slices.Contains(graded, r.Round) {
		return ""
	}

	for _, question := range r.Questions {
		prompt := normalize(question.Prompt)
		for _, shape := range trivialShapes {
			if shape.MatchString(prompt) {
				return question.Prompt
			}
		}
	}

	return ""
}
