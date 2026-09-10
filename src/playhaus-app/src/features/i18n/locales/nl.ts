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
        // De twee woorden waarmee een `Toggle` zichzelf stempelt.
        on: 'AAN',
        off: 'UIT',
        loading: 'Even geduld…',
        language: 'Taal',
        selectValue: '{{label}}: {{value}}',
        nothingSelected: 'niets gekozen',
        change: 'verander',
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
            players: "Spelers",
            add: "Toevoegen",
            remove: "Verwijder",
            namePlaceholder: "Naam",
            seated: "{{players}} spelers"
        }
    },
    nav: {
        games: 'Spellen',
        reconnect: 'Reconnect',
        friends: 'Vrienden',
        profile: 'Profiel'
    },
    chrome: {
        toDarkMode: 'Schakel over naar donkere modus',
        toLightMode: 'Schakel over naar lichte modus',
        muteMusic: 'Zet de muziek uit',
        unmuteMusic: 'Zet de muziek aan',
        signedInAs: 'Ingelogd als {{name}}. Ga naar je profiel.'
    },
    home: {
        headline: {
            title: 'Kleine spelletjes,',
            accent: 'groot plezier.'
        },
        subtitle: 'Partygames voor jou en je vrienden. Kies er eentje en spelen maar!',
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
        bottomTeaser: "Meer spellen in de maak...",
    },
    games: {
        device: {
            perPlayer: '1 per speler',
            oneDevice: '1 totaal',
            perPlayerOrOneDevice: 'keuze'
        },
        leagueOfLetters: {
            description: 'Test je woordenschat. Solo, of tegen je vrienden.',
            mainCategory: 'Woord raden',
        },
        quizzer: {
            description: 'Stel je algemene kennis op de proef.',
            mainCategory: 'Trivia',
        },
        oneOfUs: {
            description: 'Ontraadsel wie de bedrieger is.',
            mainCategory: 'Bluf',
        },
        fakeFiller: {
            description: 'Verzin een fout antwoord.',
            mainCategory: 'Misleiding',
        },
        sketchOff: {
            description: 'Wie kan het beste tekenen?',
            mainCategory: 'Creatief',
        },        
        newBadge: 'Nieuw',
        wipBadge: 'In de maak'
    },
    // De joinkaart, die van geen enkel spel in het bijzonder is.
    join: {
        label: 'JOIN EEN GAME',
        // Dezelfde kaart, op een breed scherm in tweeën.
        labelWide: 'TYP DE CODE',
        paste: 'Plakken',
        pasteLabel: 'Code plakken',
        codeLabel: 'Joincode',
        // Het chipje naast de vakjes, zodra het eerste teken erin staat.
        gameHint: 'Je joint {{game}}',
        // Een complete code die niets opent.
        rejected: 'Dit is geen code die we kunnen openen. Check hem en probeer opnieuw.',
        scanRowTitle: 'Of scan zijn scherm',
        scanRowHint: 'Je zit er meteen in',
        scanAction: 'Scan liever',
        scanCopy: 'Richt je telefoon op de code van de host',
        scanTitle: 'Scannen om te joinen',
        scanLabel: 'Scan een QR-code om een game te joinen',
        scanCancel: 'Annuleren',
        permissionAsk: 'De camera is nodig om de code van de host te lezen. Er wordt niets opgenomen of verstuurd.',
        permissionGrant: 'Camera toestaan',
        // Hier geen knop onder: dit antwoord verander je in de instellingen.
        permissionDenied: 'De camera is geblokkeerd voor deze app. Sta hem toe in je instellingen, of typ de code gewoon in.'
    },
    languages: {
        nl: { description: 'Spellen in het Nederlands' },
        en: { description: 'Games in english' }
    },
    auth: {
        login: {
            title: 'Inloggen',
            email: 'E-mail',
            emailPlaceholder: 'jij@voorbeeld.nl',
            password: 'Wachtwoord',
            passwordPlaceholder: 'Je wachtwoord',
            submit: 'Inloggen',
            submitting: 'Bezig met inloggen…',
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
            submitting: 'Bezig met aanmaken…',
            nameNote: 'Dit is de naam die medespelers in een lobby zien. Je kunt hem later aanpassen in je profiel.',
            invalidEmail: 'Dit lijkt geen e-mailadres te zijn.'
        },
        guestLanguage: {
            title: 'Welkom bij Playhaus',
            description: 'Kies de taal waarin je wilt spelen.',
            note: 'Als je een taal kiest wordt je aangemeld met een gastaccount. Je kan dit account later gratis upgraden naar een normaal account.',
            login: 'Heb je al een account? Log in'
        },
        errors: {
            invalidCredentials: 'Dit e-mailadres en wachtwoord horen niet bij een account.',
            emailInUse: 'Dit e-mailadres is al in gebruik.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je verbinding en probeer het opnieuw.'
        }
    },
    profile: {
        loading: 'Profiel laden…',
        card: { action: 'Mijn profiel', caption: 'Dit ben jij, knapperd!' },
        name: {
            label: 'Speelnaam',
            placeholder: 'Jouw naam',
            random: 'Willekeurige naam',
            note: 'Min {{min}}, max {{max}} tekens. Dit is wat medespelers in een lobby zien.'
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
            music: { title: 'Muziek', description: 'Achtergrondmuziek in de lobby en tijdens het spelen.' },
            vibration: { title: 'Trillen', description: 'Korte haptic feedback op mobiel.' }
        },
        guest: {
            title: 'Gastaccount',
            message: 'Je speelt als gast. Dit account is tijdelijk: statistieken en progressiegaan verloren wanneer ik ga opruimen. Voeg een e-mailadres en wachtwoord toe om een echt account te maken.',
            action: 'Upgrade (gratis)'
        },
        upgrade: {
            title: 'Houd je account',
            description: 'Voeg een e-mailadres en een wachtwoord toe en dit account wordt definitief. Je naam, kleur en games blijven precies zoals ze zijn.',
            email: 'E-mail',
            emailPlaceholder: 'jij@voorbeeld.nl',
            password: 'Wachtwoord',
            passwordPlaceholder: 'Kies een wachtwoord',
            submit: 'Maak het definitief',
            submitting: 'Bezig met opslaan…',
            note: 'Vanaf dan log je op elk apparaat in met dit e-mailadres en wachtwoord.',
            invalidEmail: 'Dit lijkt geen e-mailadres te zijn.',
            shortPassword: 'Je wachtwoord heeft minstens 8 tekens nodig.'
        },
        logout: 'Uitloggen',
        errors: {
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je verbinding en probeer het opnieuw.'
        }
    },
    reconnect: {
        hero: {
            title: 'Een spel joinen', accent: 'met een code',
            resume: { title: 'Ga verder', accent: 'waar je gebleven was' }
        },
        loading: 'Spellen zoeken…',
        stillRunning: 'Nog bezig',
        orJoin: 'Of join een spel',
        nothingRunning: 'Niets bezig',
        updated: 'Bijgewerkt {{time}}',
        resume: 'Verder spelen met {{game}}',
        refresh: { label: 'Opnieuw naar spellen kijken', action: 'Opnieuw kijken' },
        empty: {
            title: 'Geen spellen meer bezig',
            message: 'Alles wat je halverwege laat liggen staat hier weer klaar om verder te spelen.'
        },
        mode: { solo: 'Solo', lobby: 'Lobby', oneDevice: '1 telefoon' },
        errors: {
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            generic: 'Er ging iets mis bij het ophalen van je spellen. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je verbinding en probeer het opnieuw.'
        }
    },
    lobby: {
        yourRoom: 'Jouw kamer',
        named: 'Lobby {{code}}',
        live: 'Live',
        offline: 'Offline',
        disconnected: 'Verbinding met de lobby kwijt',
        close: 'Lobby sluiten',
        leave: 'Lobby verlaten',
        joinCode: 'Toegangscode',
        code: 'Lobbycode',
        codeSpoken: 'Lobbycode: {{characters}}',
        copyCode: 'Lobbycode {{characters}} kopiëren',
        copied: 'Gekopieerd',
        shareTitle: 'Kom in mijn lobby',
        shareLink: 'Deel de link',
        shareLinkLabel: 'Deel de link naar deze lobby',
        linkCopied: 'Link gekopieerd',
        shareFailed: 'Delen lukte niet',
        qrLabel: 'Toon een QR-code om deze lobby te joinen',
        qrTitle: 'Scannen om te joinen',
        qrCopy: 'Houd er een andere telefoon voor en die komt meteen in de lobby.',
        players: 'Spelers',
        playerCount: '{{taken}} van {{max}}',
        minPlayers: 'Min. {{min}}',
        inLobby: 'In de lobby',
        hostYou: 'HOST · JIJ',
        hostTag: 'HOST',
        ready: 'Klaar',
        away: 'Weg',
        freeSeat: 'Vrije plek',
        moreSeatsOne: '+ nog 1 vrije plek',
        moreSeatsMany: '+ nog {{seats}} vrije plekken',
        waiting: 'Wachten…',
        waitingForHost: 'Wachten op de host',
        waitingForHostMessage: '{{name}} zet het spel klaar. Blijf op dit scherm, het start hier meteen mee.',
        waitingLabel: 'Wachten',
        closedTitle: 'Lobby gesloten',
        inviteFriend: 'Nodig een vriend uit'
    },
    lol: {
        index: {
            description: 'Test je woordenschat en probeer het geheime woord te raden.',
            playingAs: 'Jij bent {{name}}',
            solo: {
                title: 'Solo',
                description: 'Speel alleen, lekker rustig.',
                action: 'Instellen',
                best: 'Best {{score}}'
            },
            multiplayer: { title: 'Multiplayer', description: 'Maak een lobby.', action: 'Openen' },
            wordOfTheDay: {
                title: 'Woord van de dag',
                resetIn: 'Nog {{time}} tot het nieuwe woord'
            },
            tournament: {
                badge: 'Nieuw',
                title: 'Toernooi',
                description: '4 tot 12 spelers, 1v1 potjes (1v1v1 bij oneven), vier rondes per potje. Twee keer verliezen en je ligt eruit.',
                action: 'Toernooi opzetten'
            }
        },
        settings: {
            loading: 'Spel zoeken…',
            title: 'Solo opzetten',
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
                    description: 'Een potje zonder tijd en score. Geen druk!'
                },
                competitive: {
                    label: 'Competitief',
                    description: 'Los alle drie de woorden zo snel mogelijk op met zo min mogelijk pogingen. Hoe sneller en korter, hoe hoger je score.'
                }
            },
            hardMode: {
                label: 'Moeilijke modus',
                description: 'Het woord kan elk bestaand woord in de taal zijn. Zet dit uit om met een makkelijkere woordenlijst te spelen.'
            },
            facts: '{{rounds}} rondes · {{guesses}} pogingen per ronde · eerste letter gegeven',
            competitiveFacts: '{{rounds}} rondes · {{guesses}} pogingen per ronde · tijdbonus tot {{minutes}} minuten',
            start: 'Starten',
            running: {
                title: 'Je speelt al een spel',
                message: 'Er staat nog een solospel open. Ga verder waar je gebleven was, of gooi het weg en stel een nieuw spel in.',
                resume: 'Verder spelen',
                discard: 'Weggooien'
            }
        },
        game: {
            loading: 'Spel laden…',
            loadFailed: 'Dit spel kon niet worden geladen.',
            guessUnsupported: 'Raden kan zodra de server dit ondersteunt.',
            alreadyGuessedYou: 'Die had je al.',
            alreadyGuessed: 'Die is al geprobeerd.',
            mustStartWith: 'Het woord begint met de {{letter}}.',
            resultLabel: 'Uitslag',
            viewResult: 'Bekijk de uitslag',
            nextRound: 'Volgende ronde',
            guesses: '{{guesses}}/{{max}}',
            roundOf: 'Ronde {{round}} van {{total}}',
            hint: 'Hint',
            hintLabel: 'Hint: het woord begint met de {{letter}}',
            dailyLabel: 'Woord van de dag',
            solved: 'CORRECT',
            lost: 'HELAAS',
            theWord: 'Het woord',
            attempts: 'Pogingen',
            guess: 'GO',
            clear: 'Wissen',
            timeLeft: 'Resterende tijd',
            /** Het woordlengte-label in de bovenste rij van de ronde. */
            wordLengthLabel: '{{letters}} letters',
            scoreLabel: '{{name}}, {{score}} punten',
            /** Voorleestekst voor de scorechip in de bovenste rij, die geen naam toont. */
            scoreCompactLabel: '{{score}} punten',
            playTimeLabel: 'Speeltijd: {{time}}',
            yourTurnNotice: 'JOUW BEURT!'
        },
        results: {
            loading: 'Uitslag laden…',
            loadFailed: 'De uitslag kon niet worden geladen.',
            title: 'Spel afgelopen',
            summary: 'Rondes: {{rounds}} · Letters: {{length}}',
            baseScore: 'Pogingen',
            timeBonus: 'Tijdbonus',
            total: 'Totaal',
            newHighScore: 'Nieuw persoonlijk record op {{letters}} letters!',
            again: 'Nog een keer'
        },
        lobby: {
            loading: 'Lobby zoeken…',
            opening: 'Lobby openen…',
            noGame: 'Geen spel',
            noLobby: 'Geen lobby',
            hostStoppedGame: 'De host heeft het spel gestopt. Vraag om een nieuwe code voor een volgend potje.',
            hostClosedLobby: 'De host heeft de lobby gesloten. Vraag om een nieuwe code.',
            running: {
                gameTitle: 'Je speelt al een spel',
                lobbyTitle: 'Je hebt nog een lobby open',
                gameMessage: 'Je bent nog bezig met een multiplayerspel in lobby {{code}}. Ga verder, of stop het spel en open een nieuwe lobby.',
                lobbyMessage: 'Lobby {{code}} staat nog open op jouw naam. Ga terug naar die lobby, of sluit hem en open een nieuwe.',
                resumeGame: 'Verder spelen',
                resumeLobby: 'Ga naar open lobby',
                stopGame: 'Spel stoppen',
                closeLobby: 'Stop huidige en maak nieuwe'
            },
            confirmClose: {
                title: 'Lobby sluiten?',
                message: 'De lobby wordt verwijderd en de code werkt niet meer. Iedereen die al binnen is, vliegt eruit.',
                action: 'Sluiten'
            },
            confirmLeave: {
                title: 'Lobby verlaten?',
                message: 'Je gaat terug naar het spelmenu. Je kunt later opnieuw joinen met dezelfde code.',
                action: 'Verlaten'
            },
            stay: 'Blijf hier',
            start: 'Start het spel',
            startNote: 'Zodra je start kan er niemand meer bij.',
            needPlayers: 'Je hebt minstens één medespeler nodig.',
            hostFallback: 'De host',
            settingsTitle: 'Spelinstellingen',
            timePerTurn: 'Tijd per beurt',
            timePerTurnOption: '{{seconds}} seconden',
            results: {
                title: 'Spel afgelopen',
                tie: 'Gelijkspel op {{score}} punten.',
                youWin: 'Jij wint met {{score}} punten.',
                playerWins: '{{name}} wint met {{score}} punten.',
                againSamePlayers: 'Nog een keer, zelfde spelers',
                autoJoin: 'Iedereen die nog op dit scherm zit, gaat automatisch mee naar de nieuwe lobby.',
                anotherRound: 'Nog een potje?',
                hostCanOpen: 'Het spel zit erop. De host kan een nieuwe lobby openen. Blijf hier, dan word je er vanzelf in meegenomen.'
            }
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
            nextWord: 'Nog {{time}} tot een nieuw woord',
            bestAndNext: 'Je beste is {{guesses}} · nog {{time}} tot een nieuw woord',
            solvedInOne: 'Opgelost in {{guesses}} poging',
            solvedInMany: 'Opgelost in {{guesses}} pogingen',
            notSolved: 'Vandaag niet gehaald. Het woord was {{word}}.'
        },
        tournament: {
            loading: 'Even het toernooi ophalen…',
            noBracket: 'Geen toernooi',
            yourTournament: 'Jouw toernooi',
            start: 'Maak het schema',
            startNote: 'Zodra je start kan er niemand meer bij.',
            needPlayers: 'Een toernooi heeft minstens vier spelers nodig.',
            confirmLeave: {
                title: 'Toernooi verlaten?',
                message: 'Je potjes lopen zonder jou door en je kunt ze op de klok verliezen. Met dezelfde code kom je terug.',
                action: 'Verlaten'
            },
            // De balk bovenaan het schema.
            title: 'Toernooi · {{players}} spelers',
            schedule: 'Schema',
            nextRoundReady: 'Ronde {{stage}} kan starten',
            matchesLeft: '{{done}} van {{total}} potjes klaar · {{left}} nog onbeslist',
            winners: 'Winnaars {{players}}',
            losers: 'Verliezers {{players}}',
            final: 'Finale',
            stageOne: 'Ronde {{stage}} · 1 potje',
            stageMany: 'Ronde {{stage}} · {{matches}} potjes',
            nothingHere: 'Hier nog niets',
            // Eén potje in een kolom.
            playing: 'Bezig',
            bye: 'Vrije doorgang naar de volgende ronde',
            you: 'Jij',
            knockedOut: {
                title: 'Uitgeschakeld',
                message: 'Je bent {{place}}e geworden. Blijf kijken hoe de rest van het schema afloopt.'
            },
            // De poort tussen de ene ronde en de volgende.
            waitingOnOne: 'Wachten op 1 potje',
            waitingOnMany: 'Wachten op {{matches}} potjes',
            readyWaiting: 'Wachten op de anderen',
            ready: 'Ik ben er klaar voor',
            readyCount: '{{ready}} van de {{total}} staan klaar · start zodra iedereen er is',
            readyGate: 'Ready wordt actief als alle {{matches}} potjes klaar zijn',
            backToBracket: 'Terug naar het schema',
            champion: {
                title: 'Kampioen',
                you: 'Je hebt het toernooi gewonnen.',
                player: '{{name}} wint het toernooi.'
            },
            lossOne: '1 verlies',
            lossMany: '{{losses}} verliezen'
        },
        errors: {
            staleServer: 'De server draait een oudere versie van dit spel. Herstart de API en probeer het opnieuw.',
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            gameGone: 'Dit spel bestaat niet meer.',
            badSettings: 'Deze instellingen kloppen niet. Kies een andere woordlengte.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je verbinding en probeer het opnieuw.',
            invalidWord: 'Ongeldig woord.',
            roundClosed: 'Deze ronde neemt geen gokken meer aan.',
            lobbyFull: 'Deze lobby zit vol.',
            lobbyGone: 'Deze lobby bestaat niet (meer). Check de code.',
            alreadyStarted: 'Dit spel is al begonnen.',
            alreadyPlayedToday: 'Je hebt vandaag al gespeeld. Kom morgen terug.',
            notEnoughForTournament: 'Een toernooi heeft vier tot twaalf spelers nodig.',
            stageNotOver: 'Deze ronde is nog niet klaar.',
            tournamentOver: 'Dit toernooi is al afgelopen.'
        }
    },
    pubquizr: {
        index: {
            description: 'Een klassiek potje trivia in een speels jasje.',
            oneDevice: { title: '1 telefoon', description: 'Geef de telefoon door.', action: 'Instellen' },
            multiDevice: { title: 'Multi-device', description: 'Één scherm voor de tafel, ieder een telefoon.', action: 'Kamer openen' },
            openTable: 'Scherm voor de tafel openen',
            weekly: {
                weekday: 'WOE',
                promise: 'ELKE WEEK EEN\nNIEUWE QUIZ'
            },
            newQuiz: {
                badge: 'Nieuw deze week',
                play: 'Speel deze'
            },
            list: {
                label: 'Alle quizzen',
                tabs: { weekly: 'Wekelijks', official: 'Officieel', community: 'Community' },
                playedFilter: {
                    all: 'Alles {{n}}',
                    unplayed: 'Nieuw {{n}}',
                    played: 'Gespeeld {{n}}'
                },
                published: '{{day}} {{month}} {{year}}',
                played: 'Gespeeld',
                loadOlder: 'Ouder laden',
                seeAll: 'Bekijk alle quizzen',
                browse: 'Blader door alle quizzen',
                empty: 'Hier staat nog niks. Probeer een ander tabblad.',
                filterEmpty: 'Hier staat nog niks op dit tabblad.',
                failed: 'De quizzen konden niet geladen worden. Check je verbinding.',
                comingSoon: 'Coming soon...',
                search: 'Zoek een quiz…',
                searchLabel: 'Zoek in de quizzen op deze lijst',
                total: '{{quizzes}} in totaal',
                matches: '{{quizzes}} gevonden',
                noMatches: 'Hier staat niks dat daarop lijkt.',
                noMatchesMore: 'Nog niks gevonden — oudere quizzen komen per pagina binnen. Laad er meer en kijk nog eens.',
                sortNewest: 'Nieuwste',
                sortAlpha: 'A–Z'
            }
        },
        oneDevice: {
            title: '1 telefoon',
            description: 'Eén telefoon om het spel te spelen. De telefoon wordt doorgegeven.',
            order: {
                title: 'Op volgorde',
                message: 'Vul de namen in de volgorde waarin je zit, van links naar rechts. De rol van quizmaster schuift namelijk door.'
            },
            players: {
                label: 'Wie doen er mee',
                seat: 'Speler {{seat}}',
                tooFew: 'Een quiz heeft minstens twee spelers nodig.',
                tooMany: 'Acht spelers is het maximum rond één telefoon.',
                duplicate: 'Twee spelers kunnen niet dezelfde naam hebben.',
            },
            quiz: {
                selected: 'Jullie spelen',
                pick: 'Kies een quiz',
                pickAnother: 'Of kies een andere quiz'
            },
            steps: {
                quizTitle: 'Welke quiz',
                settingsTitle: 'Hoe jullie spelen',
                table: 'Aan tafel',
            },
            zenMode: {
                label: 'Zen-modus',
                description: 'Geen tijdsdruk. Rondes met een timer worden vervangen of anders gespeeld.',
                caption: 'Zen · geen timers'
            },
            triviaMode: {
                label: 'Alleen trivia',
                description: 'Alleen vragen en antwoorden. De omschrijfronde en de ronde met vier antwoorden vallen weg.',
                caption: 'Alleen trivia · 4 rondes'
            },
            start: 'Start de quiz',
            loading: 'Kijken of er nog een quiz openstaat…',
            running: {
                title: 'Er staat nog een quiz open',
                message: 'Je hebt al een quiz lopen. Ga verder waar de tafel gebleven was, of gooi hem weg en stel een nieuwe in.',
                resume: 'Verder spelen',
                discard: 'Weggooien'
            }
        },
        // De multi device kamer: één scherm waar de tafel naar kijkt, en ieder een telefoon.
        lobby: {
            loading: 'Even kijken of je al een kamer hebt…',
            opening: 'De kamer wordt geopend…',
            noLobby: 'Geen kamer',
            hostClosedLobby: 'De host heeft de kamer gesloten. Vraag om een nieuwe code.',
            hostStoppedQuiz: 'De host heeft de quiz gestopt. Vraag om een nieuwe code voor een volgende.',
            dealt: 'De quiz begint…',
            screenHint: {
                title: 'Zet eerst een scherm klaar',
                message: 'Open de kamer op een laptop of tv — HDMI, Chromecast of AirPlay werkt allemaal — en iedereen speelt mee vanaf zijn eigen telefoon.'
            },
            running: {
                quizTitle: 'Je bent al aan het spelen',
                lobbyTitle: 'Er staat nog een kamer open',
                quizMessage: 'In kamer {{code}} loopt nog een quiz. Ga verder, of stop hem en open een nieuwe kamer.',
                lobbyMessage: 'Kamer {{code}} staat nog open op jouw naam. Ga erheen, of sluit hem en open een nieuwe.',
                resumeQuiz: 'Verder spelen',
                resumeLobby: 'Naar de open kamer',
                stopQuiz: 'Quiz stoppen',
                closeLobby: 'Sluiten en een nieuwe openen'
            },
            confirmClose: {
                title: 'Kamer sluiten?',
                message: 'De kamer wordt verwijderd en de code werkt niet meer. Iedereen die er al in zit vliegt eruit.',
                action: 'Sluiten'
            },
            confirmLeave: {
                title: 'Kamer verlaten?',
                message: 'Je gaat terug naar het spelmenu. Je kunt later met dezelfde code weer meedoen.',
                action: 'Verlaten'
            },
            stay: 'Hier blijven',
            start: 'Quiz starten',
            startNote: 'Zodra je start kan er niemand meer bij.',
            needPlayers: 'Je hebt minstens {{min}} telefoons aan tafel nodig.',
            needQuiz: 'Kies eerst een quiz.',
            hostFallback: 'De host'
        },
        // Het gedeelde scherm waar de hele tafel naar kijkt. Het kijkt alleen mee, dus er valt niets op te tikken.
        table: {
            // De weg naar binnen voor de laptop, want een scherm kan de QR van zichzelf niet scannen.
            door: {
                title: 'Zet de quiz op een scherm',
                message: 'Typ de code die de host op zijn telefoon heeft. Dit scherm kijkt alleen mee — iedereen speelt nog steeds op zijn eigen telefoon.',
                codeLabel: 'Kamercode',
                placeholder: 'PXK7Q',
                open: 'Scherm openen',
                rejected: 'Dat is geen quizcode. Check hem op de telefoon van de host.'
            },
            connecting: 'De kamer zoeken…',
            closed: 'De host heeft de kamer gesloten, dus dit scherm is klaar.',
            dealt: 'De quiz is begonnen.',
            joinAt: 'Doe mee met',
            scanHint: 'Scan dit met je telefoon om mee te doen.',
            waitingForHost: 'Wachten tot de host de quiz start…',
            needPlayers: 'Nog {{needed}} te gaan voordat de quiz kan starten.',
            scores: 'Scores',
            quizmaster: 'Quizmaster',
            guesser: 'Gokker',
            standings: 'Tussenstand',
            answer: 'Het antwoord',
            numbersIn: '{{done}} van {{total}} getallen binnen',
            typeYours: 'Typ je getal op je eigen telefoon.',
            // Een ronde waarvan het scherm nog niet gebouwd is, dus de telefoons zijn alles.
            followPhones: 'Speel deze ronde op je telefoon.',
            missed: 'Mis',
            gotSoFar: '{{awarded}} van {{total}} tot nu toe',
            choosing: '{{name}} kiest makkelijk of moeilijk',
            over: 'Dat was de quiz.'
        },
        // De telefoon, die in deze modus vooral een controller is.
        control: {
            changeGuess: 'Aanpassen',
            guessSent: 'Je getal is binnen',
            onTheScreen: 'Op het scherm',
            pickAnswer: 'Kies je antwoord',
            roundStarting: '{{name}} opent de ronde',
            theScreenHasIt: 'Alles staat op het grote scherm.',
            submitGuess: 'Dit is mijn getal',
            theyTapItThemselves: '{{name}} tikt het antwoord op de eigen telefoon aan.',
            waitingFor: 'Wachten op {{name}}',
            yourChoice: 'Makkelijk of moeilijk?',
            yourChoiceCue: 'Kies er een en je vraag komt op het scherm',
            yourGuess: 'Jouw getal',
            yourTurn: 'Jij bent'
        },
        play: {
            loading: 'De tafel klaarzetten…',
            close: 'Quiz verlaten',
            roundLabel: 'Ronde {{round}} · {{kind}}',
            rounds: {
                open: 'Open',
                choice: 'Meerkeuze',
                closest: 'Wie zit er het dichtst bij',
                describe: 'Omschrijven',
                list: 'Noem er vier',
                doubleDown: 'Dubbel Spel',
                finale: 'De finale'
            },
            questionNumber: 'Vraag {{number}}',
            questionTotal: ' van {{total}}',
            questionOutOf: '/{{total}}',
            turn: {
                spoken: '{{master}} vraagt het aan {{player}}',
                spokenRun: '{{master}} vraagt het aan {{player}}, die er {{run}} op rij goed heeft',
                /** De koptekst boven de spotlight: wie deze beurt leidt. */
                quizmasterLabel: '{{name}} is quiz master',
                /** Het label boven de uitgelichte naam van wie nu antwoord moet geven. */
                answeringNow: 'Antwoordt nu',
                roleQuizmaster: 'Quiz master',
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
            leadList: '{{name}} vraagt · één speler noemt wat die weet',
            leadDoubleDown: '{{name}} vraagt makkelijk of moeilijk',
            leadFinale: '{{name}} leest voor aan beide finalisten',
            readAloud: 'Lees dit hardop voor',
            onlyYouSeeThis: 'Het antwoord',
            alsoAccept: 'Ook goed: {{answers}}',
            answer: {
                reveal: 'Tik om het antwoord te zien',
                revealHint: 'Houd het scherm voor jezelf'
            },
            validate: 'Beoordelen',
            validateHint: 'Reken het daarna goed of fout',
            validateLocked: 'Laat eerst het antwoord zien',
            gate: 'Check het antwoord',
            gateHint: 'Fout? Dan gaat de vraag naar de volgende speler.',
            wrong: 'Fout',
            correct: 'Goed',
            markWrong: 'Reken {{name}} fout',
            markCorrect: 'Reken {{name}} goed',
            wrongPassesTo: 'Fout? Dan mag {{name}}',
            wrongEndsQuestion: 'Niemand meer over, fout beëindigt deze vraag',
            passOn: 'Nu mag {{name}} raden',
            passOnHint: '{{name}} had het fout · tik om verder te gaan',
            passOnSpoken: 'Nu mag {{to}} dezelfde vraag raden, omdat {{from}} het fout had. Tik om verder te gaan.',
            // The button's own label.
            quickAssign: 'Snel',
            quickAssignSpoken: 'Snel toewijzen: kies wie het goed had',
            quickAssignTitle: 'Wie had het goed?',
            quickAssignBody: 'Vraag de tafel de kring rond en kies wie het goed had. Iedereen die je overslaat wordt fout gerekend, net als wanneer je steeds op Fout tikt.',
            quickAssignNobody: 'Niemand had het goed',
            quickAssignConfirm: 'Toewijzen',
            quickAssignConfirmNamed: 'Toewijzen aan {{name}}',
            quickAssignCancel: 'Terug',
            choiceAlwaysPasses: 'Volgende ronde mag {{name}} raden',
            correctKeepsTurn: 'Goed, en de volgende vraag is weer voor {{name}}',
            worthPoints: '{{worth}}p',
            noPoint: 'Geen punt',
            scores: 'Stand',
            choice: {
                options: 'De vier opties',
                readAll: 'Lees de vraag hardop voor en daarna de opties',
                spoken: '{{letter}}. {{text}}',
                spokenCorrect: '{{letter}}. {{text}}, dit is de goede'
            },
            closest: {
                answer: '{{answer}} {{unit}}',
                placeholder: 'Gok',
                entry: 'De gok van {{name}}',
                duplicate: 'Twee spelers hebben hetzelfde getal. Vraag er een om een ander.',
                unreadable: 'Daar staat geen getal.',
                pickInstead: 'Sla de getallen over, tik gewoon wie won',
                typeInstead: 'Vul de gokken toch in',
                award: 'Geef ze de punten',
                nearestTakes: 'Dichtstbij pakt {{worth}}p',
                guessingOrder: 'Wie gokt, op tafelvolgorde',
                collect: 'Schrijf de gokken op',
                collectHint: 'Laat ze eerst allemaal een getal noemen, geen twee dezelfde',
                backToQuestion: 'Terug naar de vraag',
                answerLabel: 'Antwoord · alleen jij',
                hide: 'Verberg',
                theirNumbers: 'Hun getallen',
                filled: '{{filled}} van {{total}} ingevuld',
                off: '{{off}} ernaast',
                nearestOff: 'dichtstbij · {{off}} ernaast',
                missingTitle: 'Niet iedereen heeft een getal',
                missingOne: 'Bij {{names}} staat niets ingevuld, dus die kan deze niet winnen.',
                missingMany: 'Bij {{names}} staat niets ingevuld, dus die kunnen deze niet winnen.',
                missingBack: 'Terug om ze in te vullen',
                missingAnyway: 'Toch afronden',
                result: {
                    nearestOne: '{{names}} zat er het dichtstbij',
                    nearestMany: '{{names}} zaten er het dichtstbij',
                    nobody: 'Niemand zat er het dichtstbij',
                    paidOne: '{{worth}} punten',
                    paidMany: '{{worth}} punten elk',
                    paidNobody: 'Deze levert niemand iets op',
                    answerLabel: 'Het antwoord',
                    guessesLabel: 'Wat iedereen zei',
                    continue: 'Ga verder'
                }
            },
            pad: {
                minus: 'Min',
                backspace: 'Wissen'
            },
            describe: {
                readyRuleOnlyGuesser: 'Je omschrijft aan {{guesser}}. Zolang de klok loopt telt alleen wat zij zeggen',
                readyRuleTime: '{{seconds}} seconden om zoveel mogelijk van je {{words}} woorden te omschrijven',
                readyRuleNoSaying: 'Zeg het woord zelf nooit. Anders telt het niet.',
                readyRuleBothScore: 'Elk woord dat {{guesser}} raadt is een punt voor hen én een punt voor jou',
                readyRuleBonus: 'Als de tijd om is krijgen de andere {{others}} spelers ieder één gok op een woord dat nog niet geraden is',
                start: 'Start',
                dontSayIt: 'Zeg het woord zelf nooit',
                runningReminder: 'Tik een woord af zodra {{guesser}} het heeft. De rest van de tafel is straks aan de beurt.',
                inTimeTitle: 'Wat had {{guesser}}?',
                inTimeHint: 'Tik elk woord aan dat {{guesser}} op tijd zei',
                toBonus: 'Bonusronde · nog {{left}} over',
                toSettle: 'Door naar de punten',
                bonusHint: 'De quiz master mag niks meer zeggen, maar elke andere speler mag nog wel 1x een woord raden op basis van wat er net genoemd is om zo bonuspunten te scoren.',
                scoringTitle: 'Hoe de beurt ging',
                standing: '{{name}} pakt {{points}}p uit deze beurt',
                scoreAgain: 'Deze beurt opnieuw scoren',
                settle: 'Verder gaan'
            },
            list: {
                readyRuleOnlyGuesser: 'Je vraagt het aan {{guesser}}. Tot hun beurt voorbij is telt alleen wat zij zeggen',
                readyRuleTime: '{{seconds}} seconden om zoveel mogelijk van de {{answers}} antwoorden te noemen',
                readyRuleGuesses: '{{guesses}} gokken om zoveel mogelijk van de {{answers}} antwoorden te noemen',
                readyRuleHidden: 'Alleen jij als quizmaster ziet deze antwoorden',
                readyRuleScore: 'Elk antwoord dat ze noemen is {{worth}} punt voor de gokker',
                readyRuleBonus: 'Daarna krijgen de andere {{others}} spelers ieder één gok voor een antwoord dat nog niet genoemd is om zo bonuspunten te scoren',
                start: 'Start',
                preTimerHint: 'Lees eerst de vraag hardop voor, start dan de klok en {{guesser}} kan gaan gokken',
                startTimer: 'Start de klok',
                runningReminder: 'Vink elk antwoord af dat {{guesser}} noemt. De rest telt nog niet mee.',
                zenNotice: 'Geen tijdsdruk hier. {{guesser}} mag {{nGuesses}} keer gokken, en daarna krijgt elke andere speler één bonusgok op een antwoord dat niemand had.',
                inTimeTitle: 'Wat had {{guesser}}?',
                inTimeHint: 'Tik elk antwoord aan dat {{guesser}} goed had — ook het antwoord dat er helemaal aan het eind nog uit kwam',
                toBonus: 'Bonusronde · nog {{left}} over',
                toSettle: 'Door naar de punten',
                bonusHint: 'Eén gok op een van deze. Goed geraden en het punt is van jou.',
                scoringTitle: 'Resultaat',
                standing: '{{name}} pakt {{points}}p uit deze vraag',
                scoreAgain: 'Deze vraag opnieuw scoren',
                settle: 'Verder gaan'
            },
            doubleDown: {
                ask: 'Makkelijk of moeilijk, {{name}}?',
                cue: 'Vraag het hardop en tik aan wat er gekozen wordt',
                easy: 'Makkelijk · {{points}} punt',
                hard: 'Moeilijk · {{points}} punten'
            },
            intro: {
                of: 'van {{total}}',
                round: 'Ronde {{round}}',
                briefOpen: 'Twintig open vragen. De quiz master vraagt het aan de speler links van zich; goed antwoord en de volgende is ook voor jou, fout de volgende speler mag raden. Elke tweede vraag levert een punt op.',
                briefChoice: 'Pittigere vragen, multiple choice. Iedereen start 1x en is 1x quiz master. Elke vraag is twee punten waard.',
                briefClosest: 'Een vraag met een getal als antwoord. Iedereen behalve de quiz master noemt één gok, en niemand mag hetzelfde getal zeggen. Wie er het dichtst bij zit pakt twee punten.',
                briefDescribe: '30 seconden om je eigen woorden te omschrijven zonder het woord te zeggen (of een vertaling) — aan de speler links van je, en aan niemand anders. Elk woord dat die raadt is een punt voor hen én voor jou. Daarna krijgt de rest van de tafel ieder één gok op een gemist woord.',
                briefList: 'Eén vraag met vier antwoorden erin verstopt. De quiz master vraagt het aan de speler links van zich, die twintig seconden krijgt om er zoveel mogelijk te noemen. Wat overblijft gaat daarna de tafel rond, ieder één gok. Elk antwoord dat valt is een punt voor wie het noemde.',
                briefListZen: 'Eén vraag met vier antwoorden erin verstopt. De quiz master vraagt het aan de speler links van zich, die geen klok heeft en acht gokken krijgt om er zoveel mogelijk te noemen. Wat overblijft gaat daarna de tafel rond, ieder één gok. Elk antwoord dat valt is een punt voor wie het noemde.',
                briefDoubleDown: 'Makkelijk of moeilijk? Elke speler krijgt de keuze: een makkelijke vraag is 1 punt waard, een moeilijke 3. Er zijn er vijf van elk, dus als een soort op is neem je wat er over is. Fout? Dan gaat de vraag de tafel rond — en wie hem pakt krijgt de volle waarde.',
                briefFinale: 'De 2 spelers met de meeste punten strijden tegen elkaar in de finale. Elk goed antwoord is 100 punten waard. De persoon met de minste punten begint steeds.',
                versus: 'vs',
                quizmaster: '{{name}} is quiz master',
                action: 'Start ronde {{round}}'
            },
            handoff: {
                step: 'Ronde {{round}} · {{number}} van {{total}}',
                title: 'Geef de telefoon aan {{name}}',
                jobOpen: '{{name}} leest voor aan de speler links van zich',
                jobChoice: '{{name}} leest de vraag en alle vier de opties voor',
                jobClosest: '{{name}} leest de vraag voor en verzamelt de getallen van de rest',
                jobDescribe: '{{name}} omschrijft de woorden aan de speler links. Alleen {{name}} mag dit scherm zien.',
                jobList: '{{name}} leest de vraag voor en vinkt elk antwoord af dat de speler links van hen noemt.',
                jobDoubleDown: '{{name}} vraagt de volgende speler makkelijk of moeilijk en leest daarna de vraag voor die eruit komt.',
                jobFinale: '{{name}} leest voor aan beide finalisten en speelt deze ronde zelf niet mee.',
                ruleOpen: 'Goed antwoord? Dan is de volgende vraag ook voor jou. Fout en hij schuift door. Elke tweede vraag levert een punt op.',
                ruleChoice: 'Net als hiervoor: goed antwoord en de volgende is ook voor jou. Elke vraag is hier 2 punten waard.',
                ruleClosest: 'Iedereen behalve de quiz master gokt één keer, en niemand mag hetzelfde getal zeggen. Dichtstbij pakt 2.',
                ruleDescribe: 'Dertig seconden, gespeeld met de speler links van je. Elk woord dat die raadt is een punt voor hen én een punt voor jou.',
                ruleList: 'Twintig seconden, en alleen de speler links van je antwoordt. Wat zij missen gaat daarna de tafel rond, ieder één gok.',
                ruleDoubleDown: 'Makkelijk levert 1 punt op, moeilijk 3, en er zijn er vijf van elk — dus een soort kan opraken. Fout? Dan gaat de vraag voor de volle waarde de tafel rond.',
                ruleFinale: 'Elke vraag gaat eerst naar wie achter staat. Fout? Dan mag de ander hem alsnog pakken. 100 punten per goed antwoord, en de meeste punten wint de avond.',
                action: 'Laat de vraag zien'
            },
            standings: {
                label: 'Ronde {{round}} van {{total}} klaar',
                title: 'Ronde {{round}} klaar',
                description: 'De tussenstand.',
                startNext: 'Start ronde {{round}}',
                nextRoundWip: 'Ronde {{round}} is er nog niet. Jullie punten zijn bewaard. De quiz wacht waar jullie gebleven waren.'
            },
            final: {
                title: 'De quiz is afgelopen',
                description: 'Zo eindigde de avond.',
                finalist: 'Finalist',
                winnerLabel: 'Winnaar',
                points: '{{score}} punten',
                tieLabel: 'Gedeelde eerste plaats',
                tieTitle: 'Niemand liep uit',
                tieDescription: 'Niemand eindigde bovenaan. De avond is gedeeld.',
                restLabel: 'De rest van de tafel'
            }
        },
        errors: {
            // De multi device kamer, geweigerd.
            lobbyFull: 'Die kamer is vol. Acht telefoons is het maximum aan één tafel.',
            alreadyStarted: 'Die kamer is al begonnen. Vraag om een nieuwe code.',
            lobbyGone: 'Die kamer bestaat niet meer. Check de code.',
            notHost: 'Alleen wie de kamer geopend heeft kan dat veranderen.',
            notAtThisTable: 'Je zit niet aan deze tafel.',
            notYourSeat: 'Het is niet jouw beurt om die te beantwoorden.',
            expired: 'Je bent uitgelogd. Log opnieuw in om een quiz te starten.',
            quizGone: 'Die quiz bestaat niet meer. Kies een andere.',
            badTable: 'De tafel werd geweigerd. Check de namen en probeer het opnieuw.',
            tooFewPlayers: 'Een quiz heeft minstens twee spelers nodig.',
            tooManyPlayers: 'Acht spelers is het maximum aan één tafel.',
            duplicateName: 'Twee spelers kunnen niet dezelfde naam hebben.',
            quizTooSmall: 'Deze quiz heeft niet genoeg vragen voor zoveel spelers. Kies een andere quiz, of speel met minder mensen.',
            generic: 'De quiz kon niet gestart worden. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je internet.',
            staleTurn: 'De tafel is al verder. Het bord hieronder is waar de quiz echt staat.',
            duplicateGuess: 'Twee spelers kunnen niet hetzelfde getal gokken. Vraag er een om een ander.',
            quizmasterCannotGuess: 'Wie de vraag voorleest, mag er zelf niet naar gokken.',
            describerCannotGuess: 'Je kunt geen punt krijgen voor een woord dat je zelf omschreef.',
            oneGuessEach: 'Iedereen behalve de speler die raadt krijgt één gok.',
            twoOnOne: 'Dit kan maar aan één speler worden toegekend.',
            /** Ronde 2 beoordeelt zichzelf op de telefoon van wie antwoordt, en de vraag van ronde 6 kiest de speler zelf. */
            verdictDisagrees: 'Dat is niet wat de quiz over dat antwoord zegt. Check welke optie er aangetikt is.',
            noChoiceYet: 'Er is nog niet gekozen tussen makkelijk en moeilijk, dus er is nog geen vraag om te beoordelen.'
        }
    },
    oneOfUs: { 
        index: { 
            description: "Kun jij de burgers van de bedrieger(s) onderscheiden?", 
            oneDevice: { 
                title: "1 telefoon", 
                description: "Speel met 1 telefoon die wordt doorgegeven", 
                action: "Spelen" 
            }, 
            multiDevice: { 
                title: "Multi device", 
                description: "Maak een lobby en nodig andere spelers uit", 
                action: "Lobby maken" 
            } 
        },
        singleDevice: {
            title: "Speel met 1 device",
            description: "Vul alle namen in van de spelers waar je mee speelt. Druk dan op start.",
            players: {
                tooFew: 'One of Us heeft minstens drie spelers nodig.',
                tooMany: 'Negen spelers is het maximum voor één telefoon.',
                duplicate: 'Twee spelers kunnen niet dezelfde naam hebben.'
            }
        },
        multiDevice: {
            lobby: {
                opening: 'De kamer wordt geopend…',
                noLobby: 'Geen kamer',
                hostStoppedGame: 'De host heeft het spel gestopt. Vraag om een nieuwe code voor nog een ronde.',
                hostClosedLobby: 'De host heeft de kamer gesloten. Vraag om een nieuwe code.',
                running: {
                    gameTitle: 'Je bent al aan het spelen',
                    lobbyTitle: 'Je hebt nog een kamer open',
                    gameMessage: 'Je speelt nog een spel in kamer {{code}}. Ga verder, of stop het en open een nieuwe kamer.',
                    lobbyMessage: 'Kamer {{code}} staat nog op jouw naam open. Ga terug, of sluit hem en open een nieuwe.',
                    resumeGame: 'Doorspelen',
                    resumeLobby: 'Naar de open kamer',
                    stopGame: 'Spel stoppen',
                    closeLobby: 'Stoppen en nieuwe maken'
                },
                confirmClose: {
                    title: 'Kamer sluiten?',
                    message: 'De kamer wordt verwijderd en de code werkt niet meer. Iedereen die er al in zit wordt eruit gezet.',
                    action: 'Sluiten'
                },
                confirmLeave: {
                    title: 'Kamer verlaten?',
                    message: 'Je gaat terug naar het spelmenu. Je kunt later met dezelfde code weer meedoen.',
                    action: 'Verlaten'
                },
                stay: 'Hier blijven',
                start: 'Start het spel',
                startNote: 'Zodra je start kan er niemand meer bij.',
                needPlayers: 'Je hebt minstens {{min}} spelers nodig.',
                hostFallback: 'De host',
                settingsTitle: 'Spelinstellingen'
            },
            play: {
                loading: 'De rollen worden verdeeld…',
                noGame: 'Geen spel',
                waiting: 'Wachten op de tafel…',
                label: 'Ronde {{round}}',
                stillIn: 'Nog {{count}} in het spel',
                out: {
                    title: 'Je ligt eruit',
                    message: 'De tafel heeft je eruit gestemd. Blijf kijken hoe het eindigt — antwoorden en stemmen kan niet meer.'
                },
                deal: {
                    label: 'Jouw opdracht',
                    title: 'Deze is voor jou',
                    intro: 'Alleen jij ziet dit. Hou het voor jezelf: elke ronde schrijf je er een nieuw antwoord over.',
                    action: 'Ik heb hem'
                },
                answer: {
                    round: 'Ronde {{round}}',
                    title: 'Schrijf je antwoord',
                    intro: 'Eén regel over je eigen opdracht. Genoeg om te bewijzen dat je hem hebt, niet genoeg om hem weg te geven.',
                    field: 'Jouw antwoord',
                    placeholder: 'Iets wat alleen iemand met jouw opdracht zou schrijven',
                    submit: 'Vastzetten',
                    yours: 'Jouw antwoord',
                    waitingTitle: 'De jouwe staat',
                    waitingMessage: 'Wachten op de rest van de tafel. Het stemmen begint zodra het laatste antwoord binnen is.',
                    progress: '{{done}} van {{total}} antwoorden binnen'
                },
                vote: {
                    round: 'Ronde {{round}}',
                    title: 'Welke past er niet bij?',
                    intro: 'Alle antwoorden, geen namen. Bespreek het hardop en kies dan de vreemde eend.',
                    confirm: 'Mijn stem uitbrengen',
                    confirmHint: 'Dit kun je niet meer terugdraaien.',
                    locked: 'Kies eerst een antwoord.',
                    waiting: 'Je stem staat. Wachten op de rest van de tafel.',
                    progress: '{{done}} van {{total}} stemmen binnen'
                },
                reveal: {
                    round: 'Ronde {{round}}',
                    title: 'Wie schreef wat',
                    writtenBy: 'Geschreven door {{name}}',
                    pickedBy: 'Gekozen door {{names}}',
                    nobodyPicked: 'Niemand koos deze',
                    tieBroken: 'De stemmen stonden gelijk, dus de burgemeester besliste.',
                    next: 'Kijk wie eruit ligt',
                    toResult: 'Kijk hoe het eindigde'
                }
            },
            errors: {
                lobbyFull: 'Die kamer is vol.',
                alreadyStarted: 'Dat spel is al begonnen.',
                notHost: 'Alleen de host kan dat.',
                notEnoughPlayers: 'Je hebt meer spelers nodig voordat je kunt starten.',
                tooManyPlayers: 'Dat zijn meer spelers dan One of Us aan één tafel kwijt kan.',
                gameNotOver: 'Het spel is nog niet voorbij.',
                noContent: 'Er zijn nog geen opdrachten voor die taal.',
                lobbyGone: 'Die kamer bestaat niet meer.',
                alreadyAnswered: 'Je antwoord voor deze ronde staat al.',
                alreadyVoted: 'Je hebt deze ronde al gestemd.',
                cannotVoteSelf: 'Je kunt niet op je eigen antwoord stemmen.',
                votedOut: 'Je bent eruit gestemd, dus je antwoordt en stemt niet meer.',
                wrongRound: 'Die ronde is voorbij. Momentje.',
                wrongPhase: 'De tafel is ergens anders. Momentje.',
                badAnswer: 'Dat antwoord kan niet. Schrijf iets, en hou het kort.',
                gameFinished: 'Dat spel is voorbij.'
            }
        },
        settings: {
            wordsOnly: {
                title: "Alleen woorden",
                description: "Gebruik alleen woorden. Anders een zin."
            },
            roles: {
                title: 'Rollen',
                description: 'Welke rollen uitgedeeld kunnen worden.',
                count: '{{enabled}} van {{total}}',
                locked: 'Er moet één soort bedrieger aan blijven — zonder kan niemand winnen.',
                imposter: {
                    description: 'Krijgt een ander woord en moet meepraten zonder door de mand te vallen.'
                },
                nitwit: {
                    description: 'Krijgt helemaal geen woord.'
                }
            }
        },
        play: {
            loading: 'De woorden worden verdeeld…',
            close: 'Spel verlaten',
            roundSpeak: 'Ronde {{round}} · beurt',
            roundDiscuss: 'Ronde {{round}} · overleg',
            roundVote: 'Ronde {{round}} · stemmen',
            roundResult: 'Ronde {{round}} · uitslag',

            reveal: {
                step: 'Woord {{number}} van {{total}}',
                title: '{{name}} is aan de beurt',
                body: 'Pak de telefoon aan van {{from}} en houd hem voor jezelf.',
                bodyFirst: 'Alleen {{name}} mag het volgende scherm zien.',
                note: 'Niemand anders mag meekijken.',
                action: 'Ik ben {{name}}',
                queue: 'Nog aan de beurt: {{names}}',
                secretLabel: 'Tik om je woord te zien',
                secretHint: 'Houd de telefoon zo dat niemand anders meekijkt.',
                warning: 'Alleen jij ziet dit',
                noWord: 'Helemaal geen woord',

                role: {
                    label: 'Jouw rol',
                    civilian: {
                        name: 'Burger',
                        explanation: 'Iedereen met jouw woord hoort erbij. Zoek degene die het niet heeft.'
                    },
                    imposter: {
                        name: 'Imposter',
                        explanation: 'Jouw woord is niet dat van de rest van de tafel. Bluf mee en overleef.'
                    },
                    unknown: {
                        name: 'Burger of Imposter',
                        explanation: 'Je weet niet wat je bent. Let op de tafel, luister naar het woord en kom erachter.'
                    },
                    nitwit: {
                        name: 'De onnozele',
                        explanation: 'Jij hebt helemaal geen woord. Bouw elke beurt op wat je anderen hoort zeggen.'
                    }
                },
                hide: 'Verbergen',
                done: 'Geef door aan {{name}}',
                lastDone: 'Gezien, start ronde 1'
            },

            speak: {
                step: 'Spreker {{number}} van {{total}}',
                nowSpeaking: 'Nu aan het woord',
                hint: 'Zeg één woord wat met jouw woord te maken heeft. Noem het woord zelf niet.',
                next: 'Volgende: {{name}}',
                lastNext: 'Iedereen is geweest'
            },

            discuss: {
                ring: 'Stemmen',
                title: 'Wie wordt geëlimineerd?',
                description: 'Iedereen moet wijzen naar iemand die hij/zij niet vertrouwd. Degene met de meeste stemmen wordt weggestemd. Je mag niet, niet stemmen.',
                tieNote: 'Je mag jouw antwoord niet verdedigen. Iedereen moet gewoon stemmen zonder overleg. Overleg is verboden!',
                tieNoteMayor: 'Je mag jouw antwoord niet verdedigen. Stemmen zonder overleg! Gelijk aantal stemmen, dan beslist {{name}} als burgemeester.',
                action: 'Stemmen'
            },

            vote: {
                title: 'Stem iemand weg',
                description: 'Tik een naam en bevestig daarna.',
                ringChosen: 'Gekozen',
                nobody: 'Nog niemand gekozen',
                confirm: 'Stem op {{name}}',
                confirmHint: 'Dit kan niet ongedaan gemaakt worden.',
                locked: 'Tik eerst op een naam.',
                mayorLabel: 'Burgemeester',
                mayorNote: '{{name}} beslist wie eruit gaat als de stemmen staken. De burgemeester kan ook een imposter zijn.'
            },

            elimination: {
                ringLabel: 'Weggestemd',
                civilian: '{{name}} was een burger.',
                imposter: '{{name}} was een imposter.',
                nitwit: '{{name}} was de onnozele.',
                remaining: 'Nog {{players}} in het spel.',
                next: 'Ronde {{round}}'
            },

            briefing: {
                title: 'Wie spelen er mee',
                intro: 'Iedereen krijgt een van deze rollen. Lees ze voor voordat je begint.',
                roleLabel: 'Rol',
                role: {
                    civilian: 'De meesten aan tafel zijn burgers. Zij hebben allemaal hetzelfde woord en moeten uitzoeken wie dat niet heeft.',
                    imposter: 'De imposters kregen een ander woord en kennen het echte niet. Zij bluffen mee en winnen door te overleven.',
                    nitwit: 'De onnozele kreeg helemaal geen woord en speelt mee met de imposters, die geen idee hebben wie het is.'
                },
                action: 'Woorden verdelen'
            },

            over: {
                /** The band along the top. The headline under it says who won. */
                label: 'Spel afgelopen',
                civilians: 'De burgers winnen',
                imposters: 'De imposters winnen',
                civiliansWhy: 'Alle imposters zijn weggestemd.',
                impostersWhy: 'De imposters zijn niet langer in de minderheid.',
                rolesTitle: 'Iedereen',
                civilianTag: 'Burger',
                imposterTag: 'Imposter',
                nitwitTag: 'Onnozele',
                votedOut: 'Weggestemd',
                civilianWord: 'Het woord was',
                imposterWord: 'De imposters hadden',
                again: 'Opnieuw spelen'
            }
        },
        errors: {
            expired: 'Je bent uitgelogd. Log opnieuw in om verder te spelen.',
            gameGone: 'Dat spel bestaat niet meer.',
            badTable: 'Die tafel kan niet gedeeld worden. Check de namen en probeer opnieuw.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je internet.'
        }
    },
    fakeFiller: {
        index: {
            description: 'Een zin met een gat erin. Twee spelers verzinnen stiekem een invulling; de rest moet raden welke echt is.',
            multiplayer: {
                title: 'Multi device',
                description: 'Iedereen op zijn eigen telefoon. Eén pseroon maak de lobby, de rest joined met de code.',
                action: 'Open een kamer'
            }
        },
        lobby: {
            loading: 'Zoeken naar je kamer…',
            opening: 'Kamer openen…',
            noLobby: 'Geen kamer',
            hostStoppedGame: 'De host heeft het spel gestopt. Vraag om een nieuwe code voor nog een ronde.',
            hostClosedLobby: 'De host heeft de kamer gesloten. Vraag om een nieuwe code.',
            running: {
                gameTitle: 'Je bent al aan het spelen',
                lobbyTitle: 'Je hebt nog een kamer open staan',
                gameMessage: 'Je speelt nog een spel in kamer {{code}}. Ga verder, of stop het en open een nieuwe kamer.',
                lobbyMessage: 'Kamer {{code}} staat nog op jouw naam open. Ga terug, of sluit hem en open een nieuwe.',
                resumeGame: 'Verder spelen',
                resumeLobby: 'Naar open kamer',
                stopGame: 'Spel stoppen',
                closeLobby: 'Spel stoppen en nieuwe maken'
            },
            confirmClose: {
                title: 'Kamer sluiten?',
                message: 'De kamer wordt verwijderd en de code werkt niet meer. Iedereen die er al in zit vliegt eruit.',
                action: 'Sluiten'
            },
            confirmLeave: {
                title: 'Kamer verlaten?',
                message: 'Je gaat terug naar het spelmenu. Je kunt later met dezelfde code weer meedoen.',
                action: 'Verlaten'
            },
            stay: 'Blijf hier',
            start: 'Start het spel',
            startNote: 'Zodra je start kan niemand er meer bij.',
            needPlayers: 'Je hebt minstens {{min}} spelers nodig.',
            hostFallback: 'De host',
            settingsTitle: 'Spelinstellingen',
            mode: 'Vragen',
            modeFacts: 'Echte feiten',
            modeCreative: 'Alles mag',
            modeFactsHint: 'Elke vraag heeft een echt antwoord tussen de verzinsels. Vind hem en je scoort.',
            modeCreativeHint: 'Geen goed antwoord — alleen verzinsels. Je scoort alleen als iemand jou kiest.'
        },
        play: {
            loading: 'Vragen uitdelen…',
            noGame: 'Geen spel',
            writing: {
                title: 'Vul de gaten in',
                intro: 'Twee vragen zijn van jou. Verzin iets geloofwaardigs — je scoort elke keer dat iemand jouw antwoord kiest.',
                promptOf: 'Vraag {{index}} van {{total}}',
                blank: 'Gat {{index}}',
                blankPlaceholder: 'Jouw antwoord',
                submit: 'Vastzetten',
                locked: 'Vastgezet',
                edit: 'Aanpassen',
                incomplete: 'Vul eerst elk gat in.',
                waitingTitle: 'Allebei die van jou staan erin',
                waitingMessage: 'Wachten op de rest van de tafel. Het stemmen begint zodra het laatste antwoord binnen is.',
                progress: '{{done}} van {{total}} antwoorden binnen'
            },
            voting: {
                title: 'Welke is echt?',
                titleCreative: 'Welke vind jij de beste?',
                roundOf: 'Ronde {{round}} van {{total}}',
                pick: 'Kies deze',
                confirm: 'Zet mijn stem vast',
                voted: 'Stem geteld',
                yoursTitle: 'Deze is van jou',
                yoursMessage: 'Hopelijk raden anderen jouw fake filler!',
                progress: '{{done}} van {{total}} stemmen binnen',
                waiting: 'Wachten tot de rest gestemd heeft…'
            },
            reveal: {
                title: 'De uitslag',
                truthWas: 'De echte regel was',
                truthReward: 'hem vinden is een punt waard',
                truth: 'De waarheid',
                fake: 'Verzonnen',
                writtenBy: 'Geschreven door {{name}}',
                nobodyPicked: 'Niemand koos deze',
                pickedBy: 'Gekozen door {{names}}',
                points: '+{{points}}',
                noScore: 'Geen punten deze ronde.',
                next: 'Volgende ronde',
                toResults: 'Naar de eindstand'
            }
        },
        results: {
            loading: 'Uitslag laden…',
            title: 'Spel afgelopen',
            tie: 'Gelijkspel op {{score}} punten.',
            youWin: 'Jij wint met {{score}} punten.',
            playerWins: '{{name}} wint met {{score}} punten.',
            againSamePlayers: 'Nog een keer, zelfde spelers',
            autoJoin: 'Iedereen die nog op dit scherm zit gaat automatisch mee naar de nieuwe kamer.',
            anotherRound: 'Nog een ronde?',
            hostCanOpen: 'Het spel is klaar. De host kan een nieuwe kamer openen. Blijf hier en je gaat automatisch mee.'
        },
        errors: {
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            gameGone: 'Dit spel bestaat niet meer.',
            generic: 'Er ging iets mis. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Controleer je internet.',
            lobbyFull: 'Deze kamer is vol.',
            lobbyGone: 'Deze kamer bestaat niet meer. Controleer de code.',
            alreadyStarted: 'Dit spel is al begonnen.',
            notEnoughPlayers: 'Je hebt minstens drie spelers nodig om te starten.',
            tooManyPlayers: 'Dat zijn te veel spelers voor één spel.',
            noContent: 'Er zijn niet genoeg vragen in deze taal. Probeer de andere.',
            notYourPrompt: 'Die vraag is niet aan jou uitgedeeld.',
            alreadyAnswered: 'Die heb je al ingevuld.',
            alreadyVoted: 'Je hebt al gestemd in deze ronde.',
            cannotVoteOwnPrompt: 'Jij hebt voor deze geschreven, dus je kunt er niet op stemmen.',
            wrongRound: 'De tafel is al naar de volgende ronde.',
            wrongPhase: 'Zo ver is de tafel nog niet.',
            badAnswer: 'Vul elk gat in voordat je vastzet.',
            gameFinished: 'Dit spel is afgelopen.'
        }
    },
    friends: {
        title: 'Vrienden',
        description: 'Want alleen is zo saai.',
        how: {
            title: 'Vrienden toevoegen',
            message: 'Vrienden worden automatisch toegevoegd wanneer je voor het eerst met een andere speler speelt.'
        },
        listLabel: 'Jouw vrienden',
        since: 'Sinds {{date}}',
        empty: {
            title: 'Nog niemand',
            message: 'Start een spel en deel de code, of doe mee met die van iemand anders. Iedereen in de lobby komt hier terecht.'
        },
        errors: {
            signedOut: 'Je sessie is verlopen. Log opnieuw in om je vrienden te zien.',
            generic: 'Je vrienden konden niet worden geladen.',
            network: 'Geen verbinding. Controleer je internet en probeer het opnieuw.'
        }
    },
    invite: {
        title: 'Nodig een vriend uit',
        message: 'Ze krijgen een seintje in de app, of een melding op hun telefoon als die dicht is.',
        send: 'Uitnodigen',
        sent: 'Uitgenodigd',
        failed: 'Niet verstuurd',
        alreadyHere: 'In de lobby',
        noFriends: 'Je hebt nog met niemand gespeeld. Deel de code — iedereen die meedoet komt op je vriendenlijst.',
        loadFailed: 'Je vrienden konden niet worden geladen.'
    },
    notifications: {
        invite: '{{name}} nodigt je uit voor {{game}}',
        inviteGeneric: '{{name}} nodigt je uit voor een spel',
        join: 'Meedoen',
        dismiss: 'Wegklikken'
    }
};
