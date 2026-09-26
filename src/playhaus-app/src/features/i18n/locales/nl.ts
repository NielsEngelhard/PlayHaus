import type { Catalog } from '@/features/i18n/catalog';

export const nl: Catalog = {
    common: {
        retry: 'Opnieuw',
        back: 'Terug',
        backToGames: 'Terug',
        busy: 'Bezig…',
        failed: 'Mislukt',
        close: 'Sluiten',
        save: 'Opslaan',
        you: 'Jij',
        host: 'Host',
        yourTurn: 'AAN ZET',
        and: 'en',
        on: 'AAN',
        off: 'UIT',
        loading: 'Laden…',
        language: 'Taal',
        selectValue: '{{label}}: {{value}}',
        nothingSelected: 'niets gekozen',
        change: 'wijzig',
        minutes: 'min',
        start: 'Start',
        next: 'Verder',
        stepOf: 'Stap {{step}} van {{total}}',
        time: {
            justNow: 'zojuist',
            minutesAgo: '{{minutes}} min geleden',
            hoursAgo: '{{hours}} uur geleden',
            yesterday: 'gisteren',
            daysAgo: '{{days}} dagen geleden',
            onDate: 'op {{day}} {{month}} {{year}}',
            months: {
                jan: 'jan', feb: 'feb', mar: 'mrt', apr: 'apr',
                may: 'mei', jun: 'jun', jul: 'jul', aug: 'aug',
                sep: 'sep', oct: 'okt', nov: 'nov', dec: 'dec'
            },
            days: {
                mon: 'ma', tue: 'di', wed: 'wo', thu: 'do',
                fri: 'vr', sat: 'za', sun: 'zo'
            }
        },
        player: {
            players: 'Spelers',
            add: 'Toevoegen',
            remove: 'Verwijder',
            namePlaceholder: 'Naam',
            seated: '{{players}} spelers'
        }
    },
    nav: {
        games: 'Spellen',
        reconnect: 'Reconnect',
        friends: 'Vrienden',
        profile: 'Profiel'
    },
    chrome: {
        toDarkMode: 'Donkere modus',
        toLightMode: 'Lichte modus',
        muteSound: 'Geluid uit',
        unmuteSound: 'Geluid aan',
        signedInAs: 'Ingelogd als {{name}}. Naar je profiel.'
    },
    notFound: {
        title: 'Pagina niet gevonden',
        message: 'Deze pagina bestaat niet (meer).',
        action: 'Naar home'
    },
    home: {
        headline: {
            title: 'Kleine spelletjes,',
            accent: 'groot plezier.'
        },
        subtitle: 'Partygames voor jou en je vrienden. Kies er een en spelen maar!',
        stillRunning: {
            label: 'Nog bezig',
            line: '{{title}} · {{mode}} {{time}}'
        },
        join: {
            placeholder: 'CODE',
            action: 'Join',
            label: 'Lobbycode'
        },
        startNew: 'Alle spellen',
        bottomTeaser: 'Meer spellen in de maak...'
    },
    games: {
        device: {
            perPlayer: '1 per speler',
            oneDevice: '1 totaal',
            perPlayerOrOneDevice: 'keuze'
        },
        leagueOfLetters: {
            description: 'Raad het woord. Solo of tegen je vrienden.',
            mainCategory: 'Woord raden'
        },
        quizzer: {
            description: 'Test je algemene kennis.',
            mainCategory: 'Trivia'
        },
        oneOfUs: {
            description: 'Wie is de bedrieger?',
            mainCategory: 'Bluf'
        },
        fakeFiller: {
            description: 'Verzin een fout antwoord.',
            mainCategory: 'Misleiding'
        },
        wittyWars: {
            description: 'Wees grappiger dan de rest.',
            mainCategory: 'Party'
        },
        newBadge: 'Nieuw',
        wipBadge: 'In de maak'
    },
    join: {
        label: 'JOIN EEN GAME',
        paste: 'Plakken',
        pasteLabel: 'Code plakken',
        codeLabel: 'Joincode',
        gameHint: 'Je joint {{game}}',
        rejected: 'Deze code werkt niet. Check hem en probeer opnieuw.'
    },
    languages: {
        nl: { description: 'Spellen in het Nederlands' },
        en: { description: 'Games in English' }
    },
    auth: {
        login: {
            title: 'Inloggen',
            email: 'E-mail',
            emailPlaceholder: 'jij@voorbeeld.nl',
            password: 'Wachtwoord',
            passwordPlaceholder: 'Je wachtwoord',
            submit: 'Inloggen',
            submitting: 'Inloggen…',
            signupPrompt: 'Nog geen account? Maak er een aan'
        },
        signup: {
            title: 'Account aanmaken',
            name: 'Speelnaam',
            namePlaceholder: 'Jouw naam',
            email: 'E-mail',
            emailPlaceholder: 'jij@voorbeeld.nl',
            password: 'Wachtwoord',
            passwordPlaceholder: 'Kies een wachtwoord',
            submit: 'Account aanmaken',
            submitting: 'Aanmaken…',
            nameNote: 'Deze naam zien andere spelers in de lobby. Je kunt hem later aanpassen.',
            invalidEmail: 'Dit is geen geldig e-mailadres.'
        },
        guestLanguage: {
            title: 'Welkom bij Playhaus',
            description: 'In welke taal wil je spelen?',
            note: 'Daarna kies je een naam en speel je als gast. Je kunt later gratis een echt account maken.',
            login: 'Al een account? Log in'
        },
        guestUsername: {
            title: 'Kies een naam',
            description: 'Deze naam zien andere spelers in de lobby. Je kunt hem later aanpassen.',
            placeholder: 'Jouw naam',
            random: 'Willekeurige naam',
            note: 'Min {{min}}, max {{max}} tekens.',
            submit: 'Doorgaan',
            submitting: 'Aanmelden…'
        },
        errors: {
            invalidCredentials: 'E-mail of wachtwoord klopt niet.',
            emailInUse: 'Dit e-mailadres is al in gebruik.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding. Check je internet en probeer opnieuw.'
        }
    },
    profile: {
        loading: 'Profiel laden…',
        card: { action: 'Mijn profiel', caption: 'Dit ben jij, knapperd!' },
        name: {
            label: 'Speelnaam',
            placeholder: 'Jouw naam',
            random: 'Willekeurige naam',
            note: 'Min {{min}}, max {{max}} tekens. Deze naam zien andere spelers in de lobby.'
        },
        avatar: { title: 'Avatarkleur' },
        colors: {
            lemon: 'Citroen',
            fire: 'Vuur',
            cobalt: 'Kobalt',
            mint: 'Mint',
            blush: 'Blush',
            ink: 'Inkt'
        },
        settings: {
            title: 'Instellingen',
            sounds: { title: 'Geluid', description: 'Een zacht plopje bij elke tik.' },
            music: { title: 'Muziek', description: 'Muziek in de lobby en tijdens het spelen.' },
            vibration: { title: 'Trillen', description: 'Korte trilling bij een tik op je telefoon.' }
        },
        guest: {
            title: 'Gastaccount',
            message: 'Je speelt als gast. Gastaccounts worden af en toe opgeruimd, en dan ben je je stats kwijt. Voeg een e-mailadres en wachtwoord toe om je account te houden.',
            action: 'Upgrade (gratis)'
        },
        upgrade: {
            title: 'Houd je account',
            description: 'Voeg een e-mailadres en wachtwoord toe. Je naam, kleur en spellen blijven gewoon staan.',
            email: 'E-mail',
            emailPlaceholder: 'jij@voorbeeld.nl',
            password: 'Wachtwoord',
            passwordPlaceholder: 'Kies een wachtwoord',
            submit: 'Account opslaan',
            submitting: 'Opslaan…',
            note: 'Hiermee log je voortaan op elk apparaat in.',
            invalidEmail: 'Dit is geen geldig e-mailadres.',
            shortPassword: 'Je wachtwoord moet minstens 8 tekens hebben.'
        },
        logout: 'Uitloggen',
        errors: {
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding. Check je internet en probeer opnieuw.'
        }
    },
    reconnect: {
        hero: {
            title: 'Join een spel', accent: 'met een code',
            resume: { title: 'Ga verder', accent: 'waar je gebleven was' }
        },
        loading: 'Spellen zoeken…',
        stillRunning: 'Nog bezig',
        orJoin: 'Of join een spel',
        nothingRunning: 'Niets bezig',
        updated: 'Bijgewerkt {{time}}',
        resume: 'Verder met {{game}}',
        refresh: { label: 'Spellen opnieuw ophalen', action: 'Vernieuwen' },
        empty: {
            title: 'Geen spellen bezig',
            message: 'Spellen die je halverwege laat liggen, vind je hier terug.'
        },
        mode: { solo: 'Solo', lobby: 'Lobby', oneDevice: '1 telefoon', tournament: 'Toernooi' },
        errors: {
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            generic: 'Je spellen konden niet worden opgehaald. Probeer het opnieuw.',
            network: 'Geen verbinding. Check je internet en probeer opnieuw.'
        },
        codeNotFound: 'Die code bestaat niet. Check hem en probeer opnieuw.'
    },
    lobby: {
        yourRoom: 'Jouw lobby',
        named: 'Lobby {{code}}',
        live: 'Live',
        offline: 'Offline',
        disconnected: 'Verbinding met de lobby kwijt',
        close: 'Lobby sluiten',
        leave: 'Lobby verlaten',
        shareCodeInvite: 'Deel deze code met je vrienden',
        code: 'Lobbycode',
        codeSpoken: 'Lobbycode: {{characters}}',
        copyCode: 'Lobbycode {{characters}} kopiëren',
        copied: 'Gekopieerd',
        shareTitle: 'Kom in mijn lobby',
        copyLink: 'Kopieer link',
        copyLinkLabel: 'Kopieer de link naar deze lobby',
        shareLink: 'Delen',
        shareLinkLabel: 'Deel de link naar deze lobby',
        players: 'Spelers',
        playerCount: '{{taken}} van {{max}}',
        minPlayers: 'Min. {{min}}',
        inLobby: 'In de lobby',
        hostYou: 'Host · jij',
        hostTag: 'Host',
        away: 'Even weg',
        freeSeat: 'Plek vrij',
        invite: 'Nodig uit',
        seatsLeftOne: 'nog 1 plek',
        seatsLeftMany: 'nog {{seats}} plekken',
        needPlayersOne: 'Nog 1 speler nodig',
        needPlayersMany: 'Nog {{count}} spelers nodig',
        tapToInvite: 'Tik om een vriend uit te nodigen',
        waitingForHost: 'Wachten op de host',
        waitingForHostMessage: '{{name}} zet het spel klaar. Blijf op dit scherm, het spel start vanzelf.',
        waitingLabel: 'Wachten',
        closedTitle: 'Lobby gesloten'
    },
    scoreboard: {
        eyebrow: 'Eindstand',
        subtitle: '{{game}} · {{rounds}} rondes',
        winner: 'Winnaar',
        draw: 'Gelijkspel',
        points: '{{score}} punten',
        pointsStars: '{{stars}} ★ · {{score}}',
        stars: '{{stars}} ★',
        standings: 'Volledige stand',
        playAgain: 'Nog een spel',
        waitingForHost: 'De host kan een nieuw spel starten, ',
        stayHere: 'blijf hier'
    },
    lol: {
        index: {
            description: 'Raad het geheime woord.',
            playingAs: 'Jij bent {{name}}',
            solo: {
                title: 'Solo',
                description: 'Lekker in je eentje.',
                action: 'Instellen',
                best: 'Best {{score}}'
            },
            multiplayer: { title: 'Multiplayer', description: 'Maak een lobby.', action: 'Openen' },
            wordOfTheDay: {
                title: 'Woord van de dag',
                resetIn: 'Nieuw woord over {{time}}'
            },
            tournament: {
                badge: 'Nieuw',
                title: 'Toernooi',
                description: '4 tot 12 spelers, 1v1 (1v1v1 bij oneven), vier rondes per potje. Twee keer verloren en je ligt eruit.',
                action: 'Toernooi maken'
            }
        },
        settings: {
            loading: 'Spel zoeken…',
            title: 'Solo',
            wordLength: 'Woordlengte',
            wordLengthOption: '{{letters}} letters',
            summary: {
                seconds: '{{seconds}}s',
                hardOn: 'Moeilijk',
                hardOff: 'Normaal',
                zen: 'Zen',
                competitive: 'Competitief'
            },
            mode: {
                title: 'Spelmodus',
                badge: 'Nieuw',
                zen: {
                    label: 'Zen',
                    description: 'Geen tijd, geen score. Geen druk!'
                },
                competitive: {
                    label: 'Competitief',
                    description: 'Raad alle drie de woorden zo snel mogelijk, in zo min mogelijk pogingen. Sneller is meer punten.'
                }
            },
            hardMode: {
                label: 'Moeilijke modus',
                description: 'Elk bestaand woord kan voorkomen. Zet uit voor alleen bekende woorden.'
            },
            facts: '{{rounds}} rondes · {{guesses}} pogingen per ronde · eerste letter gegeven',
            competitiveFacts: '{{rounds}} rondes · {{guesses}} pogingen per ronde · tijdbonus tot {{minutes}} minuten',
            start: 'Starten',
            running: {
                title: 'Je hebt nog een spel open',
                message: 'Ga verder waar je gebleven was, of gooi het weg en begin opnieuw.',
                resume: 'Verder spelen',
                discard: 'Weggooien'
            }
        },
        game: {
            loading: 'Spel laden…',
            loadFailed: 'Spel kon niet worden geladen.',
            guessUnsupported: 'Raden werkt nog niet op deze server.',
            alreadyGuessedYou: 'Die had je al.',
            alreadyGuessed: 'Die is al geprobeerd.',
            mustStartWith: 'Het woord begint met een {{letter}}.',
            resultLabel: 'Uitslag',
            viewResult: 'Bekijk de uitslag',
            nextRound: 'Volgende ronde',
            guesses: '{{guesses}}/{{max}}',
            roundOf: 'Ronde {{round}} van {{total}}',
            hint: 'Hint',
            hintLabel: 'Hint: het woord begint met een {{letter}}',
            dailyLabel: 'Woord van de dag',
            solved: 'GOED',
            lost: 'HELAAS',
            theWord: 'Het woord',
            attempts: 'Pogingen',
            guess: 'GO',
            clear: 'Wissen',
            timeLeft: 'Tijd over',
            wordLengthLabel: '{{letters}} letters',
            scoreLabel: '{{name}}, {{score}} punten',
            scoreCompactLabel: '{{score}} punten',
            playTimeLabel: 'Speeltijd: {{time}}',
            yourTurnNotice: 'JOUW BEURT!'
        },
        results: {
            loading: 'Uitslag laden…',
            loadFailed: 'Uitslag kon niet worden geladen.',
            title: 'Spel afgelopen',
            summary: 'Rondes: {{rounds}} · Letters: {{length}}',
            baseScore: 'Pogingen',
            timeBonus: 'Tijdbonus',
            total: 'Totaal',
            newHighScore: 'Nieuw record op {{letters}} letters!',
            again: 'Nog een keer'
        },
        lobby: {
            loading: 'Lobby zoeken…',
            opening: 'Lobby openen…',
            noGame: 'Geen spel',
            noLobby: 'Geen lobby',
            hostStoppedGame: 'De host heeft het spel gestopt. Vraag om een nieuwe code.',
            hostClosedLobby: 'De host heeft de lobby gesloten. Vraag om een nieuwe code.',
            running: {
                gameTitle: 'Je speelt al een spel',
                lobbyTitle: 'Je hebt nog een lobby open',
                gameMessage: 'Je speelt nog in lobby {{code}}. Ga verder, of stop en open een nieuwe lobby.',
                lobbyMessage: 'Lobby {{code}} staat nog open. Ga terug, of sluit hem en open een nieuwe.',
                resumeGame: 'Verder spelen',
                resumeLobby: 'Naar open lobby',
                stopGame: 'Spel stoppen',
                closeLobby: 'Sluiten en nieuwe maken'
            },
            confirmClose: {
                title: 'Lobby sluiten?',
                message: 'De code werkt dan niet meer en iedereen in de lobby ligt eruit.',
                action: 'Sluiten'
            },
            confirmLeave: {
                title: 'Lobby verlaten?',
                message: 'Je kunt later terugkomen met dezelfde code.',
                action: 'Verlaten'
            },
            stay: 'Blijf hier',
            start: 'Start het spel',
            startNote: 'Na de start kan niemand meer joinen.',
            needPlayers: 'Je hebt minstens één medespeler nodig.',
            hostFallback: 'De host',
            settingsTitle: 'Instellingen',
            timePerTurn: 'Tijd per beurt',
            timePerTurnOption: '{{seconds}} seconden'
        },
        wordOfTheDay: {
            eyebrow: 'Woord van de dag',
            streakDays: '{{days}} dagen op rij',
            guesses: 'Pogingen',
            legendMissed: 'Gemist',
            statBest: 'Beste dag',
            statAverage: 'Gemiddeld',
            statDays: 'Dagen',
            playDay: 'Speel {{day}}',
            playHint: '{{letters}} letters · geen klok',
            resume: 'Verder spelen',
            nextWord: 'Nieuw woord over {{time}}',
            bestAndNext: 'Je beste is {{guesses}} · nieuw woord over {{time}}',
            solvedInOne: 'Geraden in {{guesses}} poging',
            solvedInMany: 'Geraden in {{guesses}} pogingen',
            notSolved: 'Vandaag niet gelukt. Het woord was {{word}}.'
        },
        tournament: {
            loading: 'Toernooi laden…',
            noBracket: 'Geen toernooi',
            yourTournament: 'Jouw toernooi',
            start: 'Maak het schema',
            startNote: 'Na de start kan niemand meer joinen.',
            needPlayers: 'Een toernooi heeft minstens vier spelers nodig.',
            confirmLeave: {
                title: 'Toernooi verlaten?',
                message: 'Je potjes lopen door en je kunt ze op tijd verliezen. Met dezelfde code kom je terug.',
                action: 'Verlaten'
            },
            title: 'Toernooi · {{players}} spelers',
            bracketKicker: 'Schema · dubbele eliminatie',
            nextRoundReady: 'Ronde {{stage}} kan starten',
            stageDrawn: 'Ronde {{stage}} is geloot',
            matchesLeft: '{{done}} van {{total}} potjes klaar · {{left}} nog bezig',
            winnersRound: 'Winnaars · ronde {{stage}}',
            losersRound: 'Verliezers · ronde {{stage}}',
            final: 'Finale',
            settled: 'klaar',
            advancing: '{{players}} door',
            feedsEmpty: 'nog leeg',
            yourSide: 'jouw kant',
            dropsHere: 'Verliezers van ronde {{stage}} gaan naar de loser bracket',
            playing: 'Bezig',
            upNext: 'Straks',
            bye: 'Vrije doorgang naar de volgende ronde',
            you: 'Jij',
            knockedOut: {
                title: 'Uitgeschakeld',
                message: 'Je bent {{place}}e geworden. Kijk gerust hoe het afloopt.'
            },
            startMatches: 'Start de potjes',
            waitingForStart: 'Wachten tot {{name}} start',
            startGateOne: '1 potje is geloot en start als de host dat doet',
            startGateMany: '{{matches}} potjes zijn geloot en starten tegelijk',
            waitingOnOne: 'Wachten op 1 potje',
            waitingOnMany: 'Wachten op {{matches}} potjes',
            readyWaiting: 'Wachten op de rest',
            readyNotNeededOut: 'Je ligt eruit, je hoeft niet klaar te melden',
            readyNotNeededBye: 'Je slaat de volgende ronde over',
            ready: 'Ik ben klaar',
            readyCount: '{{ready}} van {{total}} klaar · start als iedereen er is',
            readyGate: 'Ready kan zodra alle {{matches}} potjes klaar zijn',
            markReady: 'Klaar',
            markNotReady: 'Nog niet klaar',
            backToBracket: 'Terug naar het schema',
            champion: {
                title: 'Kampioen',
                you: 'Jij hebt het toernooi gewonnen!',
                player: '{{name}} wint het toernooi.'
            },
            lossOne: '1 verlies',
            lossMany: '{{losses}} verliezen'
        },
        errors: {
            staleServer: 'De server draait een oude versie van dit spel. Herstart de API en probeer opnieuw.',
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            gameGone: 'Dit spel bestaat niet meer.',
            badSettings: 'Deze instellingen kloppen niet. Kies een andere woordlengte.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding. Check je internet en probeer opnieuw.',
            invalidWord: 'Ongeldig woord.',
            roundClosed: 'Deze ronde is al voorbij.',
            lobbyFull: 'Deze lobby is vol.',
            lobbyGone: 'Deze lobby bestaat niet (meer). Check de code.',
            alreadyStarted: 'Dit spel is al begonnen.',
            alreadyPlayedToday: 'Je hebt vandaag al gespeeld. Kom morgen terug.',
            notEnoughForTournament: 'Een toernooi heeft 4 tot 12 spelers nodig.',
            stageNotOver: 'Deze ronde is nog niet klaar.',
            stageStarted: 'Deze ronde is al begonnen.',
            tournamentOver: 'Dit toernooi is al afgelopen.'
        }
    },
    pubquizr: {
        index: {
            description: 'Een klassieke pubquiz, maar dan leuker.',
            oneDevice: { title: '1 telefoon', description: 'Geef de telefoon door.', action: 'Instellen' },
            multiDevice: { title: 'Per speler', description: 'Iedereen een eigen telefoon', action: 'Lobby openen' },
            centralScreen: { title: 'Centraal scherm', description: 'Quiz op de tv, telefoons als controller.', action: 'Instellen' },
            playMode: {
                title: 'Hoe spelen jullie?',
                message: 'Iedereen speelt op een eigen telefoon. Doet er ook een groot scherm mee?',
                phonesOnly: {
                    title: 'Alleen telefoons',
                    description: 'De vraag staat op elke telefoon.',
                    need: 'Nodig: een telefoon per speler'
                },
                withScreen: {
                    title: 'Met centraal scherm',
                    description: 'De vraag staat op de tv, telefoons zijn de knoppen.',
                    need: 'Nodig: een tv of laptop met browser'
                },
                locked: 'Dit ligt vast zodra de lobby open is'
            },
            tableScreen: { title: 'Tafelscherm', subtitle: 'Op de tv' },
            allQuizzes: { title: 'Alle quizzen', subtitle: 'Bekijk de lijst' },
            library: {
                title: 'Alle quizzen',
                subtitle: 'Muziek, film, geschiedenis en meer'
            },
            pickOne: 'Kies er een',
            playThis: 'Speel deze',
            newBadge: 'Nieuw',
            weekly: {
                weekday: 'WOE',
                promise: 'ELKE WEEK EEN\nNIEUWE QUIZ'
            },
            list: {
                label: 'Alle quizzen',
                tabs: { weekly: 'Wekelijks', official: 'Officieel', community: 'Community' },
                unplayedOnly: 'Ongespeeld',
                weeklyCadence: 'Elke woensdag een nieuwe',
                newThisWeek: 'Nieuw deze week',
                week: 'Week {{week}}',
                published: '{{day}} {{month}} {{year}}',
                played: 'Gespeeld',
                loadOlder: 'Ouder laden',
                browse: 'Bekijk alle quizzen',
                empty: 'Hier staat nog niks.',
                filterEmpty: 'Nog niks.',
                failed: 'Quizzen konden niet worden geladen. Check je internet.',
                comingSoon: 'Coming soon...',
                search: 'Zoek een quiz…',
                searchLabel: 'Zoek in deze quizzen',
                noMatches: 'Niks gevonden.',
                noMatchesMore: 'Nog niks gevonden, oudere quizzen worden geladen.',
                sortNewest: 'Nieuwste',
                sortAlpha: 'A-Z'
            }
        },
        oneDevice: {
            title: '1 telefoon',
            description: 'Speel met één telefoon die rondgaat.',
            players: {
                seat: 'Speler {{seat}}',
                tooFew: 'Je hebt minstens twee spelers nodig.',
                tooMany: 'Maximaal acht spelers.',
                duplicate: 'Twee spelers hebben dezelfde naam.'
            },
            seat: {
                first: 'Jij, met de telefoon',
                leftOf: 'Links van {{name}}',
                fallback: 'Naast speler {{seat}}',
                placeholder: 'Wie zit daar?',
                add: 'Speler toevoegen'
            },
            quiz: {
                selected: 'Jullie spelen',
                empty: {
                    title: 'Nog geen quiz gekozen',
                    message: 'Kies er hieronder een.'
                },
                pick: 'Kies een quiz',
                pickAnother: 'Of kies een andere'
            },
            steps: {
                seatsTitle: 'Wie spelen er mee?',
                quizTitle: 'Kies een quiz',
                settingsTitle: 'Instellingen',
                table: 'Spelers'
            },
            zenMode: {
                label: 'Zen-modus',
                description: 'Geen tijdsdruk. Rondes met een timer worden aangepast.',
                caption: 'Zen · geen timers'
            },
            triviaMode: {
                label: 'Alleen trivia',
                description: 'Alleen vragen en antwoorden. De omschrijfronde en de ronde met vier antwoorden vallen weg.',
                caption: 'Alleen trivia · 4 rondes'
            },
            start: 'Start de quiz',
            loading: 'Laden…',
            running: {
                title: 'Er staat nog een quiz open',
                message: 'Ga verder waar jullie gebleven waren, of gooi hem weg en begin opnieuw.',
                resume: 'Verder spelen',
                discard: 'Weggooien'
            }
        },
        lobby: {
            settingsTitle: 'Instellingen',
            loading: 'Lobby zoeken…',
            opening: 'Lobby openen…',
            noLobby: 'Geen lobby',
            hostClosedLobby: 'De host heeft de lobby gesloten. Vraag om een nieuwe code.',
            hostStoppedQuiz: 'De host heeft de quiz gestopt. Vraag om een nieuwe code.',
            dealt: 'De quiz begint…',
            pairing: {
                title: 'Scherm koppelen',
                stepScreen: 'Scherm',
                stepRoom: 'Lobby',
                cardTitle: 'Koppel eerst het scherm',
                openOn: 'Open op de tv of laptop',
                openOnNoUrl: 'Open de lobby op de tv of laptop en vul de code in',
                fillIn: 'EN VUL IN',
                waiting: 'Wachten op het scherm…',
                onePlayerWaiting: '1 speler wacht al met code {{code}}',
                playersWaiting: '{{count}} spelers wachten al met code {{code}}',
                blocked: 'Zonder scherm kun je niet verder',
                auto: 'Je gaat vanzelf verder zodra het scherm verbonden is',
                orFromHere: 'Of zet het vanaf hier op de tv'
            },
            screenConnected: {
                title: 'Scherm verbonden',
                message: 'De quiz staat op het scherm zodra je start.'
            },
            cast: {
                action: 'Chromecast',
                connected: 'Aan het casten, tik om te wisselen'
            },
            airplay: {
                action: 'AirPlay',
                connected: 'AirPlay verbonden',
                helpTitle: 'AirPlay naar je tv',
                helpStep1: 'Open het bedieningspaneel',
                helpStep2: 'Tik op Synchrone weergave',
                helpStep3: 'Kies je tv',
                keepOpen: 'Laat PlayHaus open op deze telefoon, anders wordt de tv zwart.'
            },
            running: {
                quizTitle: 'Je speelt al een quiz',
                lobbyTitle: 'Je hebt nog een lobby open',
                quizMessage: 'In lobby {{code}} loopt nog een quiz. Ga verder, of stop en open een nieuwe lobby.',
                lobbyMessage: 'Lobby {{code}} staat nog open. Ga terug, of sluit hem en open een nieuwe.',
                resumeQuiz: 'Verder spelen',
                resumeLobby: 'Naar open lobby',
                stopQuiz: 'Quiz stoppen',
                closeLobby: 'Sluiten en nieuwe maken'
            },
            confirmClose: {
                title: 'Lobby sluiten?',
                message: 'De code werkt dan niet meer en iedereen in de lobby ligt eruit.',
                action: 'Sluiten'
            },
            confirmLeave: {
                title: 'Lobby verlaten?',
                message: 'Je kunt later terugkomen met dezelfde code.',
                action: 'Verlaten'
            },
            stay: 'Blijf hier',
            start: 'Start de quiz',
            startNoteScreen: 'Iedereen kijkt naar het scherm',
            startNotePhones: 'De vraag staat op elke telefoon',
            needPlayers: 'Je hebt minstens {{min}} telefoons nodig.',
            needQuiz: 'Kies eerst een quiz.',
            hostFallback: 'De host'
        },
        table: {
            door: {
                title: 'Quiz op een scherm',
                message: 'Typ de code van de telefoon van de host. Dit scherm kijkt alleen mee, iedereen speelt op zijn eigen telefoon.',
                codeLabel: 'Lobbycode',
                placeholder: 'PXK7Q',
                open: 'Scherm openen',
                rejected: 'Dat is geen quizcode. Check de telefoon van de host.'
            },
            setup: {
                title: 'Zo zet je de quiz op tv',
                wayBrowser: 'Open {{url}} in de browser van de tv en typ de code',
                wayBrowserPlain: 'Open deze pagina in de browser van de tv en typ de code',
                wayHdmi: 'Of sluit een laptop met HDMI aan op de tv',
                wayCast: 'Of cast dit tabblad vanuit Chrome en laat het open',
                wayMirror: 'Of spiegel dit toestel met AirPlay of screencast',
                fullScreen: 'Volledig scherm',
                exitFullScreen: 'Volledig scherm sluiten',
                alreadyPlayingTitle: 'Dit toestel speelt mee',
                alreadyPlaying: 'Open het scherm in een eigen browser op de tv, anders mis je de helft.',
                signingIn: 'Scherm klaarzetten…',
                signInFailed: 'Dit scherm kan het spel niet bereiken.'
            },
            roundOf: 'Ronde {{round}} van {{total}}',
            playAlong: 'Meespelen',
            numbersInLabel: 'getallen binnen',
            recapTitle: 'De woorden',
            recapPoints: '{{name}} pakt {{points}} voor de geraden woorden',
            weightChip: '{{weight}} · {{points}} punten',
            wordsSecret: 'Alleen {{name}} ziet de woorden. De rest krijgt straks nog een bonusgok',
            status: {
                quizmaster: 'Quizmaster',
                turn: 'Aan de beurt',
                missed: 'Fout',
                sent: 'Ingestuurd',
                typing: 'Typt nog',
                describing: 'Omschrijft',
                guessing: 'Raadt',
                choosing: 'Kiest'
            },
            connecting: 'Lobby zoeken…',
            closed: 'De host heeft de lobby gesloten.',
            dealt: 'De quiz is begonnen.',
            joinAt: 'Join via',
            typeHint: 'Typ deze code op je telefoon om mee te doen.',
            waitingForHost: 'Wachten tot de host start…',
            needPlayers: 'Nog {{needed}} nodig om te starten.',
            scores: 'Scores',
            quizmaster: 'Quizmaster',
            guesser: 'Gokker',
            standings: 'Tussenstand',
            answer: 'Het antwoord',
            numbersIn: '{{done}} van {{total}} getallen binnen',
            typeYours: 'Typ je getal op je telefoon.',
            followPhones: 'Speel deze ronde op je telefoon.',
            missed: 'Mis',
            gotSoFar: '{{awarded}} van {{total}} tot nu toe',
            choosing: '{{name}} kiest makkelijk of moeilijk',
            over: 'Dat was de quiz!'
        },
        board: {
            choiceAppears: 'Na de keuze staat de vraag op elke telefoon',
            streakCapped: '{{name}} heeft de max van {{max}} op rij bereikt. Door naar de volgende speler, zodat de anderen ook een kans krijgen.',
            choosing: '{{name}} kiest makkelijk of moeilijk',
            clockSoon: 'De klok start zo',
            closestHint: 'Dubbele getallen mogen · het antwoord komt als iedereen klaar is',
            currentQuizmaster: '{{name}} is quizmaster',
            describes: 'Omschrijft',
            describing: '{{describer}} omschrijft, {{guesser}} raadt',
            easy: 'Makkelijk',
            everyoneAtOnce: 'Iedereen tegelijk',
            gotIt: 'Snap ik',
            guesses: 'Raadt',
            hard: 'Moeilijk',
            imReady: 'Ik ben klaar',
            isUp: '{{name}} is aan de beurt',
            listFooter: '{{guesser}} noemt op · {{master}} vinkt af',
            listRules: 'Eén speler krijgt een vraag met vier antwoorden en {{seconds}} seconden. De quizmaster vinkt af wat goed is. Daarna krijgt de rest één bonusgok op wat er over is.',
            missed: '{{name}} zat ernaast · nu is {{next}}',
            missedToYou: '{{name}} zat ernaast · nu ben jij',
            mustGuess: 'Jij raadt',
            mustGuessRules: '{{describer}} omschrijft {{words}} woorden in {{seconds}} seconden. Elk goed woord is 1 punt voor jullie allebei.',
            namesFour: '{{name}} noemt er vier',
            neverSeeWords: 'Jij ziet de woorden nooit, ook niet achteraf',
            noQuizmaster: 'Geen quizmaster',
            notReadyYet: '{{name}} is nog niet klaar',
            numbersIn: '{{done}} / {{total}} binnen',
            onlyMasterMovesOn: 'Alleen {{name}} kan verder',
            picking: '{{name}} kiest',
            picksOnOwnPhone: '{{name}} kiest op de eigen telefoon',
            onePoint: '1 punt',
            pointsWorth: '{{points}} punten',
            questionOf: 'Vraag {{number}} / {{total}}',
            quizmaster: 'Quizmaster',
            readsAloud: '{{name}} leest de vraag voor',
            queuePlace: 'Jij bent {{place}} in de rij',
            queuePlaceNow: 'Jij bent {{place}} in de rij · jij mag nu',
            previous: {
                label: 'Vorige vraag',
                gotIt: '{{name}} had het goed',
                youGotIt: 'Jij had het goed',
                nobody: 'Niemand had het goed'
            },
            readAhead: 'Lees alvast mee: {{seconds}} seconden zodra de klok loopt',
            readyCount: '{{done}} van {{total}} klaar',
            readyToStart: 'Klaar om te beginnen',
            readyWaiting: 'Klaar. {{name}} start de klok',
            turnOf: 'Beurt {{number}} / {{total}}',
            turnOrder: {
                and: 'en',
                isQuizmaster: '{{name}} is quizmaster',
                isUp: '{{name}} is aan de beurt',
                position: '{{number}} / {{total}}',
                then: 'daarna {{names}}',
                title: 'Volgorde',
                youAreQuizmaster: '{{name}} bent quizmaster',
                youAreUp: 'Jij bent aan de beurt'
            },
            wordsGuessed: '{{done}} van {{total}} geraden',
            wordsSecret: 'Alleen {{name}} ziet de woorden',
            you: 'Jij',
            yourChoiceCue: 'Kies, dan staat je vraag op elke telefoon'
        },
        control: {
            allGuessesIn: 'Iedereen is klaar',
            alsoOnScreen: 'Staat ook op het scherm, jij hoeft alleen te beoordelen',
            everyoneGuesses: 'Iedereen gokt',
            isUpNow: '{{name}} is aan de beurt',
            lettersCue: 'De opties staan op het scherm',
            onScreen: 'TV',
            ordinal: {
                first: '1e',
                second: '2e',
                third: '3e',
                fourth: '4e',
                fifth: '5e',
                sixth: '6e',
                seventh: '7e',
                eighth: '8e'
            },
            watchScreen: 'Kijk naar het scherm',
            yourPlace: 'Jij bent {{place}} deze beurt',
            changeGuess: 'Aanpassen',
            guessSent: 'Je getal is binnen',
            onTheScreen: 'Op het scherm',
            pickAnswer: 'Kies je antwoord',
            roundStarting: 'Wacht tot {{name}} de ronde start',
            theScreenHasIt: 'Kijk naar het grote scherm.',
            submitGuess: 'Insturen',
            theyTapItThemselves: '{{name}} kiest het antwoord op de eigen telefoon.',
            waitingFor: 'Wachten op {{name}}',
            waitingForGuesses: 'Wachten op {{names}}',
            yourChoice: 'Makkelijk of moeilijk?',
            yourChoiceCue: 'Kies, dan komt je vraag op het scherm',
            yourGuess: 'Jouw getal',
            yourTurn: 'Jij bent aan de beurt'
        },
        play: {
            loading: 'Laden…',
            close: 'Quiz verlaten',
            roundLabel: 'Ronde {{round}} · {{kind}}',
            roundTitle: 'Ronde {{round}}: {{kind}}',
            rules: {
                open: 'De quizmaster leest voor en tikt aan wie het goed had. Fout? Dan mag de volgende.',
                choice: 'Geen quizmaster deze ronde. Wie aan de beurt is kiest zelf een letter. Fout? Dan mag de volgende, zonder die optie.',
                closest: 'Iedereen kiest één getal, dubbel mag. Wie het dichtst bij zit krijgt 2 punten. Gelijk? Dan allebei.',
                describe: 'De omschrijver heeft 30 seconden. Elk goed woord is 1 punt voor jullie allebei. Daarna krijgt de rest één bonusgok.',
                list: 'Eén onderwerp. Vier antwoorden.',
                doubleDown: 'Wie aan de beurt is kiest een makkelijke (1p) of moeilijke (3p) vraag.',
                finale: 'Open vragen, één tegen één. Fout? Dan mag de ander. Elk goed antwoord is een ster, en wie na ronde 6 voorstond begint met een bonusster. De meeste sterren wint. Gelijk? Dan wint wie de meeste punten heeft.',
                finaleTwo: 'Open vragen, om de beurt, 2 punten per vraag. Wie na de laatste vraag voorstaat wint.'
            },
            rounds: {
                open: 'Open',
                choice: 'Meerkeuze',
                closest: 'Wie zit het dichtst bij?',
                describe: 'Omschrijven',
                list: 'Wat weet je over...?',
                doubleDown: 'Makkelijk of moeilijk?',
                finale: 'De finale'
            },
            questionNumber: 'Vraag {{number}}',
            questionTotal: ' van {{total}}',
            questionOutOf: '/{{total}}',
            turn: {
                spoken: '{{master}} vraagt het aan {{player}}',
                spokenRun: '{{master}} vraagt het aan {{player}}, die er {{run}} op rij goed heeft',
                quizmasterLabel: '{{name}} is quizmaster',
                answeringNow: 'Nu aan de beurt',
                roleQuizmaster: 'Quizmaster',
                roleGuesser: 'Raadt',
                bonusOf: 'Bonus · {{number}} van {{total}}',
                bonusMissed: '{{name}} had niks',
                bonusTake: '{{name}} had hem',
                nobody: 'Niemand had hem'
            },
            leadOpen: '{{name}} leest voor aan de speler links',
            leadChoice: '{{name}} leest voor · vier opties',
            leadClosest: '{{name}} leest voor · de rest gokt',
            leadDescribe: '{{name}} is aan de beurt',
            leadList: '{{name}} vraagt · één speler noemt op',
            leadDoubleDown: '{{name}} vraagt: makkelijk of moeilijk?',
            leadFinale: '{{name}} leest voor aan de finalisten',
            readAloud: 'Lees dit hardop voor',
            onlyYouSeeThis: 'Het antwoord',
            alsoAccept: 'Ook goed: {{answers}}',
            answer: {
                reveal: 'Tik om het antwoord te zien',
                hide: 'Tik om te verbergen',
                revealHint: 'Laat niemand meekijken'
            },
            validate: 'Beoordelen',
            validateLocked: 'Bekijk eerst het antwoord',
            wrong: 'Fout',
            correct: 'Goed',
            markWrong: '{{name}} fout rekenen',
            markCorrect: '{{name}} goed rekenen',
            wrongPassesTo: 'Fout? Dan mag {{name}}',
            wrongEndsQuestion: 'Niemand meer over, bij fout is de vraag klaar',
            tableRound: 'De tafel rond',
            whoGotIt: 'Vraag eerst aan {{name}}',
            answerLabel: 'Antwoord',
            pickHint: 'Tik aan wie het goed had',
            pickUndoHint: '{{name}} is al af, tik om terug te draaien',
            pickLockHint: 'Tik nog eens op {{name}} om te wissen',
            pickSpoken: '{{name}} had het goed',
            ruleOutSpoken: '{{name}} fout rekenen',
            ruleInSpoken: '{{name}} weer mee laten doen',
            nobodyGotIt: 'Niemand had het',
            nobodyConfirm: 'Volgende vraag',
            nobodyConfirmHint: 'Tik nog eens om verder te gaan',
            lockIn: 'Bevestigen',
            choiceAlwaysPasses: 'Volgende vraag is voor {{name}}',
            correctKeepsTurn: 'Goed! De volgende vraag is weer voor {{name}}',
            worthPoints: '{{worth}}p',
            worthStars: '{{worth}} ★',
            noPoint: 'Geen punt',
            scores: 'Stand',
            choice: {
                options: 'De vier opties',
                spoken: '{{letter}}. {{text}}',
                spokenCorrect: '{{letter}}. {{text}}, dit is het goede antwoord'
            },
            closest: {
                answer: '{{answer}} {{unit}}',
                placeholder: 'Gok',
                entry: 'Gok van {{name}}',
                duplicate: 'Twee spelers hebben hetzelfde getal. Vraag er een om een ander.',
                unreadable: 'Dat is geen getal.',
                typeInstead: 'Gokken toch invullen',
                award: 'Punten geven',
                nearestTakes: 'Dichtstbij krijgt {{worth}}p',
                guessingOrder: 'Wie gokt, op volgorde',
                collect: 'Schrijf de gokken op',
                collectHint: 'Laat iedereen een getal noemen, geen twee dezelfde',
                backToQuestion: 'Terug naar de vraag',
                answerLabel: 'Antwoord · alleen jij',
                hide: 'Verberg',
                theirNumbers: 'Hun getallen',
                filled: '{{filled}} van {{total}} ingevuld',
                off: '{{off}} ernaast',
                nearestOff: 'dichtstbij · {{off}} ernaast',
                says: '{{name}} zegt…',
                now: 'nu',
                position: '{{number}} van {{total}}',
                missingTitle: 'Niet iedereen heeft een getal',
                missingOne: '{{names}} heeft niks ingevuld en kan deze niet winnen.',
                missingMany: '{{names}} hebben niks ingevuld en kunnen deze niet winnen.',
                missingBack: 'Terug om in te vullen',
                missingAnyway: 'Toch afronden',
                result: {
                    nearestOne: '{{names}} zat het dichtst bij',
                    nearestMany: '{{names}} zaten het dichtst bij',
                    nobody: 'Niemand zat het dichtst bij',
                    paidOne: '{{worth}} punten',
                    paidMany: '{{worth}} punten elk',
                    paidNobody: 'Geen punten deze keer',
                    answerLabel: 'Het antwoord',
                    guessesLabel: 'Alle gokken',
                    continue: 'Verder'
                }
            },
            pad: {
                minus: 'Min',
                backspace: 'Wissen'
            },
            describe: {
                readyRuleOnlyGuesser: 'Je omschrijft aan {{guesser}}. Zolang de klok loopt telt alleen wat {{guesser}} zegt',
                readyRuleTime: '{{seconds}} seconden om zoveel mogelijk van je {{words}} woorden te omschrijven',
                readyRuleNoSaying: 'Zeg het woord zelf nooit, anders telt het niet.',
                readyRuleBothScore: 'Elk woord dat {{guesser}} raadt is een punt voor jullie allebei',
                readyRuleBonus: 'Als de tijd om is krijgen de andere {{others}} spelers elk één gok op een woord dat nog niet geraden is',
                start: 'Start',
                dontSayIt: 'Zeg het woord zelf nooit',
                runningReminder: 'Tik een woord aan zodra {{guesser}} het heeft. De rest is straks aan de beurt.',
                inTimeTitle: 'Wat had {{guesser}}?',
                inTimeHint: 'Tik elk woord aan dat {{guesser}} op tijd zei',
                toBonus: 'Bonusronde · nog {{left}} over',
                toSettle: 'Naar de punten',
                bonusHint: 'De quizmaster zegt niks meer. De rest mag elk nog één woord raden voor een bonuspunt.',
                scoringTitle: 'Hoe ging het?',
                standing: '{{name}} pakt {{points}}p deze beurt',
                scoreAgain: 'Opnieuw scoren',
                settle: 'Verder'
            },
            list: {
                readyRuleOnlyGuesser: 'Je vraagt het aan {{guesser}}. Tot hun beurt voorbij is telt alleen wat zij zeggen',
                readyRuleTime: '{{seconds}} seconden om zoveel mogelijk van de {{answers}} antwoorden te noemen',
                readyRuleGuesses: '{{guesses}} gokken om zoveel mogelijk van de {{answers}} antwoorden te noemen',
                readyRuleHidden: 'Alleen jij als quizmaster ziet de antwoorden',
                readyRuleScore: 'Elk goed antwoord is {{worth}} punten voor de gokker',
                readyRuleBonus: 'Daarna krijgen de andere {{others}} spelers elk één bonusgok op wat er nog over is',
                start: 'Start',
                preTimerHint: 'Lees de vraag voor en start de klok, dan kan {{guesser}} gokken',
                startTimer: 'Start de klok',
                runningReminder: 'Vink elk antwoord af dat {{guesser}} noemt. De rest telt nog niet mee.',
                zenNotice: 'Geen tijdsdruk. {{guesser}} mag {{nGuesses}} keer gokken, daarna krijgt de rest één bonusgok op wat er over is.',
                inTimeTitle: 'Wat had {{guesser}}?',
                inTimeHint: 'Tik elk antwoord aan dat {{guesser}} goed had',
                toBonus: 'Bonusronde · nog {{left}} over',
                toSettle: 'Naar de punten',
                bonusHint: 'Eén gok op een van deze. Goed is een punt voor jou.',
                scoringTitle: 'Resultaat',
                standing: '{{name}} pakt {{points}}p deze vraag',
                scoreAgain: 'Opnieuw scoren',
                settle: 'Verder'
            },
            doubleDown: {
                ask: 'Wil {{name}} een makkelijke of moeilijke vraag?',
                easy: 'Makkelijk · {{points}} punt',
                hard: 'Moeilijk · {{points}} punten'
            },
            tieBreak: {
                kicker: 'Voor de finale',
                title: 'Gelijkspel!',
                bodyOne: '{{names}} staan gelijk. Speel steen-papier-schaar: de winnaar gaat naar de finale.',
                bodyTwo: '{{names}} staan gelijk. Speel steen-papier-schaar: de twee winnaars gaan naar de finale.',
                through: '{{name}} staat al in de finale.',
                pickOne: 'Winnaar naar de finale',
                pickTwo: 'Winnaars naar de finale',
                waiting: '{{name}} tikt aan wie er won.'
            },
            intro: {
                of: 'van {{total}}',
                round: 'Ronde {{round}}',
                briefOpen: 'Twintig open vragen. De quizmaster vraagt het aan de speler links. Goed? Dan is de volgende ook voor jou. Fout? Dan mag de volgende. Elke vraag is een punt.',
                briefChoice: 'Lastigere vragen, meerkeuze. Iedereen begint een keer en is een keer quizmaster. Elke vraag is 2 punten.',
                briefClosest: 'Een vraag met een getal als antwoord. Iedereen behalve de quizmaster gokt één keer, geen twee dezelfde. Dichtstbij krijgt 2 punten.',
                briefClosestEveryone: 'Een vraag met een getal als antwoord. Iedereen typt één gok op de eigen telefoon. Dichtstbij krijgt 2 punten, bij gelijkspel allebei.',
                briefDescribe: '30 seconden om je woorden te omschrijven zonder het woord (of een vertaling) te zeggen.',
                briefList: 'Eén vraag, vier antwoorden. De speler links van de quizmaster heeft twintig seconden om er zoveel mogelijk te noemen. Daarna krijgt de rest één gok op wat er over is. Elk goed antwoord is 2 punten.',
                briefListZen: 'Eén vraag, vier antwoorden. De speler links van de quizmaster krijgt acht gokken, zonder klok. Daarna krijgt de rest één gok op wat er over is. Elk goed antwoord is 2 punten.',
                briefDoubleDown: 'Makkelijk (1 punt) of moeilijk (3 punten)? Er zijn er vijf van elk, dus op is op. Fout? Dan gaat de vraag de tafel rond voor de volle punten.',
                briefFinale: 'De twee beste spelers spelen de finale. Elk goed antwoord is een ster, en wie na ronde 6 voorstond begint met een bonusster. Wie achter staat begint. De meeste sterren wint. Gelijk? Dan wint wie de meeste punten heeft.',
                briefFinaleTwo: 'Jullie spelen met z’n tweeën en lezen elkaar voor. Wie achter staat krijgt de vraag, fout is fout. Elk goed antwoord is 2 punten. De meeste punten wint.',
                bonusStar: '{{name}} stond na ronde 6 voor en begint met een bonusster',
                noBonusStar: 'Gelijk op punten, dus geen bonusster',
                versus: 'vs',
                quizmaster: '{{name}} is quizmaster',
                action: 'Start ronde {{round}}'
            },
            handoff: {
                step: 'Ronde {{round}} · {{number}} van {{total}}',
                title: 'Geef de telefoon aan {{name}}',
                jobOpen: '{{name}} leest voor aan de speler links',
                jobChoice: '{{name}} leest de vraag en de vier opties voor',
                jobClosest: '{{name}} leest de vraag voor en verzamelt de getallen',
                jobDescribe: '{{name}} omschrijft de woorden aan de speler links. Alleen {{name}} mag dit scherm zien.',
                jobList: '{{name}} leest de vraag voor en vinkt af wat de speler links noemt.',
                jobDoubleDown: '{{name}} vraagt de volgende speler: makkelijk of moeilijk? En leest dan de vraag voor.',
                jobFinale: '{{name}} leest voor aan de finalisten en speelt zelf niet mee.',
                ruleOpen: 'Goed? Dan is de volgende vraag ook voor jou. Fout? Dan mag de volgende. Elke vraag is een punt.',
                ruleChoice: 'Net als net: goed en de volgende is ook voor jou. Elke vraag is 2 punten.',
                ruleClosest: 'Iedereen behalve de quizmaster gokt één keer, geen twee dezelfde. Dichtstbij krijgt 2.',
                ruleDescribe: 'Dertig seconden, samen met de speler links van je. Elk geraden woord is een punt voor jullie allebei.',
                ruleList: 'Twintig seconden, alleen de speler links van je antwoordt. Wat er over is gaat daarna de tafel rond.',
                ruleDoubleDown: 'Makkelijk is 1 punt, moeilijk 3. Er zijn er vijf van elk, dus op is op. Fout? Dan gaat de vraag de tafel rond.',
                ruleFinale: 'Wie achter staat krijgt de vraag eerst. Fout? Dan mag de ander. Een ster per goed antwoord, de meeste sterren wint.',
                action: 'Toon de vraag'
            },
            standings: {
                label: 'Ronde {{round}} van {{total}} klaar',
                title: 'Ronde {{round}} klaar',
                description: 'De tussenstand.',
                startNext: 'Start ronde {{round}}',
                nextRoundWip: 'Ronde {{round}} bestaat nog niet. Jullie punten zijn bewaard.'
            },
            final: {
                title: 'De quiz is voorbij',
                description: 'De eindstand.',
                finalist: 'Finalist',
                winnerLabel: 'Winnaar',
                points: '{{score}} punten',
                stars: '{{stars}} ★',
                tally: '{{stars}} ★ · {{score}} punten',
                tieLabel: 'Gedeelde eerste plek',
                tieTitle: 'Gelijkspel!',
                tieDescription: 'Er is geen winnaar. Jullie delen de eerste plek.'
            }
        },
        errors: {
            lobbyFull: 'Deze lobby is vol. Maximaal acht telefoons.',
            alreadyStarted: 'Deze quiz is al begonnen. Vraag om een nieuwe code.',
            lobbyGone: 'Deze lobby bestaat niet meer. Check de code.',
            notHost: 'Alleen de host kan dat.',
            notAtThisTable: 'Je speelt niet mee in deze quiz.',
            notYourSeat: 'Je bent niet aan de beurt.',
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            quizGone: 'Deze quiz bestaat niet meer. Kies een andere.',
            badTable: 'Er klopt iets niet. Check de namen en probeer opnieuw.',
            tooFewPlayers: 'Je hebt minstens twee spelers nodig.',
            tooManyPlayers: 'Maximaal acht spelers.',
            duplicateName: 'Twee spelers hebben dezelfde naam.',
            quizTooSmall: 'Deze quiz heeft te weinig vragen voor zoveel spelers. Kies een andere, of speel met minder.',
            generic: 'De quiz kon niet starten. Probeer het opnieuw.',
            network: 'Geen verbinding. Check je internet.',
            staleTurn: 'De quiz is al verder. Hieronder zie je waar jullie zijn.',
            duplicateGuess: 'Twee spelers hebben hetzelfde getal. Vraag er een om een ander.',
            quizmasterCannotGuess: 'De quizmaster mag niet meegokken.',
            describerCannotGuess: 'Je kunt geen punt krijgen voor je eigen woord.',
            oneGuessEach: 'Iedereen behalve de rader krijgt één gok.',
            twoOnOne: 'Dit kan maar naar één speler.',
            verdictDisagrees: 'Dat klopt niet met het antwoord. Check welke optie is aangetikt.',
            noChoiceYet: 'Er is nog niet gekozen tussen makkelijk en moeilijk.'
        }
    },
    oneOfUs: {
        index: {
            description: 'Wie van jullie is de bedrieger?',
            oneDevice: {
                title: '1 telefoon',
                description: 'Geef de telefoon door.',
                action: 'Spelen'
            },
            multiDevice: {
                title: 'Per speler',
                description: 'Maak een lobby en nodig vrienden uit.',
                action: 'Lobby maken'
            }
        },
        singleDevice: {
            title: '1 telefoon',
            description: 'Vul de namen van alle spelers in en druk op start.',
            players: {
                tooFew: 'Je hebt minstens drie spelers nodig.',
                tooMany: 'Maximaal negen spelers.',
                duplicate: 'Twee spelers hebben dezelfde naam.'
            }
        },
        multiDevice: {
            lobby: {
                opening: 'Lobby openen…',
                noLobby: 'Geen lobby',
                hostStoppedGame: 'De host heeft het spel gestopt. Vraag om een nieuwe code.',
                hostClosedLobby: 'De host heeft de lobby gesloten. Vraag om een nieuwe code.',
                running: {
                    gameTitle: 'Je speelt al een spel',
                    lobbyTitle: 'Je hebt nog een lobby open',
                    gameMessage: 'Je speelt nog in lobby {{code}}. Ga verder, of stop en open een nieuwe lobby.',
                    lobbyMessage: 'Lobby {{code}} staat nog open. Ga terug, of sluit hem en open een nieuwe.',
                    resumeGame: 'Verder spelen',
                    resumeLobby: 'Naar open lobby',
                    stopGame: 'Spel stoppen',
                    closeLobby: 'Sluiten en nieuwe maken'
                },
                confirmClose: {
                    title: 'Lobby sluiten?',
                    message: 'De code werkt dan niet meer en iedereen in de lobby ligt eruit.',
                    action: 'Sluiten'
                },
                confirmLeave: {
                    title: 'Lobby verlaten?',
                    message: 'Je kunt later terugkomen met dezelfde code.',
                    action: 'Verlaten'
                },
                stay: 'Blijf hier',
                start: 'Start het spel',
                startNote: 'Na de start kan niemand meer joinen.',
                needPlayers: 'Je hebt minstens {{min}} spelers nodig.',
                hostFallback: 'De host',
                settingsTitle: 'Instellingen'
            },
            play: {
                loading: 'Rollen verdelen…',
                noGame: 'Geen spel',
                waiting: 'Wachten op de rest…',
                phase: {
                    deal: 'Ronde {{round}} · het woord',
                    answer: 'Ronde {{round}} · hint',
                    vote: 'Ronde {{round}} · stemmen',
                    reveal: 'Ronde {{round}} · uitslag',
                    waiting: 'Ronde {{round}}'
                },
                stillIn: '{{count}} over',
                progress: '{{done}} / {{total}}',
                out: {
                    title: 'Je ligt eruit',
                    message: 'Je bent eruit gestemd. Je kunt nog meekijken, maar niet meer antwoorden of stemmen.'
                },
                deal: {
                    title: 'Je briefje',
                    action: 'Onthouden'
                },
                answer: {
                    title: 'Schrijf je briefje',
                    about: 'Over: {{prompt}}',
                    aboutBlank: 'Je briefje is leeg',
                    field: 'Jouw briefje',
                    placeholder: 'Iets wat alleen past bij jouw woord',
                    counter: '{{typed}} / {{max}} · anoniem',
                    submit: 'Insturen',
                    hung: 'Ingestuurd · anoniem',
                    pinned: 'Al ingestuurd',
                    waitingMessage: 'Wachten op de rest. Het stemmen begint als iedereen klaar is.'
                },
                vote: {
                    title: 'Welk antwoord is sus?',
                    mine: 'JIJ',
                    tie: 'Gelijkspel?',
                    tieTail: 'beslist.',
                    confirm: 'Stem hierop',
                    waiting: 'Je hebt gestemd. Wachten op de rest.'
                },
                reveal: {
                    title: 'De uitslag',
                    votedOut: '{{name}} · eruit gestemd',
                    tieBroken: 'Gelijkspel, dus de burgemeester besliste.',
                    next: 'Ronde {{round}}',
                    toResult: 'Bekijk de uitslag'
                }
            },
            errors: {
                lobbyFull: 'Deze lobby is vol.',
                alreadyStarted: 'Dit spel is al begonnen.',
                notHost: 'Alleen de host kan dat.',
                notEnoughPlayers: 'Je hebt meer spelers nodig om te starten.',
                tooManyPlayers: 'Te veel spelers voor One of Us.',
                gameNotOver: 'Het spel is nog niet voorbij.',
                noContent: 'Er zijn nog geen woorden in deze taal.',
                lobbyGone: 'Deze lobby bestaat niet meer.',
                alreadyAnswered: 'Je hebt al geantwoord deze ronde.',
                alreadyVoted: 'Je hebt al gestemd deze ronde.',
                cannotVoteSelf: 'Je kunt niet op jezelf stemmen.',
                votedOut: 'Je bent eruit gestemd en kunt niet meer meedoen.',
                wrongRound: 'Die ronde is al voorbij.',
                wrongPhase: 'Dat kan nu niet.',
                badAnswer: 'Dat antwoord kan niet. Schrijf iets, maar hou het kort.',
                gameFinished: 'Dit spel is voorbij.'
            }
        },
        settings: {
            wordsOnly: {
                title: 'Alleen woorden',
                description: 'Alleen losse woorden, geen zinnen.'
            },
            roles: {
                title: 'Rollen',
                description: 'Welke rollen kunnen meedoen.',
                count: '{{enabled}} van {{total}}',
                locked: 'Er moet minstens één soort bedrieger aan staan.',
                imposter: {
                    description: 'Krijgt een ander woord en moet meepraten zonder op te vallen.'
                },
                nitwit: {
                    description: 'Krijgt helemaal geen woord.'
                }
            }
        },
        play: {
            loading: 'Woorden verdelen…',
            close: 'Spel verlaten',
            roundDiscuss: 'Ronde {{round}} · overleg',
            note: {
                label: 'Jouw woord',
                blurb: 'Laat dit aan niemand zien.',
                blurbBlank: 'Jij hebt geen woord. Luister goed naar de rest.',
                cover: 'Tik om je woord te zien',
                coverHint: 'Laat niemand meekijken.'
            },
            reveal: {
                step: 'Woord {{number}} van {{total}}',
                title: '{{name}} is aan de beurt',
                body: 'Pak de telefoon van {{from}} en laat niemand meekijken.',
                bodyFirst: 'Alleen {{name}} mag het volgende scherm zien.',
                note: 'Niemand mag meekijken.',
                action: 'Ik ben {{name}}',
                bandLabel: 'Woorden bekijken',
                yourWord: '{{name}}, dit is jouw woord',
                after: 'Hierna: {{names}}',
                secretLabel: 'Tik om je woord te zien',
                secretHint: 'Laat niemand meekijken.',
                warning: 'Alleen jij ziet dit',
                noWord: 'Geen woord',
                role: {
                    label: 'Jouw rol',
                    civilian: {
                        name: 'Burger',
                        explanation: 'Iedereen met jouw woord hoort bij jou. Vind wie het niet heeft.'
                    },
                    imposter: {
                        name: 'Imposter',
                        explanation: 'Jij hebt een ander woord dan de rest. Bluf mee en overleef.'
                    },
                    unknown: {
                        name: 'Burger of imposter',
                        explanation: 'Je weet niet wat je bent. Luister goed en kom erachter.'
                    },
                    nitwit: {
                        name: 'De onnozele',
                        explanation: 'Jij hebt geen woord. Luister goed naar de rest en praat mee.'
                    }
                },
                hide: 'Verbergen',
                remember: 'Onthouden · geef aan {{name}}',
                lastDone: 'Klaar, start ronde 1'
            },
            speak: {
                bandLabel: 'Ronde {{round}} · Beurten',
                title: 'Zeg iets over je woord',
                nowSpeaking: 'Nu aan de beurt',
                hint: 'Zeg één woord dat bij jouw woord past. Niet het woord zelf.',
                next: 'Volgende: {{name}}',
                lastNext: 'Iedereen is geweest'
            },
            discuss: {
                action: 'Stemmen'
            },
            vote: {
                bandLabel: 'Ronde {{round}} · Stemmen',
                inCount: '{{count}} in',
                title: 'Wie moet eruit?',
                subline: 'Wijs allemaal iemand aan waarvaan jij denkt dat het de imposter is. De burgermeester beslists bij een gelijkspel.',
                sublineMayor: ' Bij gelijkspel beslist burgemeester {{name}}.',
                mayor: 'Burgemeester',
                outTile: '{{name}} · eruit',
                sendAway: 'Stuur {{name}} weg',
                pickFirst: 'Kies eerst iemand'
            },
            elimination: {
                bandLabel: 'Ronde {{round}} · Uitslag',
                title: '{{name}} ligt eruit',
                sticker: 'ERUIT',
                was: '{{name}} was…',
                role: {
                    civilian: {
                        name: 'een burger',
                        why: '{{name}} had het echte woord. De imposter zit nog aan tafel.'
                    },
                    imposter: {
                        name: 'de imposter!',
                        why: '{{name}} had een ander woord. Raak!'
                    },
                    nitwit: {
                        name: 'de onnozele!',
                        why: '{{name}} had helemaal geen woord en bluft mee.'
                    }
                },
                civilian: '{{name}} was een burger',
                imposter: '{{name}} was een imposter',
                nitwit: '{{name}} was de onnozele',
                hit: 'raak',
                miss: 'mis',
                left: 'Nog {{count}} aan tafel',
                next: 'Ronde {{round}}'
            },
            briefing: {
                title: 'De rollen',
                intro: 'Iedereen krijgt een van deze rollen. Lees ze voor de start voor.',
                roleLabel: 'Rol',
                role: {
                    civilian: 'De meeste spelers zijn burgers. Ze hebben allemaal hetzelfde woord en zoeken wie dat niet heeft.',
                    imposter: 'Imposters hebben een ander woord en kennen het echte niet. Ze bluffen mee en winnen door te overleven.',
                    nitwit: 'De onnozele heeft geen woord en speelt mee met de imposters. Die weten niet wie het is.'
                },
                action: 'Woorden verdelen'
            },
            over: {
                label: 'Spel afgelopen',
                civilians: 'De burgers winnen',
                imposters: 'De imposters winnen',
                civiliansWhy: 'Alle imposters zijn eruit gestemd.',
                impostersWhy: 'De imposters zijn niet meer in de minderheid.',
                rolesTitle: 'Spelers',
                civiliansCamp: 'Burgers',
                impostersCamp: 'Tegen de burgers',
                imposterWordLabel: 'Imposters',
                role: {
                    imposter: 'Imposter',
                    nitwit: 'Onnozele'
                },
                winner: 'Winnaar',
                again: 'Opnieuw spelen'
            }
        },
        errors: {
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            gameGone: 'Dit spel bestaat niet meer.',
            badTable: 'Er klopt iets niet. Check de namen en probeer opnieuw.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding. Check je internet.',
            offlineUnavailable: 'Geen verbinding, en er zijn geen woorden opgeslagen voor deze taal. Speel één keer online, daarna werkt het ook offline.'
        }
    },
    fakeFiller: {
        index: {
            description: 'Verzin een nep-antwoord dat echt klinkt. De rest raadt welke waar is.',
            facts: {
                title: 'Feitje',
                description: 'Vul de ontbrekende woorden in.',
                action: 'Lobby openen'
            },
            definitions: {
                title: 'Woord',
                description: 'Verzin een betekenis voor een woord.',
                action: 'Lobby openen'
            }
        },
        lobby: {
            loading: 'Lobby zoeken…',
            opening: 'Lobby openen…',
            noLobby: 'Geen lobby',
            hostStoppedGame: 'De host heeft het spel gestopt. Vraag om een nieuwe code.',
            hostClosedLobby: 'De host heeft de lobby gesloten. Vraag om een nieuwe code.',
            running: {
                gameTitle: 'Je speelt al een spel',
                lobbyTitle: 'Je hebt nog een lobby open',
                gameMessage: 'Je speelt nog in lobby {{code}}. Ga verder, of stop en open een nieuwe lobby.',
                lobbyMessage: 'Lobby {{code}} staat nog open. Ga terug, of sluit hem en open een nieuwe.',
                resumeGame: 'Verder spelen',
                resumeLobby: 'Naar open lobby',
                stopGame: 'Spel stoppen',
                closeLobby: 'Sluiten en nieuwe maken'
            },
            confirmClose: {
                title: 'Lobby sluiten?',
                message: 'De code werkt dan niet meer en iedereen in de lobby ligt eruit.',
                action: 'Sluiten'
            },
            confirmLeave: {
                title: 'Lobby verlaten?',
                message: 'Je kunt later terugkomen met dezelfde code.',
                action: 'Verlaten'
            },
            stay: 'Blijf hier',
            start: 'Start het spel',
            startNote: 'Na de start kan niemand meer joinen.',
            needPlayers: 'Je hebt minstens {{min}} spelers nodig.',
            hostFallback: 'De host',
            settingsTitle: 'Instellingen',
            mode: 'Vragen',
            modeFacts: 'Echte feiten',
            modeDefinitions: 'Woordbetekenissen',
            modeFactsHint: 'Het echte antwoord zit tussen de verzinsels. Vind het en je scoort.',
            modeDefinitionsHint: 'Een zeldzaam woord. De echte betekenis zit tussen de verzinsels. Vind hem en je scoort.',
            answersPerPlayer: 'Vragen per speler',
            answersPerPlayerHint: 'Hoeveel vragen iedereen invult. Meer vragen, langer spel.',
            answersSummary: '{{amount}} vragen p.p.'
        },
        play: {
            loading: 'Vragen verdelen…',
            noGame: 'Geen spel',
            band: {
                round: 'Ronde',
                prompt: 'Vraag'
            },
            writing: {
                title: 'Vul de gaten in',
                intro: 'Verzin iets wat niet klopt, maar wel echt klinkt.',
                promptOf: 'Vraag {{index}} van {{total}}',
                blank: 'Gat {{index}}',
                blankPlaceholder: 'Jouw antwoord',
                definitionPlaceholder: 'Wat het betekent',
                submit: 'Vastzetten',
                locked: 'Vastgezet',
                edit: 'Aanpassen',
                incomplete: 'Vul eerst alle gaten in.',
                titleDefinitions: 'Wat betekent het?',
                introDefinitions: 'Verzin een geloofwaardige betekenis. Elke keer dat iemand hem kiest, scoor je.',
                waitingTitle: 'Wachten op de rest',
                waitingMessage: 'Je antwoorden zijn binnen. Het stemmen begint als iedereen klaar is.',
                progress: '{{done}} van {{total}} antwoorden binnen'
            },
            voting: {
                title: 'Welke is echt?',
                hint: 'Tik op het antwoord dat volgens jou klopt.',
                tapToPick: 'Tik om te kiezen',
                yourPick: 'Jouw keuze',
                option: 'Optie {{letter}}',
                or: 'of',
                roundOf: 'Ronde {{round}} van {{total}}',
                pick: 'Kies deze',
                confirm: 'Stem vastzetten',
                voted: 'Gestemd',
                yoursTitle: 'Even wachten',
                yoursMessage: 'Hopelijk trapt iemand in jouw antwoord! Dan scoor je.',
                progress: '{{done}} van {{total}} stemmen binnen',
                waiting: 'Wachten op de rest…'
            },
            reveal: {
                title: 'De uitslag',
                noScore: 'Geen punten deze ronde.',
                stamp: {
                    real: 'Echt',
                    more: '{{name}} +{{count}}'
                },
                voters: {
                    chose: 'Gekozen door',
                    none: 'Niemand'
                },
                next: 'Volgende ronde',
                toResults: 'Naar de eindstand',
                waitingForHost: 'Wachten op de host…',
                waitingForResults: 'Wachten op de host…'
            }
        },
        results: {
            loading: 'Uitslag laden…'
        },
        errors: {
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            gameGone: 'Dit spel bestaat niet meer.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding. Check je internet.',
            lobbyFull: 'Deze lobby is vol.',
            lobbyGone: 'Deze lobby bestaat niet meer. Check de code.',
            alreadyStarted: 'Dit spel is al begonnen.',
            notEnoughPlayers: 'Je hebt meer spelers nodig om te starten.',
            tooManyPlayers: 'Te veel spelers voor één spel.',
            noContent: 'Te weinig vragen in deze taal. Probeer de andere.',
            notYourPrompt: 'Deze vraag is niet voor jou.',
            alreadyAnswered: 'Die heb je al ingevuld.',
            alreadyVoted: 'Je hebt al gestemd deze ronde.',
            cannotVoteOwnPrompt: 'Je kunt niet stemmen op je eigen vraag.',
            wrongRound: 'Deze ronde is al voorbij.',
            wrongPhase: 'Dat kan nu nog niet.',
            badAnswer: 'Vul alle gaten in voordat je vastzet.',
            answerIsTruth: 'Ssst… dat is het echte antwoord! Verzin iets anders.',
            gameFinished: 'Dit spel is afgelopen.'
        }
    },
    wittyWars: {
        index: {
            description: 'Twee spelers, één vraag. De rest stemt op het grappigste antwoord.',
            multiDevice: {
                title: 'Per speler',
                description: 'Iedereen schrijft en stemt op een eigen telefoon.',
                action: 'Lobby openen'
            },
            hostScreen: {
                title: 'Hostscherm',
                description: 'De duels op de tv, schrijven op je telefoon.',
                action: 'Lobby openen'
            }
        },
        modes: {
            family: {
                title: 'Familie',
                description: 'Gekke vragen voor iedereen, ook voor oma.'
            },
            rude: {
                title: 'Grof',
                description: 'Brute vragen.'
            },
            caliente: {
                title: 'Caliente',
                description: 'Pittig en ondeugend. Not safe for work.'
            }
        },
        lobby: {
            loading: 'Lobby zoeken…',
            opening: 'Lobby openen…',
            noLobby: 'Geen lobby',
            hostStoppedGame: 'De host heeft het spel gestopt. Vraag om een nieuwe code.',
            hostClosedLobby: 'De host heeft de lobby gesloten. Vraag om een nieuwe code.',
            running: {
                gameTitle: 'Je speelt al een spel',
                lobbyTitle: 'Je hebt nog een lobby open',
                gameMessage: 'Je speelt nog in lobby {{code}}. Ga verder, of stop en open een nieuwe lobby.',
                lobbyMessage: 'Lobby {{code}} staat nog open. Ga terug, of sluit hem en open een nieuwe.',
                resumeGame: 'Verder spelen',
                resumeLobby: 'Naar open lobby',
                stopGame: 'Spel stoppen',
                closeLobby: 'Sluiten en nieuwe maken'
            },
            confirmClose: {
                title: 'Lobby sluiten?',
                message: 'De code werkt dan niet meer en iedereen in de lobby ligt eruit.',
                action: 'Sluiten'
            },
            confirmLeave: {
                title: 'Lobby verlaten?',
                message: 'Je kunt later terugkomen met dezelfde code.',
                action: 'Verlaten'
            },
            stay: 'Blijf hier',
            start: 'Start het spel',
            startNote: 'Na de start kan niemand meer joinen.',
            needPlayers: 'Je hebt minstens {{min}} spelers nodig.',
            hostFallback: 'De host',
            settingsTitle: 'Instellingen',
            mode: 'Vragen',
            answersPerPlayer: 'Antwoorden per speler',
            answersPerPlayerHint: 'Hoeveel vragen iedereen beantwoordt. Meer antwoorden, langer spel.'
        },
        play: {
            loading: 'Vragen verdelen…',
            noGame: 'Geen spel',
            band: {
                round: 'Duel',
                prompt: 'Vraag'
            },
            writing: {
                title: 'Wees grappig',
                intro: 'Verzin het grappigste antwoord.',
                promptOf: 'Vraag {{index}} van {{total}}',
                placeholder: 'Je grappigste antwoord',
                answerLabel: 'Je antwoord',
                empty: 'Schrijf eerst iets op.',
                next: 'Volgende vraag',
                previous: 'Vorige vraag',
                submit: 'Insturen',
                waitingTitle: 'Wachten op de rest',
                waitingMessage: 'Je antwoorden zijn binnen. De duels beginnen als iedereen klaar is.',
                progress: '{{done}} van {{total}} antwoorden binnen'
            },
            voting: {
                title: 'Welke is grappiger?',
                hint: 'Tik op het antwoord waar je het hardst om lachte.',
                tapToPick: 'Tik om te kiezen',
                yourPick: 'Jouw keuze',
                option: 'Antwoord {{letter}}',
                or: 'vs',
                roundOf: 'Duel {{round}} van {{total}}',
                confirm: 'Stem vastzetten',
                voted: 'Gestemd',
                yoursTitle: 'Dit is jouw duel',
                yoursMessage: 'Je schreef een van deze antwoorden, dus je stemt niet mee. Duimen maar!',
                progress: '{{done}} van {{total}} stemmen binnen',
                waiting: 'Wachten op de rest…'
            },
            reveal: {
                title: 'En de winnaar is…',
                stampMore: '{{name}} +{{count}}',
                points: '+{{points}}',
                sweep: 'Alle stemmen!',
                noVoters: 'Niemand',
                next: 'Volgend duel',
                toResults: 'Naar de eindstand',
                waitingForHost: 'Wachten op de host…',
                waitingForResults: 'Wachten op de host…'
            }
        },
        results: {
            loading: 'Uitslag laden…'
        },
        errors: {
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            gameGone: 'Dit spel bestaat niet meer.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding. Check je internet en probeer opnieuw.',
            lobbyFull: 'Deze lobby is vol.',
            lobbyGone: 'Deze lobby bestaat niet meer. Check de code.',
            alreadyStarted: 'Dit spel is al begonnen.',
            notEnoughPlayers: 'Je hebt meer spelers nodig om te starten.',
            tooManyPlayers: 'Te veel spelers voor één spel.',
            noContent: 'Te weinig vragen in deze taal. Probeer de andere.',
            incompleteAnswers: 'Beantwoord eerst alle vragen.',
            answerTooLong: 'Een van je antwoorden is te lang.',
            badAnswer: 'Een antwoord mag niet leeg zijn.',
            alreadyAnswered: 'Je hebt je antwoorden al ingestuurd.',
            alreadyVoted: 'Je hebt al gestemd op dit duel.',
            cannotVoteOwnPrompt: 'Je kunt niet stemmen op je eigen duel.',
            wrongRound: 'Dit duel is al voorbij.',
            wrongPhase: 'Dat kan nu nog niet.',
            gameFinished: 'Dit spel is afgelopen.'
        }
    },
    friends: {
        title: 'Vrienden',
        description: 'Want alleen is maar saai.',
        how: {
            title: 'Vrienden toevoegen',
            message: 'Iedereen met wie je een keer speelt, wordt vanzelf je vriend.'
        },
        listLabel: 'Jouw vrienden',
        since: 'Sinds {{date}}',
        empty: {
            title: 'Nog niemand',
            message: 'Start een spel en deel de code, of join iemand anders. Iedereen uit je lobby komt hier te staan.'
        },
        errors: {
            signedOut: 'Je sessie is verlopen. Log opnieuw in.',
            generic: 'Je vrienden konden niet worden geladen.',
            network: 'Geen verbinding. Check je internet en probeer opnieuw.'
        }
    },
    invite: {
        title: 'Nodig een vriend uit',
        message: 'Ze krijgen een melding in de app of op hun telefoon.',
        send: 'Uitnodigen',
        sent: 'Uitgenodigd',
        failed: 'Niet verstuurd',
        alreadyHere: 'In de lobby',
        noFriends: 'Je hebt nog met niemand gespeeld. Deel de code, iedereen die meedoet wordt je vriend.',
        loadFailed: 'Je vrienden konden niet worden geladen.'
    },
    notifications: {
        inviteEyebrow: 'Uitnodiging',
        inviteHeadline: '{{name}} wil met je spelen',
        inviteRoom: '{{game}} · lobby van {{name}}',
        inviteTournament: '{{game}} · toernooi van {{name}}',
        inviteGeneric: '{{name}} nodigt je uit voor een spel',
        join: 'Join',
        ignore: 'Negeren'
    }
};
