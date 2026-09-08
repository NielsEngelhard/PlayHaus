package joincode

// Game is which of the three a join code belongs to, and it is spelled out by the code's first character and nothing else.
type Game string

const (
	LeagueOfLetters Game = "lol"
	PubquizR        Game = "pq"
	OneOfUs         Game = "oou"
	FakeFiller      Game = "ff"
)

// Games is every game this build knows how to hand a code out for.
var Games = []Game{LeagueOfLetters, PubquizR, OneOfUs, FakeFiller}

// Valid reports whether this is a game this build has, as opposed to a string that has been cast into the type.
func (g Game) Valid() bool {
	for _, known := range Games {
		if g == known {
			return true
		}
	}
	return false
}

// Prefix is the character that names this game at the front of a code, or zero for a game this build does not have.
func (g Game) Prefix() byte {
	switch g {
	case LeagueOfLetters:
		return 'L'
	case PubquizR:
		return 'P'
	case OneOfUs:
		return 'O'
	case FakeFiller:
		return 'F'
	default:
		return 0
	}
}

// Namespace is the realtime namespace this game's rooms live in.
func (g Game) Namespace() string { return string(g) }

func (g Game) String() string { return string(g) }
