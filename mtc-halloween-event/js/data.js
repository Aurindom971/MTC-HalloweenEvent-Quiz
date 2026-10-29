/* =========================================================
   WHEEL OF CURSES — game content
   Edit freely: every character needs a unique `id` and
   problems array. UI curses and twists can be any length.

   Problems are deliberately SMALL: one page, one main feature.
   `spin` is what the character says when it spins a wheel for
   the team; `idle` is what it says when it gets impatient.
   ========================================================= */

window.CURSE_DATA = {
  // Minutes between the UI-curse spin and the twist wheel unlocking.
  twistDelayMinutes: 15,

  // Seconds a team can stare at a wheel before a spirit spins it for them.
  idleSpinSeconds: 60,

  // Who spins the first wheel (before the team has a soul).
  keeper: {
    name: "The Eye", glyph: "👁️", color: "#ff7a1a",
    spin: "Let me look… let me CHOOSE.",
    idle: "Too slow, mortal. I'll choose for you…"
  },

  // Shown on every curse card.
  scopeNote: "Keep it small: one page, one main feature.",

  // Fingerprint of the SECRET TEAM NAME that opens the judges' board instead
  // of registering a team. The phrase itself is never stored in the code.
  judgeKey: "h0cgcvlf4s",

  // Fingerprint of the HOST WORD.
  hostKey: "1k65q6pmu75",

  // Easter eggs and hidden pumpkins
  eggsEnabled: false,
  eggs: {
    gate:     "A pumpkin at the crypt door",
    seals:    "A pumpkin between the seals",
    whisper:  "A pumpkin in the wheel's whisper",
    grimoire: "A pumpkin in the grimoire",
    footer:   "A pumpkin in the footer",
    card:     "A pumpkin on a fate card",
    moon:     "Poked the moon three times",
    konami:   "Raised the blood moon",
    source:   "Read the source and spoke the word"
  },

  // Shadow-figure art: CC0 silhouettes from openclipart.org, in assets/figures/.
  shadowFigures: {
    ground: [
      { name: "nosferatu-reach", src: "assets/figures/nosferatu-reach.svg" },
      { name: "nosferatu-stand", src: "assets/figures/nosferatu-stand.svg" },
      { name: "zombie-shambler", src: "assets/figures/zombie-shambler.svg" },
      { name: "contorted",       src: "assets/figures/contorted.png" },
      { name: "zombie-horde",    src: "assets/figures/zombie-horde.svg", scale: 1.15 },
      { name: "crawler",         src: "assets/figures/crawler.png", scale: 0.45 }
    ],
    sky: [
      { name: "reaper", src: "assets/figures/reaper.svg" }
    ]
  },

  // The face that hits a couple of seconds after "Enter the Crypt".
  // Any portrait picture on a dark background works; swap the file to change it.
  welcomeScare: "assets/scares/face.jpg",

  // The jump scare each character gives when a team lands on them (Wheel I).
  //   video: path to the character's cinematic jumpscare MP4
  //   line:  the creepy line shown as it lunges
  //   sound: scream | groan | laugh | hiss | theremin
  characterScares: {
    "voldemort":   { video: "soul jumpscares/VOLDEMORT.mp4", sound: "scream", line: "There is only power… and those too weak to seek it." },
    "stree":       { video: "soul jumpscares/STREE.mp4", sound: "hiss", line: "O Stree, kal aana… par aaj raat yahan sirf mera raaj hai." },
    "wednesday":   { video: "soul jumpscares/WEDNESDAY.mp4", sound: "whisper", line: "I find social interaction exhausting. Don't look behind you." },
    "pennywise":   { video: "soul jumpscares/PENNYWISE.mp4", sound: "laugh", line: "You will float down here… we all float down here!" },
    "annabelle":   { video: "soul jumpscares/ANNABELLE.mp4", sound: "groan", line: "Did you miss me? The glass is breaking…" },
    "manjulika":   { video: "soul jumpscares/MONJULIKA.mp4", sound: "scream", line: "Ami je tomar… shudho je tomar… Mukti chai!" },
    "valak":       { video: "soul jumpscares/VALAK.mp4", sound: "scream", line: "Forgive me father, for I have possessed your darkest prayers." },
    "thanos":      { video: "soul jumpscares/VALAK.mp4", sound: "scream", line: "Forgive me father, for I have possessed your darkest prayers." },
    "kirmada":     { video: "soul jumpscares/KIRMADA.mp4", sound: "laugh", line: "The spell is already cast. You just haven't felt it yet." },
    "spiderman":   { video: "soul jumpscares/SPIDERMAN.mp4", sound: "hiss", line: "Your spider-sense is screaming. Don't look up." },
    "deadpool":    { video: "soul jumpscares/DEADPOOL.mp4", sound: "laugh", line: "Hey, you. Yeah, you reading this. Don't turn around." }
  },

  characters: [
    {
      id: "voldemort",
      name: "Lord Voldemort",
      short: "Voldemort",
      glyph: "🐍",
      color: "#1b4332",
      avatar: "assets/characters/voldemort.jpg",
      archetype: "Dark Lord & Horcrux Sovereign",
      quote: "There is no good and evil, there is only power… and those too weak to seek it.",
      brief: "Obsessed with digital immortality and fragmented souls. Build a Horcrux-tracking command dashboard, a dark-arts academy with spell lessons and quizzes, or a damage-control campaign to rescue his ruined reputation.",
      lore: "He Who Must Not Be Named. Master of the Dark Arts, obsessed with immortality and supreme dominion.",
      spin: "There is no good and evil, there is only power… and those too weak to seek it. SPIN!",
      idle: "Avada Kedavra awaits those who waste the Dark Lord's time…",
      problems: [
        { t: "The Horcrux Hunt", d: "Voldemort has hidden his Horcruxes across different locations but has lost track of them. Build a secure-looking artifact management dashboard to track locations, status, clues, and recovery progress." },
        { t: "The Dark Arts Academy", d: "Young witches and wizards interested in dark magic have no central place to learn fictional spells and magical history. Build an interactive magical learning portal with lessons, quizzes, and progress tracking." },
        { t: "The Dark Lord's Reputation Crisis", d: "Nobody trusts Voldemort after his past actions. Build a fictional reputation-management website featuring public statements, community feedback, and a redemption campaign." }
      ]
    },
    {
      id: "stree",
      name: "Stree",
      short: "Stree",
      glyph: "🏮",
      color: "#c1121f",
      avatar: "assets/characters/stree.jpg",
      archetype: "Vengeful Chanderi Spirit & Night Sovereign",
      quote: "O Stree, kal aana… par aaj raat yahan sirf mera raaj hai.",
      brief: "Nocturnal spirit of Chanderi demanding respect. Build a live sighting-alert network with incident pins, a searchable folklore archive of Chanderi's legends, or a night-survival guide with safe routes and SOS contacts.",
      lore: "The mysterious spirit of Chanderi who visits on festive nights. 'O Stree, kal aana.'",
      spin: "Purushon ke sheher mein Stree ka raaj hai… Ghumaao pahiya!",
      idle: "Raat gehri ho rahi hai… Jaldi karo, warna main aa rahi hoon.",
      problems: [
        { t: "O Stree, Kal Aana!", d: "Chanderi's residents struggle to keep track of mysterious disappearances and supernatural sightings. Build a fictional town-alert portal with incident reports, location pins, warnings, and a timeline of events." },
        { t: "The Legend of Chanderi", d: "The town's supernatural history exists only in scattered rumours and old stories. Build an interactive folklore archive featuring local legends, hidden clues, character histories, and a searchable story map." },
        { t: "The Haunted Night Guide", d: "Visitors arriving in Chanderi do not know which places are safe to visit or where to find help during a paranormal incident. Build a themed visitor guide with location information, local alerts, emergency contacts, and guided routes." }
      ]
    },
    {
      id: "wednesday",
      name: "Wednesday Addams",
      short: "Wednesday",
      glyph: "🕷️",
      color: "#2b2d42",
      avatar: "assets/characters/wednesday.jpg",
      archetype: "Nevermore Outcast & Morbid Sleuth",
      quote: "I find social interaction exhausting, but this wheel is mildly amusing.",
      brief: "Brilliant, deadpan outcast prodigy of Nevermore. Build a case-file system with evidence boards and suspect profiles, a social network for outcast students, or a gothic investigative newspaper.",
      lore: "Gothic outcast prodigy of Nevermore Academy. Unflinching, morbidly sharp, and immune to fear.",
      spin: "I find social interaction exhausting, but this wheel is mildly amusing. Spin.",
      idle: "If you hesitate for another ten seconds, I will test my guillotine on your keyboard.",
      problems: [
        { t: "Nevermore Mystery Files", d: "Students cannot organise clues and collaborate on strange cases around Nevermore Academy. Build a detective portal with evidence boards, suspect profiles, case timelines, and investigation progress." },
        { t: "The Outcast Community", d: "Supernatural students struggle to find people who understand their unusual identities and interests. Build an inclusive social platform with profiles, interest-based groups, events, and community discussions." },
        { t: "The Gothic Gazette", d: "Wednesday wants to publish investigative stories, but Nevermore lacks a proper digital newspaper. Build a dark editorial website with articles, categories, author profiles, and reader submissions." }
      ]
    },
    {
      id: "pennywise",
      name: "Pennywise",
      short: "Pennywise",
      glyph: "🎈",
      color: "#e63946",
      avatar: "assets/characters/pennywise.jpg",
      archetype: "Cosmic Terror & Dancing Clown",
      quote: "You will float down here… we all float down here!",
      brief: "Ancient terror lurking beneath Derry's streets. Build an incident tracker that maps Derry's mysteries, a crowd-sourced archive of people's deepest fears, or a carnival booking site with a sinister countdown.",
      lore: "The Dancing Clown of Derry. An ancient cosmic entity that feeds on terror from the storm drains.",
      spin: "You'll float down here… we all float down here! SPIN, hahahaha!",
      idle: "Don't you want a balloon, Georgie? Spin before I feast on your fear!",
      problems: [
        { t: "Welcome to Derry", d: "Derry's residents cannot report or connect patterns between mysterious incidents happening around town. Build a fictional incident-tracking website with a town map, case reports, timelines, and searchable clues." },
        { t: "The Fear Archive", d: "Pennywise wants to catalogue people's deepest fears, but the stories are scattered everywhere. Build an interactive fear-story platform with categories, anonymous submissions, and personalised collections." },
        { t: "The Haunted Carnival", d: "Pennywise's mysterious carnival has confusing attractions, bookings, and visitor schedules. Build an eerie carnival website with attraction listings, ticket booking, interactive maps, and a spooky countdown." }
      ]
    },
    {
      id: "annabelle",
      name: "Annabelle",
      short: "Annabelle",
      glyph: "🪆",
      color: "#8b263e",
      avatar: "assets/characters/annabelle.jpg",
      archetype: "Cursed Conduit & Occult Vessel",
      quote: "Did you miss me? The glass cannot hold what was never alive.",
      brief: "Malevolent spirit tethered to a vintage porcelain doll. Build a cursed-object registry with danger levels, a paranormal evidence vault for photos and recordings, or a live containment dashboard with breach alerts.",
      lore: "The cursed porcelain conduit locked in the Warrens' occult museum. Positively do not open.",
      spin: "Miss me? The glass is breaking… SPIN!",
      idle: "The doll moved… and it's staring directly at your trembling fingers.",
      problems: [
        { t: "The Haunted Object Registry", d: "Paranormal investigators cannot keep track of cursed objects and their histories. Build a searchable registry with object profiles, danger levels, containment status, and incident records." },
        { t: "The Warren Evidence Vault", d: "Investigators have hundreds of paranormal photos, recordings, and case notes scattered across devices. Build an evidence-management portal with uploads, tags, timelines, and searchable case files." },
        { t: "The Containment Breach", d: "A supernatural museum keeps losing track of its sealed artifacts and inspection schedules. Build a live-style containment dashboard with warning alerts, room status, inspection logs, and emergency procedures." }
      ]
    },
    {
      id: "manjulika",
      name: "Manjulika",
      short: "Manjulika",
      glyph: "💃",
      color: "#b7094c",
      avatar: "assets/characters/manjulika.jpg",
      archetype: "Royal Haveli Spectre & Court Dancer",
      quote: "Ami je tomar… shudho je tomar… Mukti chai!",
      brief: "Wronged royal dancer locked in the haveli chamber. Build a virtual haveli tour full of secret passages, a digital archive of her lost dance legacy, or a diary-driven story that finally tells her side.",
      lore: "The vengeful court dancer locked in the third-floor haveli bedroom. 'Ami Je Tomar.'",
      spin: "Ami je tomar shudho je tomar… Ghungroo baandh ke ghumaao pahiya!",
      idle: "Darwaaza khul chuka hai… Agle chaar phero tak ghoom jaa!",
      problems: [
        { t: "The Mystery of the Haunted Palace", d: "Visitors cannot navigate Manjulika's enormous palace or understand its hidden history. Build an interactive virtual palace tour featuring rooms, clues, secret passages, and a mystery-solving experience." },
        { t: "The Lost Dance Legacy", d: "Manjulika's classical dance performances and cultural history are disappearing from public memory. Build a digital archive featuring performance galleries, music, stories, and a searchable collection." },
        { t: "The Unheard Spirit", d: "Everyone knows the rumours about Manjulika, but nobody knows her side of the story. Build an interactive storytelling website that lets visitors uncover her past through diary entries, timelines, and evidence." }
      ]
    },
    {
      id: "valak",
      name: "Valak (The Nun)",
      short: "Valak",
      glyph: "✝️",
      color: "#2a0845",
      avatar: "assets/characters/valak.jpg",
      face: "assets/characters/valak-face.jpg",
      archetype: "The Defiler Demon & Unholy Abbess",
      quote: "Forgive me father, for I have possessed your darkest prayers.",
      brief: "Blasphemous demon haunting consecrated cloisters. Build an interactive haunted monastery floor map, a searchable forbidden archive of cursed artefacts, or an exorcism emergency response network.",
      lore: "The Marquis of Snakes. A demonic entity masquerading in sacred vestments, haunting Romanian abbeys.",
      spin: "The shadow of the cloister falls upon your fate. Spin into darkness.",
      idle: "Pray as you will, mortal… your hesitation only feeds the defiler.",
      problems: [
        { t: "The Haunted Monastery", d: "Visitors keep getting lost inside Valak’s cursed monastery. Build an interactive website with a floor map, hidden clues, and danger alerts." },
        { t: "The Forbidden Archives", d: "Ancient records about demons and cursed artefacts are scattered across forgotten libraries. Build a searchable supernatural archive with case files, artefact profiles, and clues." },
        { t: "The Exorcism Emergency Network", d: "Paranormal investigators struggle to coordinate investigations and track supernatural incidents. Build a dashboard with incident reports, investigator profiles, and case status tracking." }
      ]
    },
    {
      id: "kirmada",
      name: "Kirmada",
      short: "Kirmada",
      glyph: "🔮",
      color: "#0f766e",
      avatar: "assets/characters/kirmada.jpg",
      archetype: "Dark Sorcerer & Keeper of Forbidden Spells",
      quote: "Every spell has a price. Today, you pay it.",
      brief: "Dark sorcerer with a hoard of spells and cursed artifacts. Build a searchable grimoire of spells and ingredients, a help portal for the kingdom under his curse, or a map-based quest to recover his lost artifacts.",
      lore: "A dark sorcerer whose spells have cursed a kingdom and whose artifacts lie scattered across mysterious lands.",
      spin: "The runes are burning… Kirmada commands the wheel. SPIN!",
      idle: "My patience is a spell that is wearing off. Spin, before I cast the next one.",
      problems: [
        { t: "The Dark Magic Grimoire", d: "Kirmada has accumulated hundreds of spells but cannot organise their ingredients, effects, and magical requirements. Build a searchable digital spellbook with categories, spell details, and bookmarked favourites." },
        { t: "The Kingdom Under a Curse", d: "A fictional kingdom is suffering from magical disasters, and its citizens cannot report problems or receive updates. Build a kingdom-help portal with incident reports, village status, announcements, and restoration progress." },
        { t: "The Lost Magical Artifacts", d: "Kirmada's powerful artifacts have been scattered across mysterious locations. Build an artifact-discovery platform with maps, clues, collection status, and interactive quests." }
      ]
    },
    {
      id: "spiderman",
      name: "Spider-Man",
      short: "Spider-Man",
      glyph: "🕸️",
      color: "#1d4ed8",
      avatar: "assets/characters/spiderman.jpg",
      archetype: "Friendly Neighbourhood Web-Slinger",
      quote: "With great power comes great responsibility… and a lot of requests for help.",
      brief: "New York's overworked web-slinger. Build a neighbourhood SOS site for local problems, a mission board that ranks calls by urgency, or a fact-check site that sorts real news about him from rumours.",
      lore: "Your friendly neighbourhood Spider-Man. Swinging through New York, juggling a thousand calls for help and a newspaper that hates him.",
      spin: "My spider-sense is tingling… THWIP! Spin it!",
      idle: "Uh, guys? Half of Queens is on fire. Can we spin already?",
      problems: [
        { t: "Friendly Neighbourhood SOS", d: "New York residents struggle to report local problems and find nearby community assistance. Build a neighbourhood-help website with issue reporting, location-based listings, status updates, and community resources." },
        { t: "The Web-Slinger's Mission Board", d: "Spider-Man receives too many requests for help and cannot prioritise them efficiently. Build a mission dashboard with urgency levels, task status, location details, and a map of fictional incidents." },
        { t: "Spider-Man: Fact or Rumour?", d: "The local newspaper keeps printing conflicting stories about Spider-Man, and readers cannot tell facts from rumours. Build an interactive fact-checking and news website with evidence links, article comparisons, and community submissions." }
      ]
    },
    {
      id: "deadpool",
      name: "Deadpool",
      short: "Deadpool",
      glyph: "⚔️",
      color: "#9d0208",
      avatar: "assets/characters/deadpool.jpg",
      archetype: "Merc with a Mouth & Fourth-Wall Breaker",
      quote: "Maximum effort! Also, yes, I know I'm on a wheel.",
      brief: "Chaotic mercenary who knows he's in a game. Build a job board for his messy mercenary gigs, a fan club with polls, memes and leaderboards, or a superhero complaint desk with hilariously unhelpful auto-replies.",
      lore: "The Merc with a Mouth. An unkillable mercenary who talks to the audience, loses track of every job, and never stops joking.",
      spin: "Maximum effort! Hey, you, reading this — watch me spin!",
      idle: "Hello? Narrator? The team fell asleep. Fine, I'll do it myself.",
      problems: [
        { t: "The Mercenary Job Board", d: "Deadpool receives job requests through random messages and keeps losing track of his assignments. Build a quirky freelance mission platform with job listings, deadlines, budgets, and completion status." },
        { t: "The Fourth-Wall Fan Club", d: "Deadpool's fans have no central place to share memes, vote on favourite moments, and join challenges. Build an interactive fan community with polls, meme galleries, leaderboards, and user submissions." },
        { t: "The Superhero Complaint Department", d: "Superheroes keep complaining about damaged buildings, missed payments, and chaotic missions, but nobody tracks the complaints. Build a humorous complaint-management website with ticket creation, priority labels, status tracking, and funny automated responses." }
      ]
    }
  ],

  // Wheel 3 — 20 Authentic UI Hexes from ui_ideas/
  uiCurses: [
    {
      id: "cyberpunk-cemetery",
      t: "Cyberpunk Cemetery",
      glyph: "⚡",
      d: "Neon purple, toxic green, glowing gravestones and futuristic haunted interfaces.",
      mustHave: "Neon glow effects and a futuristic navigation bar."
    },
    {
      id: "haunted-glass",
      t: "Haunted Glass",
      glyph: "🪞",
      d: "Frosted-glass panels floating over a foggy haunted mansion, with translucent purple and orange accents.",
      mustHave: "Two glass-effect panels (backdrop-filter: blur()) and blurred backgrounds."
    },
    {
      id: "monster-brutalism",
      t: "Monster Brutalism",
      glyph: "🧱",
      d: "Oversized typography, chunky borders, jagged layouts and aggressive orange-black contrasts.",
      mustHave: "Bold borders, hard shadows, and oversized headings."
    },
    {
      id: "neon-witchcraft",
      t: "Neon Witchcraft",
      glyph: "🧪",
      d: "Acid slime green, arcane runes, glowing potion vials and dark apothecary accents.",
      mustHave: "Arcane glowing badges and an interactive potion/toggle control."
    },
    {
      id: "vampire-royalty",
      t: "Vampire Royalty",
      glyph: "👑",
      d: "Regal gothic typography, deep burgundy, black velvet textures and antique gold details.",
      mustHave: "An elegant hero section and luxurious content cards."
    },
    {
      id: "minimal-nightmare",
      t: "Minimal Nightmare",
      glyph: "◽",
      d: "Clean layouts, eerie whitespace, tiny unsettling details and restrained black-and-white visuals.",
      mustHave: "Minimal navigation and one striking spooky visual element."
    },
    {
      id: "8-bit-graveyard",
      t: "8-Bit Graveyard",
      glyph: "👾",
      d: "Pixel-art ghosts, retro arcade typography, blocky buttons and haunted-game aesthetics.",
      mustHave: "Pixel-style buttons and a game-inspired status element."
    },
    {
      id: "phantom-hologram",
      t: "Phantom Hologram",
      glyph: "💠",
      d: "Holographic ghosts, iridescent surfaces, spectral gradients and futuristic supernatural dashboards.",
      mustHave: "Holographic accents and layered semi-translucent panels."
    },
    {
      id: "victorian-haunting",
      t: "Victorian Haunting",
      glyph: "🏛️",
      d: "Symmetrical grids, Victorian ornamentation, antique typography and haunted-estate aesthetics.",
      mustHave: "Structured alignment and vintage decorative elements/borders."
    },
    {
      id: "monster-control-room",
      t: "Monster Control Room",
      glyph: "🎛️",
      d: "A modular dashboard for tracking curses, creatures, haunted locations or supernatural activity.",
      mustHave: "Four or more information cards arranged in a bento grid."
    },
    {
      id: "the-third-dimension",
      t: "The Third Dimension",
      glyph: "🧊",
      d: "Floating skulls, dimensional portals, perspective layers and immersive depth effects.",
      mustHave: "At least one convincing depth or perspective effect (CSS 3D / parallax)."
    },
    {
      id: "digital-possession",
      t: "Digital Possession",
      glyph: "📟",
      d: "Corrupted text, broken-system warnings, scanlines and controlled digital distortion.",
      mustHave: "A glitch effect while keeping essential content readable."
    },
    {
      id: "the-evidence-wall",
      t: "The Evidence Wall",
      glyph: "📌",
      d: "Torn-paper textures, crime-scene clues, pinned photographs, handwritten notes and red string.",
      mustHave: "Layered collage elements and a clue-board section."
    },
    {
      id: "nightmare-editorial",
      t: "Nightmare Editorial",
      glyph: "📰",
      d: "Oversized headlines, off-center images, dramatic asymmetry and unsettling magazine-style layouts.",
      mustHave: "An asymmetric hero section with clear visual hierarchy."
    },
    {
      id: "midnight-noir",
      t: "Midnight Noir",
      glyph: "🎬",
      d: "Monochrome imagery, cinematic shadows, grain textures and high-contrast typography.",
      mustHave: "A strictly grayscale palette and dramatic visual hierarchy."
    },
    {
      id: "the-cursed-grimoire",
      t: "The Cursed Grimoire",
      glyph: "📜",
      d: "Aged parchment, spellbook typography, occult symbols, ink illustrations and wax seals.",
      mustHave: "A parchment-style panel and antique navigation details."
    },
    {
      id: "softly-possessed",
      t: "Softly Possessed",
      glyph: "🔘",
      d: "Softly embossed controls, recessed panels, rounded surfaces and subtle shadows in spooky colors.",
      mustHave: "A raised button and an inset panel with readable contrast (Neumorphism)."
    },
    {
      id: "chaos-unleashed",
      t: "Chaos Unleashed",
      glyph: "💥",
      d: "A maximalist explosion of bats, stickers, patterns, layered colors and chaotic typography.",
      mustHave: "Three or more visual layers without sacrificing navigation."
    },
    {
      id: "the-haunted-movie",
      t: "The Haunted Movie",
      glyph: "🎞️",
      d: "A cinematic, scroll-driven story with dramatic full-screen sections and atmospheric transitions.",
      mustHave: "Three connected story sections with at least one scroll-based effect."
    },
    {
      id: "y2k-afterlife",
      t: "Y2K Afterlife",
      glyph: "💿",
      d: "Metallic chrome text, glossy buttons, retro-futuristic shapes and a haunted early-internet aesthetic.",
      mustHave: "Metallic or glossy elements and distinctive futuristic navigation."
    }
  ],

  // Wheel 4 — the twist. {char} becomes the character's short name.
  // {randomChar} and {randomCurse} are filled in when the twist is drawn.
  twists: [
    { t: "Jump Scare", glyph: "😱", d: "Your site must contain a jump scare that triggers at an unexpected moment." },
    { t: "The Runaway Button", glyph: "🏃", d: "Your most important button must run away from the cursor (it still has to be clickable eventually)." },
    { t: "An Uninvited Guest", glyph: "🚪", d: "{randomChar} has barged in with the same problem. Your site must now help {char} AND {randomChar}." },
    { t: "It Got Worse", glyph: "📈", d: "{char}'s problem now happens twice as often. Add an urgent 'emergency mode' to your site." },
    { t: "Midnight Is Coming", glyph: "🕛", d: "Add a live countdown to midnight that is visible somewhere on your page." },
    { t: "Possession", glyph: "😈", d: "Add a 'possessed' toggle that completely transforms the look of your site." },
    { t: "Secret Passage", glyph: "🗝️", d: "Hide an easter egg in your site that only appears through a secret action (a code, a click pattern…)." },
    { t: "The Sun Rises", glyph: "☀️", d: "Your site must now have a daylight (light) mode — and it still has to feel spooky." },
    { t: "Haunted Cursor", glyph: "🖱️", d: "Replace the default cursor with a custom one that fits {char}." },
    { t: "Glitch in the Crypt", glyph: "📺", d: "Text must glitch, flicker or distort when hovered or tapped." },
    { t: "The Séance", glyph: "🔔", d: "At least one interaction on your site must play a sound effect." },
    { t: "Ghost Language", glyph: "👁️", d: "One section must have a toggle that translates it into a made-up ghost language and back." },
    { t: "Summoning Ritual", glyph: "🕯️", d: "Add a loading screen that 'summons' your site before it appears." },
    { t: "Lost a Limb", glyph: "🦴", d: "Delete your navigation bar. Visitors must still be able to get everywhere." },
    { t: "Idle Haunting", glyph: "⏳", d: "If the visitor does nothing for 10 seconds, something creepy must happen." },
    { t: "The Curse Spreads", glyph: "🩸", d: "You've been hit by a second UI curse: \"{randomCurse}\". Apply it on top of your first one." }
  ],

  // Compulsory Second Twist for all teams — The Alliance Protocol
  sponsorTwist: {
    id: "alliance",
    title: "The Alliance Protocol",
    sponsor: "KAPIDHWAJ",
    glyph: "🌀",
    logo: "assets/sponsor/kapidhwaj.png",
    instagramHandle: "@kapidhwaj.innovations",
    instagramUrl: "https://www.instagram.com/kapidhwaj.innovations/",
    shortDesc: "Compulsory Sponsor Twist: Creatively integrate the official Kapidhwaj Instagram page into your character's world, problem statement, and UI aesthetic.",
    rules: [
      "The official Kapidhwaj Instagram account (@kapidhwaj.innovations) must be clearly featured.",
      "Include a clickable link to the official Instagram page (https://www.instagram.com/kapidhwaj.innovations/).",
      "The integration must visually match your website's theme and character aesthetic.",
      "It must feel intentional and creative — not like an unrelated advertisement."
    ],
    ideas: [
      "A fictional partnership or collaboration section.",
      "A themed Instagram card styled to match your assigned aesthetic.",
      "A 'Trusted Allies' or 'Join Our Alliance' section.",
      "An interactive sponsor portal or a creative call-to-action linking to Kapidhwaj's Instagram page.",
      "A character-themed story explaining why Kapidhwaj belongs in your world."
    ]
  }
};
