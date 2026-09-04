package joincode

// Game is which of the three a join code belongs to, and it is spelled out by the
// code's first character and nothing else -- no lookup on the server, no round trip
// from the app, no game named in the link a player was sent. Somebody reads five
// characters off a friend's screen, types them in, and the first of them is the whole
// of what decides which door opens.
//
// Every game took the obvious letter: L, P, O, F. That O reintroduces exactly the
// confusion the alphabet was stripped down to avoid is the price of the obvious letter,
// and it is paid in Normalize -- a zero typed in the first position can only ever have
// been meant as an O, because no game claims a digit there, so it is simply read as one.
// F needs no such rescue: no digit is mistaken for it.
//
// The values are the short wire tokens rather than the URL slugs the app routes on
// ("league-of-letters" and friends). Those belong to the routes and are a third
// spelling of the same idea; this one is what a socket room is named after.
type Game string

const (
	LeagueOfLetters Game = "lol"
	PubquizR        Game = "pq"
	OneOfUs         Game = "oou"
	FakeFiller      Game = "ff"
)

// Games is every game this build knows how to hand a code out for.
//
// Two of the four cannot yet be joined by one: PubquizR and One of Us are played by a
// table sharing a single phone, so there is no room for a code to open. They are here
// anyway, because the prefix is the thing being decided -- a game that picked its letter
// only on the day it grew a lobby would be picking it from whatever was left, and the
// letters are the part that has to be stable.
var Games = []Game{LeagueOfLetters, PubquizR, OneOfUs, FakeFiller}

// Valid reports whether this is a game this build has, as opposed to a string that has
// been cast into the type.
func (g Game) Valid() bool {
	for _, known := range Games {
		if g == known {
			return true
		}
	}
	return false
}

// Prefix is the character that names this game at the front of a code, or zero for a
// game this build does not have.
//
// A switch rather than a map so that the whole mapping is one readable block and there
// is no package-level state to initialise -- and so that adding a game to Games without
// giving it a letter is a hole you can see rather than a lookup that quietly misses.
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
//
// Derived rather than spelled out beside the socket code, because a room key is
// "namespace:code" and the code now names a game by itself. If the two could disagree
// then "lol:P4X2Q" would be a subscribable room for a game that will never publish into
// it -- a client could sit in it forever, correctly connected to nothing.
func (g Game) Namespace() string { return string(g) }

func (g Game) String() string { return string(g) }
