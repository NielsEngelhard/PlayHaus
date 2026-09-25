I want to make changes regarding the quizzer game. When playing with 1 phone, the game is perfect and exactly working how it should. When playing with multiple phones it is not yet.

When playing with multiple phones (1 phone per player) you play with your phone as the controller, so not 1 phone that is going around. When playing in multi device mode you have 2 options:
- Play with a central host screen. All players dont see the question on their phone. Their phone is only for submitting answers as quizmaster or as quiz 
- Play with 1 device per player. Each player sees the question always on their screen.

In both game modes the host decides to go to the next round in between rounds.

This is what each round should look like for multi device mode per game mode:

In multi device (without host screen) you always see at the top of the screen who is the quiz master and what the turn order is for this turn.
In host screen mode you always see on the screen:
- Who is quiz master;
- At the top all players and their avatar, name and score;
- Who has the current turn (if applicable). 
- At the bottom of the screen a small explanation of what the current rounds rules are;
- in the center the content of the current round you are playing.

You can make a base component for this (wrapper tsx component) because the layout is the same for all rounds in central screen mode. Only the slot is different (content of the current round and turn).

The rules of both game modes regarding rounds and turn order etc. are the same as 1 device mode. It is just played with multiple devices and optionally a central host screen for more fun.

Host screen mode is for when you want to use a bigger screen with multiple people around it so it feels more like a party. Everyone should look at that screen and only use their phone to submit answers or for the quizmaster to submit who had the correct answer.

# Round 1

## Multi device
Everyone sees the question on their phone. Everyone sees who has the first guess of the round and who second etc. The quiz master has to determine who has the correct answer and when submitted proceed.

## Host screen
The question is displayed on the TV. The quizmaster of this turn can submit who had it correct (or no one);
Players that are not quiz master see a message like "Look at the central screen for the question. X is quiz master;

# Round 2

## Multi device
Everyone sees the question on their phone. Everyone sees each option on their phone. There is no quizmaster in the whole of round 2, because the person who's turn it is can click the option (A, B, C or D) themselves because everyone has their own phone. When it is not your turn you see some sort of indicator showing who currently has to submit their answer. If correct you see it is guessed by who and what the correct answer was. The host of the game can then click next turn to proceed.

## Host screen
The question is displayed on the TV. The options too. Ther is no quizmaster this whole round, because the person who's turn it is can click the option (A, B, C or D) themselves because everyone has their own phone.

Players that are not quiz master see a message like "Look at the central screen for the question. X has the current turn;

# Round 3

## Multi device
Everyone sees the question on their phone. Everyone can submit one number (duplicates allowed in multi device mode, in single mode this is not allowed) and if everyone submitted the answer is revealed on all phones for this turn and also all guesses and who won this round (can be multiple people if their guess is the closest). The host can click on next question to proceed. 

## Host screen
The question is displayed on the TV. You see all player avatars and names on the screen and if someone submitted an answer that "person card" becomes green marking that they submitted their answer. When everyone submitted their answer the real answer is revealed and the result of the round who won. The host of the game can click on a button the proceed to go to the next question (or round);

# Round 4

## Multi device
Starts with an explainer on all screens. Then the person who is quizmaster this turn has to press "Start" to start. The person guessing has to also click "I am ready" before the turn starts and the quizmaster sees the words.

## Host screen
Starts with an explainer on screen for this round. Host can click continue on his screen. Then when starting the quizmaster sees the words only on his device and the person guessing sees "you have to guess, {playerName} will describe and you guess this round". On the host screen you dont see the words never because other players can get a bonus guess afterwards too. Only at the end when everyone is asked you see all words as a recap and the host can click continue for going to the next turn.

# Round 5

## Multi device
First everyone sees an explainer on their phone. Then if everyone pressed "I understand" the rounds begins. Everyone sees the question on their phone and after 4 seconds the timer (visible on all phones) start counting. The quiz master has to (just like in single device mode) determine who has the correct answer and when submitted proceed.


## Host screen
First everyone sees an explainer on the host screen. Then the host of the game can press "Start" so the rounds begins. Everyone sees the question on host screen and after 4 seconds the timer (visible on all phones) start counting and the person who's turn it is has to quiz. The quiz master has to (just like in single device mode) determine who has the correct answer and when submitted proceed.

# Round 6

## Multi device
The person who's turn it is to guess sees an option "easy or hard question". All other players see "{playerName} has to pick an easy or hard question on their device". After clicking the option question is being showed (on all devices) and the quiz master can (just like in round 1) determine who had the correct answer;

## Host screen
The person who's turn it is to guess sees an option "easy or hard question". The central host screen shows "{playerName} has to pick an easy or hard question on their device". After clicking the option question is being showed (on the host screen) and the quiz master can (just like in round 1) determine who had the correct answer;

# Round 7
After round 6 is DONE you see the scoreboard (just like in single device mode). Then it shows which 2 players will compete in the finale and who is the quiz master.

## Multi device
Same as round 1 regarding rules but then between 2 persons instead of with all.

## Host screen
Same as round 1 regarding rules but then between 2 persons instead of with all.
-----------------------------------
I want you to make the designs for the quizer game when playing multiplayer. Multiplayer knows 2 game modes. Multi-device and host mode. I made an explanation of both modes below here for reference. You should design for each round the screen the players see (or the host screen shows). It should look a lot like the single device game and a lot of UI components should be reused to make it consistent regarding design and feeling.

For the multi device (without host screen) there is already a base setup but it does not look nice yet and it always assumes there is a home screen. The descriptions of each round that I typed in the description of the game are leading.

Here is the description of the game when playing multiplayer:
"
X
"



