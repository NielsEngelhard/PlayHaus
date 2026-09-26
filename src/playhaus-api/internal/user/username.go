package user

import (
	"math/rand/v2"

	"playhaus-api/internal/i18n"
)

var enWords = []string{
	"Banana", "Potato", "Pancake", "Goofball", "Dumpling",
	"Cheese", "Noodle", "Meatball", "Pickle", "Shoe",
	"Rocket", "Biscuit", "Waffle", "Muffin", "Cookie",
	"Donut", "Pretzel", "Popcorn", "Taco", "Burrito",
	"Penguin", "Monkey", "Giraffe", "Elephant", "Otter",
	"Badger", "Panda", "Koala", "Hamster", "Hedgehog",
	"Dragon", "Wizard", "Goblin", "Pirate", "Ninja",
	"Robot", "Alien", "Monster", "Ghost", "Vampire",
	"Thunder", "Rainbow", "Comet", "Meteor", "Sunshine",
	"Bubble", "Rocket", "Sparkle", "Shadow", "Breeze",
	"Button", "Bucket", "Hammer", "Pencil", "Backpack",
	"Socks", "Slipper", "Blanket", "Pillow", "Mattress",
	"Toaster", "Vacuum", "Kettle", "Fridge", "Blender",
	"Teapot", "Cupcake", "Nugget", "Cracker", "Marshmallow",
	"Jellybean", "Lollipop", "Caramel", "Gummy", "Sprinkle",
	"Peanut", "Walnut", "Pistachio", "Cashew", "Almond",
	"Thunderbolt", "Firefly", "Sunflower", "Dandelion", "Mushroom",
	"Pebble", "Boulder", "Cactus", "Coconut", "Pineapple",
	"Avocado", "Broccoli", "Carrot", "Pickle", "Pumpkin",
	"Turnip", "Radish", "Corn", "Bean", "Potato",
}

// --- Dutch -----------------------------------------------------------

var nlWords = []string{
	"Banaan", "Aardappel", "Pannenkoek", "Snotneus", "Aardbei",
	"Kaas", "Boterham", "Knakworst", "Kipnugget", "Schoen",
	"Frikandel", "Stofzuiger", "Badeend", "Tosti", "Kroket",
	"Fietsbel", "Sok", "Pannenkoek", "Koekje", "Wafel",
	"Appel", "Peer", "Kers", "Druif", "Meloen",
	"Ananas", "Kokosnoot", "Avocado", "Wortel", "Komkommer",
	"Pompoen", "Radijs", "Champignon", "Broccoli", "Maïs",
	"Penguin", "Aap", "Giraf", "Olifant", "Otter",
	"Das", "Panda", "Koala", "Hamster", "Egel",
	"Draak", "Tovenaar", "Kabouter", "Piraat", "Ninja",
	"Robot", "Alien", "Monster", "Spook", "Vampier",
	"Bliksem", "Regenboog", "Komeet", "Meteoor", "Zonneschijn",
	"Bel", "Emmer", "Hamer", "Potlood", "Rugzak",
	"Deken", "Kussen", "Matras", "Broodrooster", "Waterkoker",
	"Koelkast", "Blender", "Theepot", "Cupcake", "Nugget",
	"Knackworst", "Dropje", "Spekje", "Lolly", "Kauwgom",
	"Pinda", "Walnoot", "Pistache", "Cashew", "Amandel",
	"Vuurvlieg", "Zonnebloem", "Paardenbloem", "Paddenstoel", "Kiezel",
	"Rots", "Cactus", "Sinaasappel", "Mandarijn", "Citroen",
	"Tomaat", "Ui", "Knoflook", "Boon", "Mais",
}

var wordLists = map[i18n.Locale][]string{
	i18n.EN: enWords,
	i18n.NL: nlWords,
}

func generateUsername(locale i18n.Locale) string {
	words := wordLists[locale]

	return words[rand.IntN(len(words))]
}
