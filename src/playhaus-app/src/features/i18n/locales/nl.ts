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
        loading: 'Even geduld…',
        language: 'Taal',
        selectValue: '{{label}}: {{value}}',
        nothingSelected: 'niets gekozen',
        players: 'spelers',
        change: 'verander',
        minutes: 'min',
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
        }
    },
    nav: {
        games: 'Spellen',
        reconnect: 'Verder spelen',
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
        }
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
        }        
    },
    languages: {
        nl: { description: 'Woorden uit de Nederlandse lijst.' },
        en: { description: 'Woorden uit de Engelse lijst.' }
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
            message: 'Je speelt als gast. Dit account is tijdelijk: je naam, kleur en gespeelde games kunnen verloren gaan zodra deze sessie eindigt. Voeg een e-mailadres en wachtwoord toe om ze te bewaren.',
            action: 'Maak het definitief'
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
            title: 'Een spel joinen', accent: 'of herverbinden',
            description: "Verbind opnieuw met een bestaand spel of join een nieuw spel."
        },
        loading: 'Spellen zoeken…',
        updated: 'Bijgewerkt {{time}}',
        noGames: 'Geen spellen gevonden om mee te herverbinden',
        resume: 'Verder spelen',
        refresh: { label: 'Ververs de lijst', action: 'Ververs' },
        mode: { solo: 'Solo', lobby: 'Lobby', oneDevice: '1 telefoon' },
        errors: {
            expired: 'Je sessie is verlopen. Log opnieuw in.',
            generic: 'Er ging iets mis bij het ophalen van je spellen. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je verbinding en probeer het opnieuw.'
        }
    },
    lol: {
        index: {
            description: 'Test je woordenschat, daag je vrienden uit en probeer het geheime woord te raden voordat je kansen op zijn. Alleen of tegen je vijanden.',
            playingAs: 'Speelt als {{name}}',
            solo: { title: 'Solo', description: 'Drie rondes, jouw regels.', action: 'Instellen' },
            multiplayer: { title: 'Multiplayer', description: 'Race tegen je vrienden.', action: 'Openen' },
            join: {
                label: 'JOIN EEN GAME',
                /**
                 * Dezelfde kaart, op een breed scherm in tweeën: de vakjes zijn daar maar
                 * de helft, dus het label noemt zijn eigen helft in plaats van de kaart.
                 */
                labelWide: 'TYP DE CODE',
                paste: 'Plakken',
                pasteLabel: 'Code plakken',
                codeLabel: 'Lobbycode',
                scanRowTitle: 'Of scan zijn scherm',
                scanRowHint: 'Je zit er meteen in',
                scanAction: 'Scan liever',
                scanCopy: 'Richt je telefoon op de code van de host',
                scanTitle: 'Scannen om te joinen',
                scanLabel: 'Scan een QR-code om een lobby te joinen',
                scanCancel: 'Annuleren',
                permissionAsk: 'De camera is nodig om de code van de host te lezen. Er wordt niets opgenomen of verstuurd.',
                permissionGrant: 'Camera toestaan',
                /** Hier geen knop onder: dit antwoord verander je in de instellingen. */
                permissionDenied: 'De camera is geblokkeerd voor deze app. Sta hem toe in je instellingen, of typ de vier tekens gewoon in.'
            }
        },
        settings: {
            loading: 'Spel zoeken…',
            title: 'Zet je spel\nklaar',
            description: 'Kies hoe je wilt spelen en begin.',
            wordLength: 'Woordlengte',
            wordLengthOption: '{{letters}} letters',
            hardMode: {
                label: 'Moeilijke modus',
                description: 'Het woord kan elk bestaand woord in de taal zijn. Zet dit uit om met een makkelijkere woordenlijst te spelen.'
            },
            facts: '{{rounds}} rondes · {{guesses}} pogingen per ronde · eerste letter gegeven',
            start: 'Start met spelen',
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
            resultLabel: 'Uitslag',
            viewResult: 'Bekijk de uitslag',
            nextRound: 'Volgende ronde',
            guesses: 'Pogingen: {{guesses}}',
            roundOf: 'Ronde {{round}} van {{total}}',
            hint: 'Hint',
            hintLabel: 'Hint: het woord begint met de {{letter}}',
            solved: 'OPGELOST',
            lost: 'HELAAS',
            theWord: 'Het woord',
            attempts: 'Pogingen',
            guess: 'Raden',
            clear: 'Wissen',
            timeLeft: 'Resterende tijd',
            yourTurn: 'AAN ZET',
            typing: 'typt…'
        },
        results: {
            loading: 'Uitslag laden…',
            loadFailed: 'De uitslag kon niet worden geladen.',
            title: 'Spel afgelopen',
            summary: 'Rondes: {{rounds}} · Letters: {{length}}',
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
            close: 'Lobby sluiten',
            leave: 'Lobby verlaten',
            youHost: 'Jij host',
            connected: 'Verbonden met lobby {{code}}',
            disconnected: 'Verbinding met de lobby kwijt',
            code: 'Lobbycode',
            named: 'Lobby {{code}}',
            shareTitle: 'Kom in mijn lobby',
            codeSpoken: 'Lobbycode: {{characters}}',
            copyCode: 'Lobbycode {{characters}} kopiëren',
            copied: 'Gekopieerd',
            readAloud: 'Lees hem voor, of',
            shareLinkLabel: 'Deel de link naar deze lobby',
            shareLink: 'Deel de link',
            linkCopied: 'Link gekopieerd',
            shareFailed: 'Delen lukte niet',
            qrLabel: 'Toon een QR-code om deze lobby te joinen',
            qrTitle: 'Scannen om te joinen',
            qrCopy: 'Houd er een andere telefoon voor en die komt meteen in de lobby.',
            players: 'Spelers',
            playerCount: '{{taken}} van {{max}}',
            inLobby: 'In de lobby',
            hostYou: 'HOST · JIJ',
            hostTag: 'HOST',
            ready: 'Klaar',
            away: 'Weg',
            freeSeat: 'Vrije plek',
            waiting: 'Wachten…',
            settingsTitle: 'Spelinstellingen',
            timePerTurn: 'Tijd per beurt',
            timePerTurnOption: '{{seconds}} seconden',
            waitingForHost: 'Wachten op de host',
            waitingForHostMessage: '{{name}} zet het spel klaar. Blijf op dit scherm, het start hier meteen mee.',
            waitingLabel: 'Wachten',
            closedTitle: 'Lobby gesloten',
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
            alreadyStarted: 'Dit spel is al begonnen.'
        }
    },
    pubquizr: {
        index: {
            description: 'Een klassiek potje trivia in een speels jasje.',
            oneDevice: { title: '1 telefoon', description: 'Geef de telefoon door.', action: 'Instellen' },
            multiDevice: { title: 'Multi-device', description: 'Iedereen op zijn eigen scherm.', action: 'Coming soon...' },
            weekly: {
                weekday: 'WOE',
                promise: 'ELKE WEEK EEN\nNIEUWE QUIZ'
            },
            list: {
                label: 'Alle quizzen · nieuwste eerst',
                tabs: { weekly: 'Wekelijks', official: 'Officieel', community: 'Community' },
                published: '{{weekday}} {{day}} {{month}} · {{time}}',
                loadOlder: 'Ouder laden',
                empty: 'Hier staat nog niks. Probeer een ander tabblad.',
                failed: 'De quizzen konden niet geladen worden. Check je verbinding.',
                comingSoon: 'Coming soon...'
            }
        },
        oneDevice: {
            title: '1 telefoon',
            description: 'Eén telefoon voor de hele tafel. Zet iedereen op een stoel, kies een quiz en geef hem door.',
            order: {
                title: 'Op volgorde',
                message: 'Vul de namen in de volgorde waarin je zit, van links naar rechts. De rol van quizmaster schuift namelijk door.'
            },
            players: {
                label: 'Wie doen er mee',
                seat: 'Speler {{seat}}',
                placeholder: 'Naam',
                add: 'Speler toevoegen',
                count: '{{seats}} / {{max}}',
                remove: 'Speler {{seat}} verwijderen',
                tooFew: 'Een quiz heeft minstens drie spelers nodig.',
                tooMany: 'Acht spelers is het maximum rond één telefoon.',
                duplicate: 'Twee spelers kunnen niet dezelfde naam hebben.'
            },
            quiz: {
                selected: 'Jullie spelen',
                pick: 'Kies een quiz',
                pickAnother: 'Of kies een andere'
            },
            start: 'Start de quiz'
        },
        play: {
            loading: 'De tafel klaarzetten…',
            close: 'Quiz verlaten',
            youAreQuizmaster: 'Jij bent quizmaster',
            roundLabel: 'Ronde {{round}} · {{kind}}',
            rounds: { open: 'Open' },
            questionNumber: 'Vraag {{number}}',
            questionTotal: ' van {{total}}',
            readAloud: 'Lees dit hardop voor',
            scoresThisRound: 'Stand deze ronde',
            onlyYouSeeThis: 'Alleen jij ziet dit',
            alsoAccept: 'Ook goed: {{answers}}',
            isAnswering: '{{name}} is aan de beurt',
            wrong: 'Fout',
            correct: 'Goed',
            markWrong: 'Reken {{name}} fout',
            markCorrect: 'Reken {{name}} goed',
            wrongPassesTo: 'Fout speelt de beurt door naar {{name}}',
            wrongEndsQuestion: 'Niemand meer over — fout beëindigt deze vraag',
            handoff: {
                step: 'Ronde {{round}} · vraag {{number}} van {{total}}',
                title: 'Geef de telefoon aan {{name}}',
                body: '{{name}} is deze beurt quizmaster — de rest niet meekijken.',
                action: 'Ik ben {{name}} — laat de vraag zien'
            },
            standings: {
                title: 'Ronde {{round}} klaar',
                description: 'Zo staat de tafel ervoor na de eerste ronde.',
                nextRoundWip: 'Ronde {{round}} is er nog niet. Jullie punten zijn bewaard — de quiz wacht waar jullie gebleven waren.'
            }
        },
        errors: {
            expired: 'Je bent uitgelogd. Log opnieuw in om een quiz te starten.',
            quizGone: 'Die quiz bestaat niet meer. Kies een andere.',
            badTable: 'De tafel werd geweigerd. Check de namen en probeer het opnieuw.',
            tooFewPlayers: 'Een quiz heeft minstens drie spelers nodig.',
            tooManyPlayers: 'Acht spelers is het maximum rond één telefoon.',
            duplicateName: 'Twee spelers kunnen niet dezelfde naam hebben.',
            quizTooSmall: 'Deze quiz heeft niet genoeg vragen voor zoveel spelers. Kies een andere quiz, of speel met minder mensen.',
            generic: 'De quiz kon niet gestart worden. Probeer het opnieuw.',
            network: 'Geen verbinding met de server. Check je internet.'
        }
    },
    oneOfUs: { 
        index: { 
            description: "Iedereen krijgt een vraag/woord, bijvoorbeeld: “Wat zou je doen als je onzichtbaar werd?” Iedereen antwoordt anoniem, behalve één speler die een iets andere vraag/woord krijgt.", 
            oneDevice: { 
                title: "1 telefoon", 
                description: "Speel met 1 telefoon die wordt doorgegeven", 
                action: "Spelen" 
            }, 
            multiDevice: { 
                title: "1 telefoon per persoon", 
                description: "Maak een lobby en nodig andere spelers uit", 
                action: "Lobby maken" 
            } 
        } 
    },
    friends: {
        title: 'Vrienden',
        description: 'Speel samen, houd bij wie er wint en daag elkaar uit.',
        soon: {
            title: 'Binnenkort',
            message: 'Vriendenlijsten, uitnodigingen en onderlinge standen komen eraan. Voor nu speel je samen via een lobbycode.'
        }
    }
};
