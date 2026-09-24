package quizgen

import (
	"testing"

	"playhaus-api/internal/pubquizr"
)

func round(number int, prompts ...string) Round {
	built := Round{Round: number}
	for _, prompt := range prompts {
		built.Questions = append(built.Questions, pubquizr.QuestionFile{Prompt: prompt})
	}

	return built
}

// These four shipped in weeks 39 and 40 and are the reason the gate exists.
func TestAQuestionEverybodyAnswersWithoutThinkingIsRejected(t *testing.T) {
	for _, prompt := range []string{
		"Hoeveel seconden zitten er in een minuut?",
		"Welke kleur heeft gras?",
		"Hoeveel vingers heeft een mens aan twee handen?",
		"In welke kamer van het huis kook je?",
		"Welke kleur heeft de zon?",
		"Hoeveel poten heeft een kat?",
		"Welk geluid maakt een koe?",
		"Waar koop je brood?",
		"Welke twee kleuren heeft de vlag van Japan?",
		"Welke kleur krijg je als je blauw en geel mengt?",
		"How many seconds are there in a minute?",
		"What colour is grass?",
		"How many legs does a cat have?",
		"What sound does a cow make?",
	} {
		if found := round(pubquizr.RoundOpen, prompt).tooEasy(); found != prompt {
			t.Errorf("%q passed the gate", prompt)
		}
	}
}

// An easy question is still a question: most of the table gets it and one or two miss it.
func TestACorrectlyPitchedEasyQuestionPasses(t *testing.T) {
	for _, prompt := range []string{
		"Welk metaal is vloeibaar bij kamertemperatuur?",
		"Wat is de hoofdstad van Australie?",
		"Welke kleur draagt de leider van de Tour de France?",
		"Hoeveel spelers heeft een voetbalelftal op het veld?",
		"Hoeveel dagen duurde de Zesdaagse Oorlog?",
		"Which metal is liquid at room temperature?",
		"What is the capital of Australia?",
	} {
		if found := round(pubquizr.RoundOpen, prompt).tooEasy(); found != "" {
			t.Errorf("%q was rejected as too easy", found)
		}
	}
}

// Rounds 4 and 5 are meant to be familiar, so the gate has no business there.
func TestTheGateLeavesTheFamiliarRoundsAlone(t *testing.T) {
	for _, number := range []int{pubquizr.RoundDescribe, pubquizr.RoundList} {
		if found := round(number, "Welke kleur heeft gras?").tooEasy(); found != "" {
			t.Errorf("round %d rejected %q", number, found)
		}
	}
}

func TestTheGateFindsATrivialQuestionAnywhereInTheRound(t *testing.T) {
	built := round(pubquizr.RoundDoubleDown,
		"Welk metaal is vloeibaar bij kamertemperatuur?",
		"Wat is de hoofdstad van Australie?",
		"Hoeveel wielen heeft een fiets?",
	)

	if found := built.tooEasy(); found != "Hoeveel wielen heeft een fiets?" {
		t.Errorf("found %q", found)
	}
}
