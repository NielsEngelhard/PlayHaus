export const en = {
    common: {
        retry: 'Try again',
        back: 'Back',
        backToGames: 'Back',
        busy: 'Working…',
        failed: 'Failed',
        close: 'Close',
        save: 'Save',
        you: 'You',
        host: 'Host',
        yourTurn: 'YOUR TURN',
        and: 'and',
        on: 'ON',
        off: 'OFF',
        loading: 'Loading…',
        language: 'Language',
        selectValue: '{{label}}: {{value}}',
        nothingSelected: 'nothing selected',
        change: 'change',
        minutes: 'min',
        start: 'Start',
        next: 'Next',
        stepOf: 'Step {{step}} of {{total}}',
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
            },
            days: {
                mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
                fri: 'Fri', sat: 'Sat', sun: 'Sun'
            }
        },
        player: {
            players: 'Players',
            add: 'Add',
            remove: 'Remove',
            namePlaceholder: 'Name',
            seated: '{{players}} players'
        }
    },
    nav: {
        games: 'Games',
        reconnect: 'Reconnect',
        friends: 'Friends',
        profile: 'Profile'
    },
    chrome: {
        toDarkMode: 'Dark mode',
        toLightMode: 'Light mode',
        muteSound: 'Sound off',
        unmuteSound: 'Sound on',
        signedInAs: 'Signed in as {{name}}. Go to your profile.'
    },
    notFound: {
        title: 'Page not found',
        message: "This page doesn't exist (anymore).",
        action: 'Go home'
    },
    home: {
        headline: {
            title: 'Tiny games,',
            accent: 'serious fun.'
        },
        subtitle: 'Party games for you and your friends. Pick one and play!',
        stillRunning: {
            label: 'Still going',
            line: '{{title}} · {{mode}} {{time}}'
        },
        join: {
            placeholder: 'CODE',
            action: 'Join',
            label: 'Lobby code'
        },
        startNew: 'All games',
        bottomTeaser: 'More games on the way...'
    },
    games: {
        device: {
            perPlayer: '1 per player',
            oneDevice: '1 total',
            perPlayerOrOneDevice: 'choice'
        },
        leagueOfLetters: {
            description: 'Guess the word. Solo or against friends.',
            mainCategory: 'Word guessing'
        },
        quizzer: {
            description: 'Test your general knowledge.',
            mainCategory: 'Trivia'
        },
        oneOfUs: {
            description: "Who's the imposter?",
            mainCategory: 'Bluff'
        },
        fakeFiller: {
            description: 'Make up a wrong answer.',
            mainCategory: 'Deception'
        },
        wittyWars: {
            description: 'Be funnier than the rest.',
            mainCategory: 'Party'
        },
        newBadge: 'New',
        wipBadge: 'Coming soon'
    },
    join: {
        label: 'JOIN A GAME',
        paste: 'Paste',
        pasteLabel: 'Paste code',
        codeLabel: 'Join code',
        gameHint: 'Joining {{game}}',
        rejected: "That code doesn't work. Check it and try again."
    },
    languages: {
        nl: { description: 'Games in Dutch' },
        en: { description: 'Games in English' }
    },
    auth: {
        login: {
            title: 'Log in',
            email: 'Email',
            emailPlaceholder: 'you@example.com',
            password: 'Password',
            passwordPlaceholder: 'Your password',
            submit: 'Log in',
            submitting: 'Logging in…',
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
            nameNote: 'Other players see this name in the lobby. You can change it later.',
            invalidEmail: "That's not a valid email address."
        },
        guestLanguage: {
            title: 'Welcome to Playhaus',
            description: 'Which language do you want to play in?',
            note: "Next you pick a name and play as a guest. You can make a real account later, it's free.",
            login: 'Already have an account? Log in'
        },
        guestUsername: {
            title: 'Pick a name',
            description: 'Other players see this name in the lobby. You can change it later.',
            placeholder: 'Your name',
            random: 'Random name',
            note: 'Min {{min}}, max {{max}} characters.',
            submit: 'Continue',
            submitting: 'Signing up…'
        },
        errors: {
            invalidCredentials: 'Wrong email or password.',
            emailInUse: 'That email address is already in use.',
            generic: 'Something went wrong. Try again.',
            network: 'No connection. Check your internet and try again.'
        }
    },
    profile: {
        loading: 'Loading profile…',
        card: { action: 'My profile', caption: 'This is you, gorgeous!' },
        name: {
            label: 'Player name',
            placeholder: 'Your name',
            random: 'Random name',
            note: 'Min {{min}}, max {{max}} characters. Other players see this name in the lobby.'
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
            music: { title: 'Music', description: 'Music in the lobby and while you play.' },
            vibration: { title: 'Vibration', description: 'A short buzz when you tap on your phone.' }
        },
        guest: {
            title: 'Guest account',
            message: "You're playing as a guest. Guest accounts get cleaned up now and then, and your stats go with them. Add an email and password to keep your account.",
            action: 'Upgrade (free)'
        },
        upgrade: {
            title: 'Keep your account',
            description: 'Add an email and password. Your name, colour and games all stay.',
            email: 'Email',
            emailPlaceholder: 'you@example.com',
            password: 'Password',
            passwordPlaceholder: 'Pick a password',
            submit: 'Save account',
            submitting: 'Saving…',
            note: 'Use these to log in on any device from now on.',
            invalidEmail: "That's not a valid email address.",
            shortPassword: 'Your password needs at least 8 characters.'
        },
        logout: 'Log out',
        errors: {
            expired: 'Your session expired. Log in again.',
            generic: 'Something went wrong. Try again.',
            network: 'No connection. Check your internet and try again.'
        }
    },
    reconnect: {
        hero: {
            title: 'Join a game', accent: 'with a code',
            resume: { title: 'Pick up', accent: 'where you left off' }
        },
        loading: 'Finding your games…',
        stillRunning: 'Still going',
        orJoin: 'Or join a game',
        nothingRunning: 'Nothing running',
        updated: 'Updated {{time}}',
        resume: 'Continue {{game}}',
        refresh: { label: 'Check for games again', action: 'Refresh' },
        empty: {
            title: 'No games running',
            message: 'Games you leave halfway show up here.'
        },
        mode: { solo: 'Solo', lobby: 'Lobby', oneDevice: '1 phone', tournament: 'Tournament' },
        errors: {
            expired: 'Your session expired. Log in again.',
            generic: "Couldn't load your games. Try again.",
            network: 'No connection. Check your internet and try again.'
        },
        codeNotFound: "That code doesn't exist. Check it and try again."
    },
    lobby: {
        yourRoom: 'Your lobby',
        named: 'Lobby {{code}}',
        live: 'Live',
        offline: 'Offline',
        disconnected: 'Lost connection to the lobby',
        close: 'Close lobby',
        leave: 'Leave lobby',
        shareCodeInvite: 'Share this code with your friends',
        code: 'Lobby code',
        codeSpoken: 'Lobby code: {{characters}}',
        copyCode: 'Copy lobby code {{characters}}',
        copied: 'Copied',
        shareTitle: 'Join my lobby',
        copyLink: 'Copy link',
        copyLinkLabel: 'Copy the link to this lobby',
        shareLink: 'Share',
        shareLinkLabel: 'Share the link to this lobby',
        players: 'Players',
        playerCount: '{{taken}} of {{max}}',
        minPlayers: 'Min {{min}}',
        inLobby: 'In the lobby',
        hostYou: 'Host · you',
        hostTag: 'Host',
        away: 'Away',
        freeSeat: 'Open spot',
        invite: 'Invite',
        seatsLeftOne: '1 spot left',
        seatsLeftMany: '{{seats}} spots left',
        needPlayersOne: '1 more player needed',
        needPlayersMany: '{{count}} more players needed',
        tapToInvite: 'Tap to invite a friend',
        waitingForHost: 'Waiting for the host',
        waitingForHostMessage: '{{name}} is setting up the game. Stay on this screen, it starts by itself.',
        waitingLabel: 'Waiting',
        closedTitle: 'Lobby closed'
    },
    scoreboard: {
        eyebrow: 'Final standings',
        subtitle: '{{game}} · {{rounds}} rounds',
        winner: 'Winner',
        draw: 'Draw',
        points: '{{score}} points',
        pointsStars: '{{stars}} ★ · {{score}}',
        stars: '{{stars}} ★',
        standings: 'Full standings',
        playAgain: 'Another game',
        waitingForHost: 'The host can start a new game, ',
        stayHere: 'stay here'
    },
    lol: {
        index: {
            description: 'Guess the secret word.',
            playingAs: 'Playing as {{name}}',
            solo: {
                title: 'Solo',
                description: 'Just you, nice and easy.',
                action: 'Set up',
                best: 'Best {{score}}'
            },
            multiplayer: { title: 'Multiplayer', description: 'Create a lobby.', action: 'Open' },
            wordOfTheDay: {
                title: 'Word of the day',
                resetIn: 'New word in {{time}}'
            },
            tournament: {
                badge: 'New',
                title: 'Tournament',
                description: "4 to 12 players, 1v1 (1v1v1 if it's odd), four rounds per match. Lose twice and you're out.",
                action: 'Create tournament'
            }
        },
        settings: {
            loading: 'Finding your game…',
            title: 'Solo',
            wordLength: 'Word length',
            wordLengthOption: '{{letters}} letters',
            summary: {
                seconds: '{{seconds}}s',
                hardOn: 'Hard',
                hardOff: 'Normal',
                zen: 'Zen',
                competitive: 'Competitive'
            },
            mode: {
                title: 'Game mode',
                badge: 'New',
                zen: {
                    label: 'Zen',
                    description: 'No clock, no score. No pressure!'
                },
                competitive: {
                    label: 'Competitive',
                    description: 'Guess all three words as fast as you can, in as few tries as you can. Faster means more points.'
                }
            },
            hardMode: {
                label: 'Hard mode',
                description: 'Any real word can come up. Turn it off for common words only.'
            },
            facts: '{{rounds}} rounds · {{guesses}} guesses per round · first letter given',
            competitiveFacts: '{{rounds}} rounds · {{guesses}} guesses per round · time bonus up to {{minutes}} minutes',
            start: 'Start',
            running: {
                title: 'You still have a game open',
                message: 'Pick up where you left off, or throw it away and start over.',
                resume: 'Continue',
                discard: 'Throw away'
            }
        },
        game: {
            loading: 'Loading game…',
            loadFailed: "Couldn't load the game.",
            guessUnsupported: "This server doesn't support guessing yet.",
            alreadyGuessedYou: 'You already tried that.',
            alreadyGuessed: 'Someone already tried that.',
            mustStartWith: 'The word starts with {{letter}}.',
            resultLabel: 'Result',
            viewResult: 'See the result',
            nextRound: 'Next round',
            guesses: '{{guesses}}/{{max}}',
            roundOf: 'Round {{round}} of {{total}}',
            hint: 'Hint',
            hintLabel: 'Hint: the word starts with {{letter}}',
            dailyLabel: 'Word of the day',
            solved: 'SOLVED',
            lost: 'BAD LUCK',
            theWord: 'The word',
            attempts: 'Guesses',
            guess: 'GO',
            clear: 'Clear',
            timeLeft: 'Time left',
            wordLengthLabel: '{{letters}} letters',
            scoreLabel: '{{name}}, {{score}} points',
            scoreCompactLabel: '{{score}} points',
            playTimeLabel: 'Play time: {{time}}',
            yourTurnNotice: 'YOUR TURN!'
        },
        results: {
            loading: 'Loading result…',
            loadFailed: "Couldn't load the result.",
            title: 'Game over',
            summary: 'Rounds: {{rounds}} · Letters: {{length}}',
            baseScore: 'Guesses',
            timeBonus: 'Time bonus',
            total: 'Total',
            newHighScore: 'New record at {{letters}} letters!',
            again: 'Play again'
        },
        lobby: {
            loading: 'Finding the lobby…',
            opening: 'Opening lobby…',
            noGame: 'No game',
            noLobby: 'No lobby',
            hostStoppedGame: 'The host stopped the game. Ask for a new code.',
            hostClosedLobby: 'The host closed the lobby. Ask for a new code.',
            running: {
                gameTitle: "You're already playing",
                lobbyTitle: 'You still have a lobby open',
                gameMessage: "You're still playing in lobby {{code}}. Continue, or stop and open a new lobby.",
                lobbyMessage: 'Lobby {{code}} is still open. Go back, or close it and open a new one.',
                resumeGame: 'Continue',
                resumeLobby: 'Go to open lobby',
                stopGame: 'Stop game',
                closeLobby: 'Close and start new'
            },
            confirmClose: {
                title: 'Close the lobby?',
                message: 'The code stops working and everyone in the lobby gets kicked out.',
                action: 'Close'
            },
            confirmLeave: {
                title: 'Leave the lobby?',
                message: 'You can come back later with the same code.',
                action: 'Leave'
            },
            stay: 'Stay here',
            start: 'Start the game',
            startNote: 'Nobody can join once you start.',
            needPlayers: 'You need at least one other player.',
            hostFallback: 'The host',
            settingsTitle: 'Settings',
            timePerTurn: 'Time per turn',
            timePerTurnOption: '{{seconds}} seconds'
        },
        wordOfTheDay: {
            eyebrow: 'Word of the day',
            streakDays: '{{days}} days in a row',
            guesses: 'Guesses',
            legendMissed: 'Missed',
            statBest: 'Best day',
            statAverage: 'Average',
            statDays: 'Days',
            playDay: 'Play {{day}}',
            playHint: '{{letters}} letters · no clock',
            resume: 'Continue',
            nextWord: 'New word in {{time}}',
            bestAndNext: 'Your best is {{guesses}} · new word in {{time}}',
            solvedInOne: 'Solved in {{guesses}} guess',
            solvedInMany: 'Solved in {{guesses}} guesses',
            notSolved: 'Not today. The word was {{word}}.'
        },
        tournament: {
            loading: 'Loading tournament…',
            noBracket: 'No tournament',
            yourTournament: 'Your tournament',
            start: 'Draw the bracket',
            startNote: 'Nobody can join once you start.',
            needPlayers: 'A tournament needs at least four players.',
            confirmLeave: {
                title: 'Leave the tournament?',
                message: 'Your matches keep going and you can lose them on time. Use the same code to come back.',
                action: 'Leave'
            },
            title: 'Tournament · {{players}} players',
            bracketKicker: 'Bracket · double elimination',
            nextRoundReady: 'Round {{stage}} can start',
            stageDrawn: 'Round {{stage}} is drawn',
            matchesLeft: '{{done}} of {{total}} matches done · {{left}} still going',
            winnersRound: 'Winners · round {{stage}}',
            losersRound: 'Losers · round {{stage}}',
            final: 'Final',
            settled: 'done',
            advancing: '{{players}} through',
            feedsEmpty: 'still empty',
            yourSide: 'your side',
            dropsHere: 'Losers of round {{stage}} drop to the loser bracket',
            playing: 'Playing',
            upNext: 'Up next',
            bye: 'Free pass to the next round',
            you: 'You',
            knockedOut: {
                title: 'Knocked out',
                message: 'You finished {{place}}. Stick around to see how it ends.'
            },
            startMatches: 'Start the matches',
            waitingForStart: 'Waiting for {{name}} to start',
            startGateOne: '1 match is drawn and starts when the host says so',
            startGateMany: '{{matches}} matches are drawn and start together',
            waitingOnOne: 'Waiting on 1 match',
            waitingOnMany: 'Waiting on {{matches}} matches',
            readyWaiting: 'Waiting for the rest',
            readyNotNeededOut: "You're out, no need to ready up",
            readyNotNeededBye: 'You skip the next round',
            ready: "I'm ready",
            readyCount: '{{ready}} of {{total}} ready · starts when everyone is',
            readyGate: 'Ready opens once all {{matches}} matches are done',
            backToBracket: 'Back to the bracket',
            champion: {
                title: 'Champion',
                you: 'You won the tournament!',
                player: '{{name}} wins the tournament.'
            },
            lossOne: '1 loss',
            lossMany: '{{losses}} losses'
        },
        errors: {
            staleServer: 'The server is running an old version of this game. Restart the API and try again.',
            expired: 'Your session expired. Log in again.',
            gameGone: 'This game no longer exists.',
            badSettings: "These settings don't work. Pick a different word length.",
            generic: 'Something went wrong. Try again.',
            network: 'No connection. Check your internet and try again.',
            invalidWord: 'Not a valid word.',
            roundClosed: 'This round is already over.',
            lobbyFull: 'This lobby is full.',
            lobbyGone: "This lobby doesn't exist (anymore). Check the code.",
            alreadyStarted: 'This game already started.',
            alreadyPlayedToday: 'You already played today. Come back tomorrow.',
            notEnoughForTournament: 'A tournament needs 4 to 12 players.',
            stageNotOver: "This round isn't done yet.",
            stageStarted: 'This round already started.',
            tournamentOver: 'This tournament is already over.'
        }
    },
    pubquizr: {
        index: {
            description: 'A classic pub quiz, but more fun.',
            oneDevice: { title: '1 phone', description: 'Pass the phone around.', action: 'Set up' },
            multiDevice: { title: 'Per player', description: 'Everyone on their own phone', action: 'Open lobby' },
            centralScreen: { title: 'Central screen', description: 'Quiz on the TV, phones as controllers.', action: 'Set up' },
            playMode: {
                title: 'How are you playing?',
                message: 'Everyone plays on their own phone. Is there a big screen too?',
                phonesOnly: {
                    title: 'Phones only',
                    description: 'The question is on every phone.',
                    need: 'Needed: a phone per player'
                },
                withScreen: {
                    title: 'With a central screen',
                    description: 'The question is on the TV, phones are the buttons.',
                    need: 'Needed: a TV or laptop with a browser'
                },
                locked: "This can't change once the lobby is open"
            },
            tableScreen: { title: 'Table screen', subtitle: 'On the TV' },
            allQuizzes: { title: 'All quizzes', subtitle: 'See the list' },
            library: {
                title: 'All quizzes',
                subtitle: 'Music, film, history and more'
            },
            pickOne: 'Pick one',
            playThis: 'Play this',
            newBadge: 'New',
            weekly: {
                weekday: 'WED',
                promise: 'A NEW QUIZ\nEVERY WEEK'
            },
            list: {
                label: 'All quizzes',
                tabs: { weekly: 'Weekly', official: 'Official', community: 'Community' },
                unplayedOnly: 'Unplayed',
                weeklyCadence: 'A new one every Wednesday',
                newThisWeek: 'New this week',
                week: 'Week {{week}}',
                published: '{{day}} {{month}} {{year}}',
                played: 'Played',
                loadOlder: 'Load older',
                browse: 'See all quizzes',
                empty: 'Nothing here yet.',
                filterEmpty: 'Nothing yet.',
                failed: "Couldn't load the quizzes. Check your internet.",
                comingSoon: 'Coming soon...',
                search: 'Search quizzes…',
                searchLabel: 'Search these quizzes',
                noMatches: 'Nothing found.',
                noMatchesMore: 'Nothing found yet, loading older quizzes.',
                sortNewest: 'Newest',
                sortAlpha: 'A-Z'
            }
        },
        oneDevice: {
            title: '1 phone',
            description: 'Play with one phone that goes around.',
            players: {
                seat: 'Player {{seat}}',
                tooFew: 'You need at least two players.',
                tooMany: 'Eight players max.',
                duplicate: 'Two players have the same name.'
            },
            seat: {
                first: 'You, holding the phone',
                leftOf: 'Left of {{name}}',
                fallback: 'Next to player {{seat}}',
                placeholder: 'Who sits there?',
                add: 'Add player'
            },
            quiz: {
                selected: 'Playing',
                empty: {
                    title: 'No quiz picked yet',
                    message: 'Pick one below.'
                },
                pick: 'Pick a quiz',
                pickAnother: 'Or pick another'
            },
            steps: {
                seatsTitle: "Who's playing?",
                quizTitle: 'Pick a quiz',
                settingsTitle: 'Settings',
                table: 'Players'
            },
            zenMode: {
                label: 'Zen mode',
                description: 'No time pressure. Rounds with a timer are adjusted.',
                caption: 'Zen · no timers'
            },
            triviaMode: {
                label: 'Trivia only',
                description: 'Just questions and answers. The describing round and the four-answer round are skipped.',
                caption: 'Trivia only · 4 rounds'
            },
            start: 'Start the quiz',
            loading: 'Loading…',
            running: {
                title: 'A quiz is still open',
                message: 'Pick up where you left off, or throw it away and start over.',
                resume: 'Continue',
                discard: 'Throw away'
            }
        },
        lobby: {
            settingsTitle: 'Settings',
            loading: 'Finding the lobby…',
            opening: 'Opening lobby…',
            noLobby: 'No lobby',
            hostClosedLobby: 'The host closed the lobby. Ask for a new code.',
            hostStoppedQuiz: 'The host stopped the quiz. Ask for a new code.',
            dealt: 'The quiz is starting…',
            pairing: {
                title: 'Connect a screen',
                stepScreen: 'Screen',
                stepRoom: 'Lobby',
                cardTitle: 'Connect the screen first',
                openOn: 'Open on the TV or laptop',
                openOnNoUrl: 'Open the lobby on the TV or laptop and enter the code',
                fillIn: 'AND ENTER',
                waiting: 'Waiting for the screen…',
                onePlayerWaiting: '1 player is already waiting with code {{code}}',
                playersWaiting: '{{count}} players are already waiting with code {{code}}',
                blocked: "You can't continue without a screen",
                auto: 'You move on as soon as the screen connects'
            },
            screenConnected: {
                title: 'Screen connected',
                message: 'The quiz shows up on the screen when you start.'
            },
            cast: {
                action: 'Cast to TV',
                connected: 'Casting, tap to switch'
            },
            running: {
                quizTitle: "You're already playing a quiz",
                lobbyTitle: 'You still have a lobby open',
                quizMessage: 'A quiz is still running in lobby {{code}}. Continue, or stop and open a new lobby.',
                lobbyMessage: 'Lobby {{code}} is still open. Go back, or close it and open a new one.',
                resumeQuiz: 'Continue',
                resumeLobby: 'Go to open lobby',
                stopQuiz: 'Stop quiz',
                closeLobby: 'Close and start new'
            },
            confirmClose: {
                title: 'Close the lobby?',
                message: 'The code stops working and everyone in the lobby gets kicked out.',
                action: 'Close'
            },
            confirmLeave: {
                title: 'Leave the lobby?',
                message: 'You can come back later with the same code.',
                action: 'Leave'
            },
            stay: 'Stay here',
            start: 'Start the quiz',
            startNoteScreen: 'Everyone watches the screen',
            startNotePhones: 'The question shows on every phone',
            needPlayers: 'You need at least {{min}} phones.',
            needQuiz: 'Pick a quiz first.',
            hostFallback: 'The host'
        },
        table: {
            door: {
                title: 'Quiz on a screen',
                message: "Enter the code from the host's phone. This screen only watches, everyone plays on their own phone.",
                codeLabel: 'Lobby code',
                placeholder: 'PXK7Q',
                open: 'Open screen',
                rejected: "That's not a quiz code. Check the host's phone."
            },
            setup: {
                title: 'How to get the quiz on TV',
                wayBrowser: "Open {{url}} in the TV's browser and enter the code",
                wayBrowserPlain: "Open this page in the TV's browser and enter the code",
                wayHdmi: 'Or plug a laptop into the TV with HDMI',
                wayCast: 'Or cast this tab from Chrome and keep it open',
                wayMirror: 'Or mirror this device with AirPlay or screen casting',
                fullScreen: 'Full screen',
                exitFullScreen: 'Exit full screen',
                alreadyPlayingTitle: 'This device is playing',
                alreadyPlaying: "Open the screen in the TV's own browser, or you'll miss half the game.",
                signingIn: 'Getting the screen ready…',
                signInFailed: "This screen can't reach the game."
            },
            roundOf: 'Round {{round}} of {{total}}',
            playAlong: 'Play along',
            numbersInLabel: 'numbers in',
            recapTitle: 'The words',
            recapPoints: '{{name}} gets {{points}} for the guessed words',
            weightChip: '{{weight}} · {{points}} points',
            wordsSecret: 'Only {{name}} can see the words. Everyone else gets a bonus guess later',
            status: {
                quizmaster: 'Quizmaster',
                turn: 'Their turn',
                missed: 'Wrong',
                sent: 'Sent',
                typing: 'Typing',
                describing: 'Describing',
                guessing: 'Guessing',
                choosing: 'Choosing'
            },
            connecting: 'Finding the lobby…',
            closed: 'The host closed the lobby.',
            dealt: 'The quiz has started.',
            joinAt: 'Join at',
            typeHint: 'Enter this code on your phone to join.',
            waitingForHost: 'Waiting for the host to start…',
            needPlayers: '{{needed}} more needed to start.',
            scores: 'Scores',
            quizmaster: 'Quizmaster',
            guesser: 'Guesser',
            standings: 'Standings',
            answer: 'The answer',
            numbersIn: '{{done}} of {{total}} numbers in',
            typeYours: 'Enter your number on your phone.',
            followPhones: 'Play this round on your phones.',
            missed: 'Missed',
            gotSoFar: '{{awarded}} of {{total}} so far',
            choosing: '{{name}} is picking easy or hard',
            over: "That's the quiz!"
        },
        board: {
            choiceAppears: 'Once they pick, the question shows on every phone',
            choosing: '{{name}} is picking easy or hard',
            clockSoon: 'The clock starts soon',
            closestHint: 'Doubles are fine · the answer shows once everyone is done',
            currentQuizmaster: '{{name}} is quizmaster',
            describes: 'Describes',
            describing: '{{describer}} describes, {{guesser}} guesses',
            easy: 'Easy',
            everyoneAtOnce: 'Everyone at once',
            gotIt: 'Got it',
            guesses: 'Guesses',
            hard: 'Hard',
            imReady: "I'm ready",
            isUp: "{{name}}'s turn",
            listFooter: '{{guesser}} names them · {{master}} ticks them off',
            listRules: 'One player gets a question with four answers and {{seconds}} seconds. The quizmaster ticks off the right ones. Then everyone else gets one bonus guess at what is left.',
            missed: "{{name}} missed · now it's {{next}}'s",
            missedToYou: "{{name}} missed · now it's yours",
            mustGuess: "You're guessing",
            mustGuessRules: '{{describer}} describes {{words}} words in {{seconds}} seconds. Every word you get is 1 point for both of you.',
            namesFour: '{{name}} names four',
            neverSeeWords: 'You never see the words, not even after',
            noQuizmaster: 'No quizmaster',
            notReadyYet: "{{name}} isn't ready yet",
            numbersIn: '{{done}} / {{total}} in',
            onlyMasterMovesOn: 'Only {{name}} can move on',
            picking: '{{name}} is picking',
            picksOnOwnPhone: '{{name}} picks on their own phone',
            onePoint: '1 point',
            pointsWorth: '{{points}} points',
            questionOf: 'Question {{number}} / {{total}}',
            quizmaster: 'Quizmaster',
            readsAloud: '{{name}} reads the question out loud',
            queuePlace: "You're {{place}} in line",
            queuePlaceNow: "You're {{place}} in line · your turn",
            previous: {
                label: 'Previous question',
                gotIt: '{{name}} got it',
                youGotIt: 'You got it',
                nobody: 'Nobody got it'
            },
            readAhead: 'Read along: {{seconds}} seconds once the clock starts',
            readyCount: '{{done}} of {{total}} ready',
            readyToStart: 'Ready to start',
            readyWaiting: 'Ready. {{name}} starts the clock',
            turnOf: 'Turn {{number}} / {{total}}',
            turnOrder: {
                and: 'and',
                isQuizmaster: '{{name}} is quizmaster',
                isUp: "{{name}}'s turn",
                position: '{{number}} / {{total}}',
                then: 'then {{names}}',
                title: 'Order',
                youAreQuizmaster: '{{name}} are quizmaster',
                youAreUp: 'Your turn'
            },
            wordsGuessed: '{{done}} of {{total}} guessed',
            wordsSecret: 'Only {{name}} can see the words',
            you: 'You',
            yourChoiceCue: 'Pick one and your question shows on every phone'
        },
        control: {
            allGuessesIn: 'Everyone is done',
            alsoOnScreen: "It's on the screen too, you just judge it",
            everyoneGuesses: 'Everyone guesses',
            isUpNow: "{{name}}'s turn",
            lettersCue: 'The options are on the screen',
            onScreen: 'TV',
            ordinal: {
                first: '1st',
                second: '2nd',
                third: '3rd',
                fourth: '4th',
                fifth: '5th',
                sixth: '6th',
                seventh: '7th',
                eighth: '8th'
            },
            watchScreen: 'Watch the screen',
            yourPlace: "You're {{place}} this turn",
            changeGuess: 'Change',
            guessSent: 'Your number is in',
            onTheScreen: 'On the screen',
            pickAnswer: 'Pick your answer',
            roundStarting: 'Waiting for {{name}} to start the round',
            theScreenHasIt: 'Watch the big screen.',
            submitGuess: 'Send',
            theyTapItThemselves: '{{name}} picks the answer on their own phone.',
            waitingFor: 'Waiting for {{name}}',
            waitingForGuesses: 'Waiting for {{names}}',
            yourChoice: 'Easy or hard?',
            yourChoiceCue: 'Pick one and your question goes on the screen',
            yourGuess: 'Your number',
            yourTurn: 'Your turn'
        },
        play: {
            loading: 'Loading…',
            close: 'Leave quiz',
            roundLabel: 'Round {{round}} · {{kind}}',
            roundTitle: 'Round {{round}}: {{kind}}',
            rules: {
                open: 'The quizmaster reads out loud and taps who got it. Wrong? Next player.',
                choice: 'No quizmaster this round. Whoever is up picks a letter. Wrong? Next player, minus that option.',
                closest: 'Everyone picks one number, doubles are fine. Closest gets 2 points. A tie? Both get them.',
                describe: 'The describer has 30 seconds. Every word guessed is 1 point for both. Then everyone else gets one bonus guess.',
                list: 'One subject. Four answers.',
                doubleDown: 'Whoever is up picks an easy (1p) or hard (3p) question.',
                finale: 'Open questions, one on one. Wrong? The other one gets a go. Every right answer is a star, and whoever led after round 6 starts with a bonus star. Most stars wins. A tie? Most points wins.',
                finaleTwo: 'Open questions, taking turns, 2 points each. Whoever leads after the last question wins.'
            },
            rounds: {
                open: 'Open',
                choice: 'Multiple choice',
                closest: 'Closest guess',
                describe: 'Describe it',
                list: 'What do you know about...?',
                doubleDown: 'Easy or hard?',
                finale: 'The final'
            },
            questionNumber: 'Question {{number}}',
            questionTotal: ' of {{total}}',
            questionOutOf: '/{{total}}',
            turn: {
                spoken: '{{master}} is asking {{player}}',
                spokenRun: '{{master}} is asking {{player}}, who has {{run}} in a row',
                quizmasterLabel: '{{name}} is quizmaster',
                answeringNow: 'Answering now',
                roleQuizmaster: 'Quizmaster',
                roleGuesser: 'Guessing',
                bonusOf: 'Bonus · {{number}} of {{total}}',
                bonusMissed: '{{name}} got nothing',
                bonusTake: '{{name}} got it',
                nobody: 'Nobody got it'
            },
            leadOpen: '{{name}} reads to the player on the left',
            leadChoice: '{{name}} reads · four options',
            leadClosest: '{{name}} reads · everyone else guesses',
            leadDescribe: "{{name}}'s turn",
            leadList: '{{name}} asks · one player names them',
            leadDoubleDown: '{{name}} asks: easy or hard?',
            leadFinale: '{{name}} reads to the finalists',
            readAloud: 'Read this out loud',
            onlyYouSeeThis: 'The answer',
            alsoAccept: 'Also fine: {{answers}}',
            answer: {
                reveal: 'Tap to see the answer',
                hide: 'Tap to hide',
                revealHint: "Don't let anyone peek"
            },
            validate: 'Judge',
            validateLocked: 'Check the answer first',
            wrong: 'Wrong',
            correct: 'Right',
            markWrong: 'Mark {{name}} wrong',
            markCorrect: 'Mark {{name}} right',
            wrongPassesTo: 'Wrong? Then {{name}} gets a go',
            wrongEndsQuestion: 'Nobody left, a wrong answer ends this question',
            tableRound: 'Around the table',
            whoGotIt: 'Ask {{name}} first',
            answerLabel: 'Answer',
            pickHint: 'Tap who got it right',
            pickUndoHint: '{{name}} is already out, tap to undo',
            pickLockHint: 'Tap {{name}} again to clear',
            pickSpoken: '{{name}} got it right',
            ruleOutSpoken: 'Mark {{name}} wrong',
            ruleInSpoken: 'Let {{name}} back in',
            nobodyGotIt: 'Nobody got it',
            nobodyConfirm: 'Next question',
            nobodyConfirmHint: 'Tap again to continue',
            lockIn: 'Confirm',
            choiceAlwaysPasses: 'Next question is for {{name}}',
            correctKeepsTurn: 'Right! The next question is for {{name}} again',
            worthPoints: '{{worth}}p',
            worthStars: '{{worth}} ★',
            noPoint: 'No point',
            scores: 'Scores',
            choice: {
                options: 'The four options',
                spoken: '{{letter}}. {{text}}',
                spokenCorrect: '{{letter}}. {{text}}, the right answer'
            },
            closest: {
                answer: '{{answer}} {{unit}}',
                placeholder: 'Guess',
                entry: "{{name}}'s guess",
                duplicate: 'Two players have the same number. Ask one of them for another.',
                unreadable: "That's not a number.",
                typeInstead: 'Enter the guesses instead',
                award: 'Give the points',
                nearestTakes: 'Closest gets {{worth}}p',
                guessingOrder: "Who's guessing, in order",
                collect: 'Write down the guesses',
                collectHint: 'Let everyone say a number first, no two the same',
                backToQuestion: 'Back to the question',
                answerLabel: 'Answer · only you',
                hide: 'Hide',
                theirNumbers: 'Their numbers',
                filled: '{{filled}} of {{total}} filled in',
                off: '{{off}} off',
                nearestOff: 'closest · {{off}} off',
                says: '{{name}} says…',
                now: 'now',
                position: '{{number}} of {{total}}',
                missingTitle: "Not everyone has a number",
                missingOne: "{{names}} has nothing filled in and can't win this one.",
                missingMany: "{{names}} have nothing filled in and can't win this one.",
                missingBack: 'Go back and fill in',
                missingAnyway: 'Finish anyway',
                result: {
                    nearestOne: '{{names}} was closest',
                    nearestMany: '{{names}} were closest',
                    nobody: 'Nobody was closest',
                    paidOne: '{{worth}} points',
                    paidMany: '{{worth}} points each',
                    paidNobody: 'No points this time',
                    answerLabel: 'The answer',
                    guessesLabel: 'All guesses',
                    continue: 'Continue'
                }
            },
            pad: {
                minus: 'Minus',
                backspace: 'Backspace'
            },
            describe: {
                readyRuleOnlyGuesser: 'You describe to {{guesser}}. While the clock runs, only {{guesser}} can guess',
                readyRuleTime: '{{seconds}} seconds to describe as many of your {{words}} words as you can',
                readyRuleNoSaying: "Never say the word itself, or it doesn't count.",
                readyRuleBothScore: 'Every word {{guesser}} gets is a point for both of you',
                readyRuleBonus: 'When time is up, the other {{others}} players each get one guess at a word nobody got',
                start: 'Start',
                dontSayIt: 'Never say the word itself',
                runningReminder: 'Tap a word as soon as {{guesser}} gets it. Everyone else gets a go after.',
                inTimeTitle: 'What did {{guesser}} get?',
                inTimeHint: 'Tap every word {{guesser}} said in time',
                toBonus: 'Bonus round · {{left}} left',
                toSettle: 'On to the points',
                bonusHint: 'The quizmaster stays quiet. Everyone else gets one guess at a leftover word for a bonus point.',
                scoringTitle: 'How did it go?',
                standing: '{{name}} gets {{points}}p this turn',
                scoreAgain: 'Score again',
                settle: 'Continue'
            },
            list: {
                readyRuleOnlyGuesser: "You ask {{guesser}}. Until their turn is over, only their answers count",
                readyRuleTime: '{{seconds}} seconds to name as many of the {{answers}} answers as they can',
                readyRuleGuesses: '{{guesses}} guesses to name as many of the {{answers}} answers as they can',
                readyRuleHidden: 'Only you as quizmaster can see the answers',
                readyRuleScore: 'Every right answer is {{worth}} points for the guesser',
                readyRuleBonus: 'Then the other {{others}} players each get one bonus guess at what is left',
                start: 'Start',
                preTimerHint: 'Read the question out loud and start the timer, then {{guesser}} can guess',
                startTimer: 'Start the timer',
                runningReminder: 'Tick off every answer {{guesser}} names. Nobody else counts yet.',
                zenNotice: 'No time pressure. {{guesser}} gets {{nGuesses}} guesses, then everyone else gets one bonus guess at what is left.',
                inTimeTitle: 'What did {{guesser}} get?',
                inTimeHint: 'Tap every answer {{guesser}} got right',
                toBonus: 'Bonus round · {{left}} left',
                toSettle: 'On to the points',
                bonusHint: 'One guess at one of these. Get it right and the point is yours.',
                scoringTitle: 'Result',
                standing: '{{name}} gets {{points}}p this question',
                scoreAgain: 'Score again',
                settle: 'Continue'
            },
            doubleDown: {
                ask: 'Does {{name}} want an easy or hard question?',
                easy: 'Easy · {{points}} point',
                hard: 'Hard · {{points}} points'
            },
            tieBreak: {
                kicker: 'Before the final',
                title: "It's a tie!",
                bodyOne: '{{names}} are tied. Play rock paper scissors: the winner goes to the final.',
                bodyTwo: '{{names}} are tied. Play rock paper scissors: the two winners go to the final.',
                through: '{{name}} is already in the final.',
                pickOne: 'Winner to the final',
                pickTwo: 'Winners to the final',
                waiting: '{{name}} taps who won.'
            },
            intro: {
                of: 'of {{total}}',
                round: 'Round {{round}}',
                briefOpen: 'Twenty open questions. The quizmaster asks the player on the left. Right? The next one is yours too. Wrong? The next player gets a go. Every question is a point.',
                briefChoice: 'Harder questions, multiple choice. Everyone starts once and is quizmaster once. Every question is 2 points.',
                briefClosest: 'A question with a number as the answer. Everyone except the quizmaster guesses once, no two the same. Closest gets 2 points.',
                briefClosestEveryone: 'A question with a number as the answer. Everyone enters one guess on their own phone. Closest gets 2 points, a tie pays both.',
                briefDescribe: '30 seconds to describe your words without saying the word (or a translation).',
                briefList: 'One question, four answers. The player left of the quizmaster has twenty seconds to name as many as they can. Then everyone else gets one guess at what is left. Every right answer is 2 points.',
                briefListZen: 'One question, four answers. The player left of the quizmaster gets eight guesses, no clock. Then everyone else gets one guess at what is left. Every right answer is 2 points.',
                briefDoubleDown: "Easy (1 point) or hard (3 points)? There are five of each, so when they're gone, they're gone. Wrong? The question goes around the table for full points.",
                briefFinale: 'The top two players play the final. Every right answer is a star, and whoever led after round 6 starts with a bonus star. Whoever is behind goes first. Most stars wins. A tie? Most points wins.',
                briefFinaleTwo: "Just the two of you, reading to each other. Whoever is behind gets the question, wrong is wrong. Every right answer is 2 points. Most points wins.",
                bonusStar: '{{name}} led after round 6 and starts with a bonus star',
                noBonusStar: 'Tied on points, so no bonus star',
                versus: 'vs',
                quizmaster: '{{name}} is quizmaster',
                action: 'Start round {{round}}'
            },
            handoff: {
                step: 'Round {{round}} · {{number}} of {{total}}',
                title: 'Pass the phone to {{name}}',
                jobOpen: '{{name}} reads to the player on the left',
                jobChoice: '{{name}} reads the question and the four options',
                jobClosest: '{{name}} reads the question and collects the numbers',
                jobDescribe: '{{name}} describes the words to the player on the left. Only {{name}} may see this screen.',
                jobList: '{{name}} reads the question and ticks off what the player on the left names.',
                jobDoubleDown: '{{name}} asks the next player: easy or hard? Then reads the question.',
                jobFinale: "{{name}} reads to the finalists and doesn't play this round.",
                ruleOpen: 'Right? The next question is yours too. Wrong? The next player gets a go. Every question is a point.',
                ruleChoice: 'Same as before: get it right and the next one is yours too. Every question is 2 points.',
                ruleClosest: 'Everyone but the quizmaster guesses once, no two the same. Closest gets 2.',
                ruleDescribe: 'Thirty seconds, with the player on your left. Every word they get is a point for both of you.',
                ruleList: 'Twenty seconds, only the player on your left answers. Whatever is left goes around the table after.',
                ruleDoubleDown: "Easy is 1 point, hard is 3. There are five of each, so when they're gone, they're gone. Wrong? The question goes around the table.",
                ruleFinale: 'Whoever is behind gets the question first. Wrong? The other one gets a go. A star per right answer, most stars wins.',
                action: 'Show the question'
            },
            standings: {
                label: 'Round {{round}} of {{total}} done',
                title: 'Round {{round}} done',
                description: 'The standings.',
                startNext: 'Start round {{round}}',
                nextRoundWip: "Round {{round}} doesn't exist yet. Your points are saved."
            },
            final: {
                title: 'The quiz is over',
                description: 'Final standings.',
                finalist: 'Finalist',
                winnerLabel: 'Winner',
                points: '{{score}} points',
                stars: '{{stars}} ★',
                tally: '{{stars}} ★ · {{score}} points',
                tieLabel: 'Shared first place',
                tieTitle: "It's a tie!",
                tieDescription: 'No winner. You share first place.'
            }
        },
        errors: {
            lobbyFull: 'This lobby is full. Eight phones max.',
            alreadyStarted: 'This quiz already started. Ask for a new code.',
            lobbyGone: "This lobby doesn't exist anymore. Check the code.",
            notHost: 'Only the host can do that.',
            notAtThisTable: "You're not playing in this quiz.",
            notYourSeat: "It's not your turn.",
            expired: 'Your session expired. Log in again.',
            quizGone: "This quiz doesn't exist anymore. Pick another one.",
            badTable: 'Something is off. Check the names and try again.',
            tooFewPlayers: 'You need at least two players.',
            tooManyPlayers: 'Eight players max.',
            duplicateName: 'Two players have the same name.',
            quizTooSmall: "This quiz doesn't have enough questions for that many players. Pick another one, or play with fewer.",
            generic: "The quiz couldn't start. Try again.",
            network: 'No connection. Check your internet.',
            staleTurn: 'The quiz has already moved on. Below is where you are now.',
            duplicateGuess: 'Two players have the same number. Ask one of them for another.',
            quizmasterCannotGuess: "The quizmaster can't guess.",
            describerCannotGuess: "You can't get a point for your own word.",
            oneGuessEach: 'Everyone except the guesser gets one guess.',
            twoOnOne: 'This can only go to one player.',
            verdictDisagrees: "That doesn't match the answer. Check which option was tapped.",
            noChoiceYet: "Nobody picked easy or hard yet."
        }
    },
    oneOfUs: {
        index: {
            description: 'Which one of you is the imposter?',
            oneDevice: {
                title: '1 phone',
                description: 'Pass the phone around.',
                action: 'Play'
            },
            multiDevice: {
                title: 'Per player',
                description: 'Create a lobby and invite friends.',
                action: 'Create lobby'
            }
        },
        singleDevice: {
            title: '1 phone',
            description: 'Enter every player and hit start.',
            players: {
                tooFew: 'You need at least three players.',
                tooMany: 'Nine players max.',
                duplicate: 'Two players have the same name.'
            }
        },
        multiDevice: {
            lobby: {
                opening: 'Opening lobby…',
                noLobby: 'No lobby',
                hostStoppedGame: 'The host stopped the game. Ask for a new code.',
                hostClosedLobby: 'The host closed the lobby. Ask for a new code.',
                running: {
                    gameTitle: "You're already playing",
                    lobbyTitle: 'You still have a lobby open',
                    gameMessage: "You're still playing in lobby {{code}}. Continue, or stop and open a new lobby.",
                    lobbyMessage: 'Lobby {{code}} is still open. Go back, or close it and open a new one.',
                    resumeGame: 'Continue',
                    resumeLobby: 'Go to open lobby',
                    stopGame: 'Stop game',
                    closeLobby: 'Close and start new'
                },
                confirmClose: {
                    title: 'Close the lobby?',
                    message: 'The code stops working and everyone in the lobby gets kicked out.',
                    action: 'Close'
                },
                confirmLeave: {
                    title: 'Leave the lobby?',
                    message: 'You can come back later with the same code.',
                    action: 'Leave'
                },
                stay: 'Stay here',
                start: 'Start the game',
                startNote: 'Nobody can join once you start.',
                needPlayers: 'You need at least {{min}} players.',
                hostFallback: 'The host',
                settingsTitle: 'Settings'
            },
            play: {
                loading: 'Dealing roles…',
                noGame: 'No game',
                waiting: 'Waiting for the rest…',
                phase: {
                    deal: 'Round {{round}} · the word',
                    answer: 'Round {{round}} · clue',
                    vote: 'Round {{round}} · vote',
                    reveal: 'Round {{round}} · result',
                    waiting: 'Round {{round}}'
                },
                stillIn: '{{count}} left',
                progress: '{{done}} / {{total}}',
                out: {
                    title: "You're out",
                    message: "You got voted out. You can still watch, but you can't answer or vote."
                },
                deal: {
                    title: 'Your note',
                    action: 'Got it'
                },
                answer: {
                    title: 'Write your note',
                    about: 'About: {{prompt}}',
                    aboutBlank: 'Your note is blank',
                    field: 'Your note',
                    placeholder: 'Something that only fits your word',
                    counter: '{{typed}} / {{max}} · anonymous',
                    submit: 'Send',
                    hung: 'Sent · anonymous',
                    pinned: 'Already sent',
                    waitingMessage: 'Waiting for the rest. Voting starts when everyone is done.'
                },
                vote: {
                    title: 'Which answer is sus?',
                    mine: 'YOU',
                    tie: 'A tie?',
                    tieTail: 'decides.',
                    confirm: 'Vote for this',
                    waiting: 'You voted. Waiting for the rest.'
                },
                reveal: {
                    title: 'The result',
                    votedOut: '{{name}} · voted out',
                    tieBroken: 'It was a tie, so the mayor decided.',
                    next: 'Round {{round}}',
                    toResult: 'See the result'
                }
            },
            errors: {
                lobbyFull: 'This lobby is full.',
                alreadyStarted: 'This game already started.',
                notHost: 'Only the host can do that.',
                notEnoughPlayers: 'You need more players to start.',
                tooManyPlayers: 'Too many players for One of Us.',
                gameNotOver: "The game isn't over yet.",
                noContent: 'No words in this language yet.',
                lobbyGone: "This lobby doesn't exist anymore.",
                alreadyAnswered: 'You already answered this round.',
                alreadyVoted: 'You already voted this round.',
                cannotVoteSelf: "You can't vote for yourself.",
                votedOut: "You got voted out and can't play anymore.",
                wrongRound: 'That round is already over.',
                wrongPhase: "You can't do that right now.",
                badAnswer: "That answer won't work. Write something, but keep it short.",
                gameFinished: 'This game is over.'
            }
        },
        settings: {
            wordsOnly: {
                title: 'Words only',
                description: 'Single words, no sentences.'
            },
            roles: {
                title: 'Roles',
                description: 'Which roles can show up.',
                count: '{{enabled}} of {{total}}',
                locked: 'At least one kind of imposter has to stay on.',
                imposter: {
                    description: 'Gets a different word and has to blend in.'
                },
                nitwit: {
                    description: 'Gets no word at all.'
                }
            }
        },
        play: {
            loading: 'Dealing words…',
            close: 'Leave game',
            roundSpeak: 'Round {{round}} · turn',
            roundDiscuss: 'Round {{round}} · discuss',
            roundVote: 'Round {{round}} · vote',
            roundResult: 'Round {{round}} · result',
            note: {
                label: 'Your word',
                blurb: "Don't show this to anyone.",
                blurbBlank: "You don't have a word. Listen closely to the rest.",
                cover: 'Tap to see your word',
                coverHint: "Don't let anyone peek."
            },
            reveal: {
                step: 'Word {{number}} of {{total}}',
                title: "{{name}}'s turn",
                body: "Take the phone from {{from}} and don't let anyone peek.",
                bodyFirst: 'Only {{name}} may see the next screen.',
                note: 'No peeking.',
                action: "I'm {{name}}",
                queue: 'Up next: {{names}}',
                secretLabel: 'Tap to see your word',
                secretHint: "Don't let anyone peek.",
                warning: 'Only you see this',
                noWord: 'No word',
                role: {
                    label: 'Your role',
                    civilian: {
                        name: 'Civilian',
                        explanation: "Everyone with your word is on your side. Find who doesn't have it."
                    },
                    imposter: {
                        name: 'Imposter',
                        explanation: 'Your word is different from everyone else. Bluff along and survive.'
                    },
                    unknown: {
                        name: 'Civilian or imposter',
                        explanation: "You don't know which one you are. Listen closely and figure it out."
                    },
                    nitwit: {
                        name: 'The nitwit',
                        explanation: "You don't have a word. Listen closely and play along."
                    }
                },
                hide: 'Hide',
                done: 'Pass to {{name}}',
                lastDone: 'Done, start round 1'
            },
            speak: {
                step: 'Player {{number}} of {{total}}',
                nowSpeaking: 'Your turn',
                hint: 'Say one word that goes with your word. Not the word itself.',
                next: 'Next: {{name}}',
                lastNext: 'Everyone has gone'
            },
            discuss: {
                ring: 'Vote',
                title: 'Who goes out?',
                description: "Everyone points at who they don't trust, all at once. Most votes is out. Everyone has to vote.",
                tieNote: 'No defending, no discussing. Just vote!',
                tieNoteMayor: "No defending, no discussing. Just vote! If it's a tie, {{name}} decides as mayor.",
                action: 'Vote'
            },
            vote: {
                title: 'Who goes out?',
                nobody: 'Nobody picked yet',
                confirm: 'Vote for {{name}}',
                confirmHint: "You can't undo this.",
                locked: 'Tap a name first.'
            },
            elimination: {
                ringLabel: 'Voted out',
                civilian: '{{name}} was a civilian',
                imposter: '{{name}} was an imposter',
                nitwit: '{{name}} was the nitwit',
                hit: 'hit',
                miss: 'miss',
                remaining: '{{players}} left.',
                next: 'Round {{round}}'
            },
            briefing: {
                title: 'The roles',
                intro: 'Everyone gets one of these roles. Read them out before you start.',
                roleLabel: 'Role',
                role: {
                    civilian: "Most players are civilians. They all have the same word and look for who doesn't.",
                    imposter: "Imposters have a different word and don't know the real one. They bluff along and win by surviving.",
                    nitwit: "The nitwit has no word and plays with the imposters. They don't know who it is."
                },
                action: 'Deal the words'
            },
            over: {
                label: 'Game over',
                civilians: 'The civilians win',
                imposters: 'The imposters win',
                civiliansWhy: 'Every imposter got voted out.',
                impostersWhy: 'The imposters are no longer outnumbered.',
                rolesTitle: 'Players',
                civiliansCamp: 'Civilians',
                impostersCamp: 'Against the civilians',
                imposterWordLabel: 'Imposters',
                winner: 'Winner',
                again: 'Play again'
            }
        },
        errors: {
            expired: 'Your session expired. Log in again.',
            gameGone: "This game doesn't exist anymore.",
            badTable: 'Something is off. Check the names and try again.',
            generic: 'Something went wrong. Try again.',
            network: 'No connection. Check your internet.',
            offlineUnavailable: 'No connection, and no words saved for this language. Play once online and it works offline after.'
        }
    },
    fakeFiller: {
        index: {
            description: 'Make up a fake answer that sounds real. The rest guess which one is true.',
            facts: {
                title: 'Fake facts',
                description: 'Fill in the missing words.',
                action: 'Open lobby'
            },
            definitions: {
                title: 'Fake definitions',
                description: 'Make up a meaning for a word.',
                action: 'Open lobby'
            }
        },
        lobby: {
            loading: 'Finding the lobby…',
            opening: 'Opening lobby…',
            noLobby: 'No lobby',
            hostStoppedGame: 'The host stopped the game. Ask for a new code.',
            hostClosedLobby: 'The host closed the lobby. Ask for a new code.',
            running: {
                gameTitle: "You're already playing",
                lobbyTitle: 'You still have a lobby open',
                gameMessage: "You're still playing in lobby {{code}}. Continue, or stop and open a new lobby.",
                lobbyMessage: 'Lobby {{code}} is still open. Go back, or close it and open a new one.',
                resumeGame: 'Continue',
                resumeLobby: 'Go to open lobby',
                stopGame: 'Stop game',
                closeLobby: 'Close and start new'
            },
            confirmClose: {
                title: 'Close the lobby?',
                message: 'The code stops working and everyone in the lobby gets kicked out.',
                action: 'Close'
            },
            confirmLeave: {
                title: 'Leave the lobby?',
                message: 'You can come back later with the same code.',
                action: 'Leave'
            },
            stay: 'Stay here',
            start: 'Start the game',
            startNote: 'Nobody can join once you start.',
            needPlayers: 'You need at least {{min}} players.',
            hostFallback: 'The host',
            settingsTitle: 'Settings',
            mode: 'Prompts',
            modeFacts: 'True facts',
            modeDefinitions: 'Word meanings',
            modeFactsHint: 'The real answer is hidden among the fakes. Find it and you score.',
            modeDefinitionsHint: 'A rare word. The real meaning is hidden among the fakes. Find it and you score.',
            answersPerPlayer: 'Prompts per player',
            answersPerPlayerHint: 'How many prompts everyone fills in. More prompts, longer game.',
            answersSummary: '{{amount}} prompts each'
        },
        play: {
            loading: 'Dealing prompts…',
            noGame: 'No game',
            band: {
                round: 'Round',
                prompt: 'Prompt'
            },
            writing: {
                title: 'Fill in the blanks',
                intro: "Make up something that isn't true but sounds real.",
                promptOf: 'Prompt {{index}} of {{total}}',
                blank: 'Blank {{index}}',
                blankPlaceholder: 'Your answer',
                definitionPlaceholder: 'What it means',
                submit: 'Lock in',
                locked: 'Locked in',
                edit: 'Change',
                incomplete: 'Fill in every blank first.',
                titleDefinitions: 'What does it mean?',
                introDefinitions: 'Make up a believable meaning. You score every time someone picks it.',
                waitingTitle: 'Waiting for the rest',
                waitingMessage: 'Your answers are in. Voting starts when everyone is done.',
                progress: '{{done}} of {{total}} answers in'
            },
            voting: {
                title: 'Which one is real?',
                hint: 'Tap the one you think is real.',
                tapToPick: 'Tap to pick',
                yourPick: 'Your pick',
                option: 'Option {{letter}}',
                or: 'or',
                roundOf: 'Round {{round}} of {{total}}',
                pick: 'Pick this',
                confirm: 'Lock in vote',
                voted: 'Voted',
                yoursTitle: 'Sit tight',
                yoursMessage: 'Fingers crossed someone falls for your answer! Then you score.',
                progress: '{{done}} of {{total}} votes in',
                waiting: 'Waiting for the rest…'
            },
            reveal: {
                title: 'The results',
                noScore: 'No points this round.',
                stamp: {
                    real: 'Real',
                    more: '{{name}} +{{count}}'
                },
                voters: {
                    chose: 'Picked by',
                    none: 'Nobody'
                },
                next: 'Next round',
                toResults: 'Final scores',
                waitingForHost: 'Waiting for the host…',
                waitingForResults: 'Waiting for the host…'
            }
        },
        results: {
            loading: 'Loading result…'
        },
        errors: {
            expired: 'Your session expired. Log in again.',
            gameGone: "This game doesn't exist anymore.",
            generic: 'Something went wrong. Try again.',
            network: 'No connection. Check your internet.',
            lobbyFull: 'This lobby is full.',
            lobbyGone: "This lobby doesn't exist anymore. Check the code.",
            alreadyStarted: 'This game already started.',
            notEnoughPlayers: 'You need more players to start.',
            tooManyPlayers: 'Too many players for one game.',
            noContent: 'Not enough prompts in this language. Try the other one.',
            notYourPrompt: "This prompt isn't yours.",
            alreadyAnswered: 'You already filled that one in.',
            alreadyVoted: 'You already voted this round.',
            cannotVoteOwnPrompt: "You can't vote on your own prompt.",
            wrongRound: 'This round is already over.',
            wrongPhase: "You can't do that yet.",
            badAnswer: 'Fill in every blank before locking in.',
            answerIsTruth: "Psst… that's the real answer! Make up something else.",
            gameFinished: 'This game is over.'
        }
    },
    wittyWars: {
        index: {
            description: 'Two players, one question. The rest vote for the funniest answer.',
            multiDevice: {
                title: 'Per player',
                description: 'Everyone writes and votes on their own phone.',
                action: 'Open lobby'
            },
            hostScreen: {
                title: 'Host screen',
                description: 'Duels on the TV, writing on your phone.',
                action: 'Open lobby'
            }
        },
        modes: {
            family: {
                title: 'Family',
                description: 'Silly questions for everyone, grandma too.'
            },
            rude: {
                title: 'Rude',
                description: 'Brutal questions.'
            },
            caliente: {
                title: 'Caliente',
                description: 'Spicy and naughty. Not safe for work.'
            }
        },
        lobby: {
            loading: 'Finding the lobby…',
            opening: 'Opening lobby…',
            noLobby: 'No lobby',
            hostStoppedGame: 'The host stopped the game. Ask for a new code.',
            hostClosedLobby: 'The host closed the lobby. Ask for a new code.',
            running: {
                gameTitle: "You're already playing",
                lobbyTitle: 'You still have a lobby open',
                gameMessage: "You're still playing in lobby {{code}}. Continue, or stop and open a new lobby.",
                lobbyMessage: 'Lobby {{code}} is still open. Go back, or close it and open a new one.',
                resumeGame: 'Continue',
                resumeLobby: 'Go to open lobby',
                stopGame: 'Stop game',
                closeLobby: 'Close and start new'
            },
            confirmClose: {
                title: 'Close the lobby?',
                message: 'The code stops working and everyone in the lobby gets kicked out.',
                action: 'Close'
            },
            confirmLeave: {
                title: 'Leave the lobby?',
                message: 'You can come back later with the same code.',
                action: 'Leave'
            },
            stay: 'Stay here',
            start: 'Start the game',
            startNote: 'Nobody can join once you start.',
            needPlayers: 'You need at least {{min}} players.',
            hostFallback: 'The host',
            settingsTitle: 'Settings',
            mode: 'Questions',
            answersPerPlayer: 'Answers per player',
            answersPerPlayerHint: 'How many questions everyone answers. More answers, longer game.'
        },
        play: {
            loading: 'Dealing questions…',
            noGame: 'No game',
            band: {
                round: 'Duel',
                prompt: 'Question'
            },
            writing: {
                title: 'Be funny',
                intro: 'Write the funniest answer you can.',
                promptOf: 'Question {{index}} of {{total}}',
                placeholder: 'Your funniest answer',
                answerLabel: 'Your answer',
                empty: 'Write something first.',
                next: 'Next question',
                previous: 'Previous question',
                submit: 'Send',
                waitingTitle: 'Waiting for the rest',
                waitingMessage: 'Your answers are in. The duels start when everyone is done.',
                progress: '{{done}} of {{total}} answers in'
            },
            voting: {
                title: 'Which one is funnier?',
                hint: 'Tap the one that made you laugh hardest.',
                tapToPick: 'Tap to pick',
                yourPick: 'Your pick',
                option: 'Answer {{letter}}',
                or: 'vs',
                roundOf: 'Duel {{round}} of {{total}}',
                confirm: 'Lock in vote',
                voted: 'Voted',
                yoursTitle: 'This is your duel',
                yoursMessage: "You wrote one of these, so you don't vote. Fingers crossed!",
                progress: '{{done}} of {{total}} votes in',
                waiting: 'Waiting for the rest…'
            },
            reveal: {
                title: 'And the winner is…',
                stampMore: '{{name}} +{{count}}',
                points: '+{{points}}',
                sweep: 'Clean sweep!',
                noVoters: 'Nobody',
                next: 'Next duel',
                toResults: 'Final scores',
                waitingForHost: 'Waiting for the host…',
                waitingForResults: 'Waiting for the host…'
            }
        },
        results: {
            loading: 'Loading result…'
        },
        errors: {
            expired: 'Your session expired. Log in again.',
            gameGone: "This game doesn't exist anymore.",
            generic: 'Something went wrong. Try again.',
            network: 'No connection. Check your internet and try again.',
            lobbyFull: 'This lobby is full.',
            lobbyGone: "This lobby doesn't exist anymore. Check the code.",
            alreadyStarted: 'This game already started.',
            notEnoughPlayers: 'You need more players to start.',
            tooManyPlayers: 'Too many players for one game.',
            noContent: 'Not enough questions in this language. Try the other one.',
            incompleteAnswers: 'Answer every question first.',
            answerTooLong: 'One of your answers is too long.',
            badAnswer: "An answer can't be empty.",
            alreadyAnswered: 'You already sent your answers.',
            alreadyVoted: 'You already voted on this duel.',
            cannotVoteOwnPrompt: "You can't vote on your own duel.",
            wrongRound: 'This duel is already over.',
            wrongPhase: "You can't do that yet.",
            gameFinished: 'This game is over.'
        }
    },
    friends: {
        title: 'Friends',
        description: 'Because playing alone is boring.',
        how: {
            title: 'Adding friends',
            message: 'Anyone you play a game with becomes your friend automatically.'
        },
        listLabel: 'Your friends',
        since: 'Since {{date}}',
        empty: {
            title: 'Nobody yet',
            message: "Start a game and share the code, or join someone else's. Everyone from your lobby shows up here."
        },
        errors: {
            signedOut: 'Your session expired. Log in again.',
            generic: "Couldn't load your friends.",
            network: 'No connection. Check your internet and try again.'
        }
    },
    invite: {
        title: 'Invite a friend',
        message: 'They get a notification in the app or on their phone.',
        send: 'Invite',
        sent: 'Invited',
        failed: "Didn't send",
        alreadyHere: 'In the lobby',
        noFriends: "You haven't played with anyone yet. Share the code, everyone who joins becomes your friend.",
        loadFailed: "Couldn't load your friends."
    },
    notifications: {
        inviteEyebrow: 'Invite',
        inviteHeadline: '{{name}} wants to play',
        inviteRoom: "{{game}} · {{name}}'s lobby",
        inviteTournament: "{{game}} · {{name}}'s tournament",
        inviteGeneric: '{{name}} invited you to a game',
        join: 'Join',
        ignore: 'Ignore'
    }
} as const;
