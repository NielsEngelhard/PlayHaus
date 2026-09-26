# Roadmap items
- Payments
- Statistics per account
- statistics per games played total of the whole app 
- insights for friends (see other peoples profile)
- PUSH NOTIFICATION wanneer iemand je invite voor een game. Dan hoef je alleen op de push notification te drukken en klaar.
- push notifications? (word of the day & when new quiz is live?)
- marketing? (bierfiltjes, reclames, stickers, promo codes?)
- one of us meer rollen
- Alle games zouden een tv/chromecast mode moeten ondersteunen. Maakt het soms wel leuker.
- more music and sounds

# Voor v1
- quizer multi device afronden
- quizer op tv testen

# Double checks voordat echt app
I made this project with a react native frontend and a GO backend. I host the web version of the frontend on a digital ocean droplet and the backend too. See the /deployment folder for the hosting setup.

It is hosted on a digital ocean droplet that is 6 dollars. So not too heavy, but the app should be lightweight.

I want to publish the apps to the app store and play store soon, but I want you to investigate if it is production ready. Do you see any critical issues that need fixing before I would say it is production ready?

Also, I am wondering, how many users that are playing at the same time can the app handle with the current setup? How should I scale when the load becomes too heavy and where will the bottlenecks be if that happens? Where are the places that receive the most intense load that might lead to issues when I have many users playing the games.

How many concurrent users should I be able to handle with the current setup?

Investigate and tell me please.