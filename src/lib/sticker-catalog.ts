// Sticker library: emoji with search keywords, grouped by category. The sticker sheet searches the
// keywords, so "birthday" finds 🎂 and "heart" finds every heart.
export type StickerCategory = "Trending" | "Love" | "Faces" | "Celebrate" | "Animals" | "Food" | "Nature" | "Travel" | "Objects" | "Symbols";

export interface StickerItem {
  emoji: string;
  keys: string;
  cat: StickerCategory;
}

export const STICKER_CATEGORIES: StickerCategory[] = ["Trending", "Love", "Faces", "Celebrate", "Animals", "Food", "Nature", "Travel", "Objects", "Symbols"];

const RAW: [StickerCategory, string][] = [
  ["Trending", "🔥 fire hot lit|😂 laugh joy tears|😍 love eyes heart eyes|🥹 teary grateful|💯 hundred perfect score|✨ sparkles shine magic|🙌 praise hands celebrate|😎 cool sunglasses|🤩 star struck wow|🫶 heart hands love|🥰 smiling hearts adore|😭 cry sad crying|🤣 rolling laugh lol|👀 eyes look watch|🙏 pray thanks please|💀 skull dead lol|🥺 pleading puppy eyes|🤌 italian chef perfect"],
  ["Love", "❤️ red heart love|🧡 orange heart|💛 yellow heart|💚 green heart|💙 blue heart|💜 purple heart|🖤 black heart|🤍 white heart|🤎 brown heart|💖 sparkling heart|💗 growing heart|💓 beating heart|💕 two hearts|💞 revolving hearts|💘 cupid arrow|💝 gift heart|❣️ heart exclamation|💔 broken heart|💌 love letter|😘 kiss blow kiss|😻 heart eyes cat|💋 kiss lips|🌹 rose flower love|💑 couple love|💏 kiss couple"],
  ["Faces", "😀 grin smile happy|😃 smiley happy|😄 smile happy|😁 beaming grin|😆 laughing squint|😅 sweat smile relief|😉 wink|😊 blush smile|😇 angel halo|🙂 slight smile|🙃 upside down|😋 yum tongue|😛 tongue out|😜 wink tongue crazy|🤪 zany crazy|😝 squinting tongue|🤑 money face rich|🤗 hug hugging|🤭 giggle oops|🤫 shush quiet|🤔 thinking hmm|🤐 zipper mouth|😐 neutral|😑 expressionless|😶 silent|😏 smirk|😒 unamused|🙄 eye roll|😬 grimace awkward|😌 relieved calm|😴 sleep zzz|😷 mask sick|🤒 thermometer sick|🤠 cowboy|🥳 party face celebrate|🥸 disguise glasses|😈 devil|👻 ghost|💩 poop|🤡 clown|👽 alien|🤖 robot|😺 cat smile|🙈 see no evil monkey|🙉 hear no evil|🙊 speak no evil"],
  ["Celebrate", "🎉 party popper celebrate|🎊 confetti ball|🎂 birthday cake|🍰 cake dessert|🎁 gift present|🎈 balloon party|🥂 cheers champagne toast|🍾 bottle pop celebrate|🎆 fireworks|🎇 sparkler|🪅 piñata party|🎀 ribbon bow|🏆 trophy win|🥇 gold medal first|🎖️ medal|🎵 music note|🎶 music notes|🎤 microphone sing|🎧 headphones music|🎸 guitar rock|🥁 drum beat|💃 dancing woman|🕺 dancing man|🪩 disco ball|📸 camera photo|🎬 clapper movie|🌟 glowing star|⭐ star|💫 dizzy star|🎯 bullseye target"],
  ["Animals", "🐶 dog face puppy|🐱 cat face kitten|🐭 mouse|🐹 hamster|🐰 rabbit bunny|🦊 fox|🐻 bear|🐼 panda|🐨 koala|🐯 tiger|🦁 lion|🐮 cow|🐷 pig|🐸 frog|🐵 monkey|🐔 chicken|🐧 penguin|🐦 bird|🦆 duck|🦅 eagle|🦉 owl|🦋 butterfly|🐝 bee|🐞 ladybug|🐢 turtle|🐍 snake|🦖 dinosaur t-rex|🐙 octopus|🐬 dolphin|🐳 whale|🦈 shark|🐠 tropical fish|🦄 unicorn|🐴 horse|🐘 elephant|🦒 giraffe|🐕 dog|🐈 cat"],
  ["Food", "🍕 pizza|🍔 burger|🍟 fries|🌭 hot dog|🌮 taco|🌯 burrito|🍣 sushi|🍜 noodles ramen|🍝 spaghetti|🍛 curry rice|🍩 donut|🍪 cookie|🍫 chocolate|🍬 candy sweet|🍭 lollipop|🍦 ice cream|🍰 cake|🧁 cupcake|🍓 strawberry|🍒 cherries|🍑 peach|🍍 pineapple|🥭 mango|🍉 watermelon|🍇 grapes|🍎 apple|🥑 avocado|🍿 popcorn|☕ coffee tea|🧋 bubble tea boba|🍷 wine|🍺 beer|🥤 soda drink|🍹 cocktail"],
  ["Nature", "🌸 cherry blossom flower|🌹 rose|🌻 sunflower|🌷 tulip|🌼 blossom|💐 bouquet flowers|🌿 herb leaf|🍀 clover luck|🌵 cactus|🌴 palm tree|🌲 evergreen tree|🌳 tree|🍁 maple leaf autumn|🍂 fallen leaf|🌾 rice|🌈 rainbow|☀️ sun sunny|🌙 moon|⭐ star|🌤️ sun cloud|⛅ partly cloudy|☁️ cloud|🌧️ rain|⛈️ storm|❄️ snow snowflake|⛄ snowman|🔥 fire|💧 droplet water|🌊 wave ocean|🏔️ mountain snow|🌋 volcano|🌍 earth world globe|🌎 earth americas|🌏 earth asia|🌕 full moon"],
  ["Travel", "✈️ airplane travel|🚗 car|🚕 taxi|🚌 bus|🚲 bicycle|🛵 scooter|🚀 rocket space|🛸 ufo|🚁 helicopter|⛵ sailboat|🚢 ship|🏖️ beach|🏝️ island|🏕️ camping|⛰️ mountain|🗼 tokyo tower|🗽 statue liberty newyork|🗺️ map|🧭 compass|🌍 globe world|🏠 house home|🏡 home garden|🏰 castle|🕌 mosque|🛕 temple|🎡 ferris wheel|🎢 roller coaster|🎠 carousel|📍 pin location|🌃 night city|🏙️ city|🌅 sunrise|🌇 sunset city"],
  ["Objects", "📱 phone|💻 laptop|⌚ watch|📷 camera|🎮 gaming controller|🕹️ joystick|💡 idea bulb|🔦 flashlight|🔋 battery|💰 money bag|💎 gem diamond|👑 crown king queen|🎩 top hat|👒 hat|🧢 cap|👓 glasses|🕶️ sunglasses|👜 handbag|🎒 backpack|📚 books|✏️ pencil|📝 memo note|🔑 key|🔒 lock|🪄 magic wand|🧸 teddy bear|🎲 dice|🧩 puzzle|🎨 palette art|🖌️ brush|⏰ alarm clock|⌛ hourglass|🎁 gift"],
  ["Symbols", "💯 hundred|✅ check done|❌ cross no|⭕ circle|❗ exclamation|❓ question|⚠️ warning|🚫 prohibited|♻️ recycle|🔔 bell|📣 megaphone|💬 speech bubble chat|💭 thought bubble|🆕 new|🆒 cool|🆗 ok|🔝 top|🔥 hot|⚡ lightning bolt|✔️ tick|➕ plus|➖ minus|✳️ asterisk|〰️ wavy|🔴 red circle|🟠 orange circle|🟡 yellow circle|🟢 green circle|🔵 blue circle|🟣 purple circle|⚫ black circle|⚪ white circle|▶️ play|⏸️ pause|🔁 repeat|🔀 shuffle|♾️ infinity|🎵 note"],
];

export const STICKER_LIBRARY: StickerItem[] = RAW.flatMap(([cat, list]) =>
  list.split("|").map((entry) => {
    const sp = entry.indexOf(" ");
    return { emoji: entry.slice(0, sp), keys: entry.slice(sp + 1), cat };
  }),
);
