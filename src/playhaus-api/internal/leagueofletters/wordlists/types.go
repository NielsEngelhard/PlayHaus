package wordlists

import "fmt"

type WordLanguage string

const (
	Dutch   WordLanguage = "nl"
	English WordLanguage = "en"
)

func ParseLanguage(s string) (WordLanguage, error) {
	switch WordLanguage(s) {
	case Dutch:
		return Dutch, nil
	case English:
		return English, nil
	default:
		return "", fmt.Errorf("unknown language %q", s)
	}
}

type WordLength int

const (
	Length3 WordLength = 3
	Length4 WordLength = 4
	Length5 WordLength = 5
	Length6 WordLength = 6
	Length7 WordLength = 7
	Length8 WordLength = 8
)

// Lengths is every supported word length. loadLists walks it to find the files
// it must embed, so a length added here without a matching data file fails at
// startup rather than at the first round that asks for it.
var Lengths = []WordLength{Length3, Length4, Length5, Length6, Length7, Length8}

func ParseLength(n int) (WordLength, error) {
	switch WordLength(n) {
	case Length3, Length4, Length5, Length6, Length7, Length8:
		return WordLength(n), nil
	default:
		return 0, fmt.Errorf("unsupported word length %d", n)
	}
}
