import type { LanguageCode } from "@/constants/languages";
import type { TranslationKey } from "@/features/i18n/keys";
import Feather from "@expo/vector-icons/Feather";

export const NAME_MIN_LENGTH = 4;
export const NAME_MAX_LENGTH = 16;

export type SettingKey = 'enableSounds' | 'enableMusic' | 'enableVibration';

export interface Setting {
    key: SettingKey,
    icon: keyof typeof Feather.glyphMap,
    titleKey: TranslationKey,
    descriptionKey: TranslationKey
}

export const SETTINGS: Setting[] = [
    { key: 'enableSounds',    icon: 'volume-2',   titleKey: 'profile.settings.sounds.title',    descriptionKey: 'profile.settings.sounds.description' },
    { key: 'enableMusic',     icon: 'music',      titleKey: 'profile.settings.music.title',     descriptionKey: 'profile.settings.music.description' },
    { key: 'enableVibration', icon: 'smartphone', titleKey: 'profile.settings.vibration.title', descriptionKey: 'profile.settings.vibration.description' }
];

const RANDOM_NAME_WORDS: Record<LanguageCode, string[]> = {
    nl: [
        'Banaan', 'Aardappel', 'Pannenkoek', 'Snotneus', 'Drol',
        'Kaas', 'Boterham', 'Knakworst', 'Kipnugget', 'Schoen',
        'Frikandel', 'Stofzuiger', 'Badeend', 'Tosti', 'Kroket',
        'Fietsbel', 'Sok', 'Koekje', 'Wafel', 'Appel',
        'Peer', 'Kers', 'Druif', 'Meloen', 'Ananas',
        'Kokosnoot', 'Avocado', 'Wortel', 'Komkommer', 'Pompoen',
        'Radijs', 'Champignon', 'Broccoli', 'Mais', 'Penguin',
        'Aap', 'Giraf', 'Olifant', 'Otter', 'Das',
        'Panda', 'Koala', 'Hamster', 'Egel', 'Draak',
        'Tovenaar', 'Kabouter', 'Piraat', 'Ninja', 'Robot',
        'Alien', 'Monster', 'Spook', 'Vampier', 'Bliksem',
        'Regenboog', 'Komeet', 'Meteoor', 'Zonneschijn', 'Vuurvlieg',
        'Zonnebloem', 'Paardenbloem', 'Paddenstoel', 'Kiezel', 'Rots',
        'Cactus', 'Sinaasappel', 'Mandarijn', 'Citroen', 'Tomaat',
        'Ui', 'Knoflook', 'Boon', 'Emmer', 'Hamer',
        'Potlood', 'Rugzak', 'Deken', 'Kussen', 'Matras',
        'Broodrooster', 'Waterkoker', 'Koelkast', 'Blender', 'Theepot',
        'Cupcake', 'Nugget', 'Dropje', 'Spekje', 'Lolly',
        'Kauwgom', 'Pinda', 'Walnoot', 'Pistache', 'Cashew',
        'Amandel', 'Knuffel', 'Boterkoek', 'Koffiekop', 'Paraplu',
    ],

    en: [
        'Banana', 'Potato', 'Pancake', 'Goofball', 'Dumpling',
        'Cheese', 'Noodle', 'Meatball', 'Pickle', 'Shoe',
        'Frisbee', 'Biscuit', 'Waffle', 'Muffin', 'Cookie',
        'Donut', 'Pretzel', 'Popcorn', 'Taco', 'Burrito',
        'Penguin', 'Monkey', 'Giraffe', 'Elephant', 'Otter',
        'Badger', 'Panda', 'Koala', 'Hamster', 'Hedgehog',
        'Dragon', 'Wizard', 'Goblin', 'Pirate', 'Ninja',
        'Robot', 'Alien', 'Monster', 'Ghost', 'Vampire',
        'Thunder', 'Rainbow', 'Comet', 'Meteor', 'Sunshine',
        'Firefly', 'Sunflower', 'Dandelion', 'Mushroom', 'Pebble',
        'Boulder', 'Cactus', 'Coconut', 'Pineapple', 'Avocado',
        'Carrot', 'Cucumber', 'Pumpkin', 'Radish', 'Broccoli',
        'Tomato', 'Onion', 'Garlic', 'Bean', 'Bucket',
        'Hammer', 'Pencil', 'Backpack', 'Blanket', 'Pillow',
        'Mattress', 'Toaster', 'Kettle', 'Fridge', 'Blender',
        'Teapot', 'Cupcake', 'Nugget', 'Marshmallow', 'Lollipop',
        'Gummy', 'Peanut', 'Walnut', 'Pistachio', 'Cashew',
        'Almond', 'Button', 'Slipper', 'Socks', 'Teacup',
        'Umbrella', 'Whistle', 'Broom', 'Bubble', 'Sparkle',
        'Rocket', 'Spaceship', 'Treasure', 'Jellybean', 'Muffin',
    ],
};

export function randomName(language: LanguageCode): string {
    const words = RANDOM_NAME_WORDS[language];
    const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

    return pick(words).slice(0, NAME_MAX_LENGTH);
}
