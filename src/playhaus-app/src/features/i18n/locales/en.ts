export const en = {
    /** Words that turn up on more than one screen, so they are written once. */
    common: {
        retry: 'Try again',
        back: 'Back',
        backToGames: 'Back to games',
        busy: 'Working…',
        failed: 'Failed',
        close: 'Close',
        save: 'Save',
        you: 'You',
        host: 'Host',
        loading: 'One moment…',
        language: 'Language',
        /** `SelectInput` reads its closed state out as one line. */
        selectValue: '{{label}}: {{value}}',
        nothingSelected: 'nothing selected',
        players: 'players',
        /**
         * Relative time, worded so it reads correctly at every number.
         *
         * There are no i18next plural forms here on purpose: Hermes ships no
         * `Intl.PluralRules`, so a Dutch count would resolve to the wrong form. `hoursAgo`
         * says "hr" rather than "hour" for the same reason, and `daysAgo` never sees 1
         * because `yesterday` answers for that day.
         *
         * Note the variables are named for what they count rather than `count`, here and
         * everywhere else in this file. `count` is the one option name i18next treats as
         * a plural trigger, and a trigger with no plural forms behind it is a lookup
         * relying on a fallback rather than one that simply resolves.
         */
        time: {
            justNow: 'just now',
            minutesAgo: '{{minutes}} min ago',
            hoursAgo: '{{hours}} hr ago',
            yesterday: 'yesterday',
            daysAgo: '{{days}} days ago',
            onDate: 'on {{day}} {{month}} {{year}}',
            months: {
                jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr',
                may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug',
                sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec'
            }
        }
    },
    nav: {
        games: 'Games',
        reconnect: 'Reconnect',
        friends: 'Friends',
        profile: 'Profile'
    },
    chrome: {
        toDarkMode: 'Switch to dark mode',
        toLightMode: 'Switch to light mode',
        signedInAs: 'Signed in as {{name}}. Go to your profile.'
    },
    home: {
        headline: {
            title: 'Tiny games,',
            accent: 'serious fun.'
        },
        subtitle: 'Party games made for you and your friends. Pick one and play!',
        stillRunning: {
            label: 'Still going',
            /** Punctuation only, so the separator is the translator's to change. */
            line: '{{title}} · {{mode}} {{time}}'
        }
    },
    games: {
        /**
         * How many devices a game needs, as one line under its home card.
         *
         * Keyed by mode, not by game: the answer is a property of how a game is played,
         * and two games played the same way should say it with the same words.
         */
        device: {
            perPlayer: '1 per player',
            oneDevice: '1 total',
            perPlayerOrOneDevice: 'choice'
        },
        leagueOfLetters: {
            description: 'Hunt the hidden word. Solo, or humiliate your friends.',
            mainCategory: 'Word guessing',
        },
        quizzer: {
            description: 'Your own mini pub quiz. Who knows it all?.',
            mainCategory: 'Trivia'
        },
        imposter: {
            description: 'Unravel who the imposter is.',
            mainCategory: 'Bluf'
        }            
    },
    /**
     * Only the descriptions. The names themselves stay endonyms in `LANGUAGES` and are
     * never translated, so someone who cannot yet read the current interface language can
     * still find their own.
     */
    languages: {
        nl: { description: 'Words from the Dutch list.' },
        en: { description: 'Words from the English list.' }
    },
    auth: {
        login: {
            title: 'Log in',
            email: 'Email',
            emailPlaceholder: 'you@example.com',
            password: 'Password',
            passwordPlaceholder: 'Your password',
            submit: 'Log in',
            submitting: 'Signing in…',
            signupPrompt: 'No account yet? Sign up'
        },
        signup: {
            title: 'Sign up',
            name: 'Player name',
            namePlaceholder: 'Your name',
            email: 'Email',
            emailPlaceholder: 'you@example.com',
            password: 'Password',
            passwordPlaceholder: 'Pick a password',
            submit: 'Create account',
            submitting: 'Creating…',
            nameNote: 'This is the name other players see in a lobby. You can change it later in your profile.',
            invalidEmail: 'That does not look like an email address.'
        },
        guestLanguage: {
            title: 'Welcome to Playhaus',
            description: 'Pick the language you want to play in. That is all we need — one tap and you are in.',
            note: 'You start as a guest. Add an email later from your profile to keep the account for good.',
            login: 'Already have an account? Log in'
        },
        errors: {
            invalidCredentials: 'That email and password do not match an account.',
            emailInUse: 'That email address is already in use.',
            generic: 'Something went wrong. Please try again.',
            network: 'Could not reach the server. Check your connection and try again.'
        }
    },
    profile: {
        loading: 'Loading your profile…',
        card: { action: 'My profile', caption: 'This is you!' },
        name: {
            label: 'Player name',
            placeholder: 'Your name',
            random: 'Random name',
            note: 'Min {{min}}, max {{max}} characters. This is what other players see in a lobby.'
        },
        avatar: { title: 'Avatar colour' },
        colors: {
            lemon: 'Lemon',
            fire: 'Fire',
            cobalt: 'Cobalt',
            mint: 'Mint',
            blush: 'Blush',
            ink: 'Ink'
        },
        settings: {
            title: 'Settings',
            sounds: { title: 'Sound', description: 'A soft pop on every tap.' },
            music: { title: 'Music', description: 'Calm background music, a little faster while you play.' },
            vibration: { title: 'Vibration', description: 'Short haptic feedback on mobile.' }
        },
        guest: {
            title: 'Guest account',
            message: 'You are playing as a guest. This account is temporary: your name, colour and played games can be lost once this session ends. Add an email and a password to keep them for good.',
            action: 'Make it permanent'
        },
        upgrade: {
            title: 'Keep your account',
            description: 'Add an email and a password and this account becomes permanent. Your name, colour and games all stay exactly as they are.',
            email: 'Email',
            emailPlaceholder: 'you@example.com',
            password: 'Password',
            passwordPlaceholder: 'Pick a password',
            submit: 'Make it permanent',
            submitting: 'Saving…',
            note: 'From then on you log in with this email and password on any device.',
            invalidEmail: 'That does not look like an email address.',
            shortPassword: 'Your password needs at least 8 characters.'
        },
        logout: 'Log out',
        errors: {
            expired: 'Your session has expired. Log in again.',
            generic: 'Something went wrong. Please try again.',
            network: 'Could not reach the server. Check your connection and try again.'
        }
    },
    reconnect: {
        hero: {
            checking: { title: 'Where did you', accent: 'leave off?' },
            waiting: { title: 'Jump back', accent: 'in.' },
            empty: { title: 'Nothing is', accent: 'running.' }
        },
        description: {
            checking: 'We are checking which games are still open for you.',
            waiting: 'You have games open. Pick one up where you left off.',
            empty: 'Start a game and walk away. It is still here when you come back.'
        },
        loading: 'Looking for your games…',
        updated: 'Updated {{time}}',
        noGames: {
            title: 'No games open',
            message: 'Anything you leave half played turns up here, solo or in a lobby.',
            action: 'Pick a game'
        },
        resume: 'Continue playing',
        refresh: { label: 'Refresh the list', action: 'Refresh' },
        mode: { solo: 'Solo', lobby: 'Lobby' },
        errors: {
            expired: 'Your session has expired. Log in again.',
            generic: 'Something went wrong while fetching your games. Please try again.',
            network: 'Could not reach the server. Check your connection and try again.'
        }
    },
    lol: {
        index: {
            description: 'Test your vocabulary, challenge your friends, and try to guess the secret word before you run out of chances. Play solo or against your enemies.',
            playingAs: 'Playing as {{name}}',
            changeProfile: 'Change profile',
            change: 'Change',
            solo: { title: 'Solo', description: 'Three rounds, your rules.', action: 'Set up' },
            multiplayer: { title: 'Multiplayer', description: 'Race against your friends.', action: 'Open' },
            join: {
                label: 'Or join a lobby',
                hint: '{{length}} characters, then you are in automatically',
                paste: 'Paste',
                pasteLabel: 'Paste code',
                codeLabel: 'Lobby code'
            }
        },
        settings: {
            loading: 'Looking for your game…',
            title: 'Set up your\ngame',
            description: 'Choose how you want to play, then start.',
            wordLength: 'Word length',
            wordLengthOption: '{{letters}} letters',
            hardMode: {
                label: 'Hard mode',
                description: 'The word can be any existing word in the language. Switch it off to play with an easier set of words.'
            },
            facts: '{{rounds}} rounds · {{guesses}} guesses per round · first letter given',
            start: 'Start playing',
            running: {
                title: 'You are already playing',
                message: 'A solo game is still open. Continue where you left off, or throw it away and set up a new one.',
                resume: 'Continue playing',
                discard: 'Throw it away'
            }
        },
        game: {
            loading: 'Loading game…',
            loadFailed: 'This game could not be loaded.',
            guessUnsupported: 'Guessing works as soon as the server supports it.',
            alreadyGuessedYou: 'You tried that one already.',
            alreadyGuessed: 'That one has been tried already.',
            resultLabel: 'Result',
            viewResult: 'View the result',
            nextRound: 'Next round',
            guesses: 'Guesses: {{guesses}}',
            roundOf: 'Round {{round}} of {{total}}',
            hint: 'Hint',
            hintLabel: 'Hint: the word starts with {{letter}}',
            solved: 'SOLVED',
            lost: 'BAD LUCK',
            theWord: 'The word',
            attempts: 'Guesses',
            guess: 'Guess',
            clear: 'Clear',
            timeLeft: 'Time left',
            yourTurn: 'YOUR TURN',
            typing: 'typing…'
        },
        results: {
            loading: 'Loading the result…',
            loadFailed: 'The result could not be loaded.',
            title: 'Game over',
            summary: 'Rounds: {{rounds}} · Letters: {{length}}',
            again: 'Once more'
        },
        lobby: {
            loading: 'Looking for your lobby…',
            opening: 'Opening the lobby…',
            noGame: 'No game',
            noLobby: 'No lobby',
            hostStoppedGame: 'The host stopped the game. Ask for a new code for another round.',
            hostClosedLobby: 'The host closed the lobby. Ask for a new code.',
            running: {
                gameTitle: 'You are already playing',
                lobbyTitle: 'You still have a lobby open',
                gameMessage: 'You are still playing a multiplayer game in lobby {{code}}. Continue, or stop the game and open a new lobby.',
                lobbyMessage: 'Lobby {{code}} is still open in your name. Go back to it, or close it and open a new one.',
                resumeGame: 'Continue playing',
                resumeLobby: 'Go to open lobby',
                stopGame: 'Stop game',
                closeLobby: 'Stop game and create new'                
            },
            confirmClose: {
                title: 'Close the lobby?',
                message: 'The lobby is deleted and the code stops working. Everyone already in it is thrown out.',
                action: 'Close'
            },
            confirmLeave: {
                title: 'Leave the lobby?',
                message: 'You go back to the game menu. You can join again later with the same code.',
                action: 'Leave'
            },
            stay: 'Stay here',
            start: 'Start the game',
            startNote: 'Once you start, nobody else can join.',
            needPlayers: 'You need at least one other player.',
            hostFallback: 'The host',
            close: 'Close the lobby',
            leave: 'Leave the lobby',
            youHost: 'You host',
            connected: 'Connected to lobby {{code}}',
            disconnected: 'Lost the connection to the lobby',
            code: 'Lobby code',
            named: 'Lobby {{code}}',
            shareTitle: 'Join my lobby',
            codeSpoken: 'Lobby code: {{characters}}',
            copyCode: 'Copy lobby code {{characters}}',
            copied: 'Copied',
            readAloud: 'Read it out, or',
            shareLinkLabel: 'Share the link to this lobby',
            shareLink: 'Share the link',
            linkCopied: 'Link copied',
            shareFailed: 'Sharing did not work',
            players: 'Players',
            playerCount: '{{taken}} of {{max}}',
            inLobby: 'In the lobby',
            hostYou: 'HOST · YOU',
            hostTag: 'HOST',
            ready: 'Ready',
            away: 'Away',
            freeSeat: 'Free seat',
            waiting: 'Waiting…',
            settingsTitle: 'Game settings',
            timePerTurn: 'Time per turn',
            timePerTurnOption: '{{seconds}} seconds',
            waitingForHost: 'Waiting for the host',
            waitingForHostMessage: '{{name}} is setting up the game. Stay on this screen and it starts right here.',
            waitingLabel: 'Waiting',
            closedTitle: 'Lobby closed',
            results: {
                title: 'Game over',
                tie: 'A tie at {{score}} points.',
                youWin: 'You win with {{score}} points.',
                playerWins: '{{name}} wins with {{score}} points.',
                againSamePlayers: 'Once more, same players',
                autoJoin: 'Everyone still on this screen is taken along to the new lobby automatically.',
                anotherRound: 'Another round?',
                hostCanOpen: 'The game is done. The host can open a new lobby. Stay here and you come along automatically.'
            }
        },
        errors: {
            staleServer: 'The server is running an older version of this game. Restart the API and try again.',
            expired: 'Your session has expired. Log in again.',
            gameGone: 'This game no longer exists.',
            badSettings: 'These settings do not work. Pick a different word length.',
            generic: 'Something went wrong. Please try again.',
            network: 'Could not reach the server. Check your connection and try again.',
            invalidWord: 'Not a valid word.',
            roundClosed: 'This round is not taking any more guesses.',
            lobbyFull: 'This lobby is full.',
            lobbyGone: 'This lobby does not exist any more. Check the code.',
            alreadyStarted: 'This game has already started.'
        }
    },
    friends: {
        title: 'Friends',
        description: 'Play together, keep track of who wins and challenge each other.',
        soon: {
            title: 'Coming soon',
            message: 'Friend lists, invites and head to head standings are on the way. For now you play together with a lobby code.'
        }
    }
} as const;
