# Wheel of Curses — Round 2 challenge picker

*Creep. Code. Create.* The Round 2 (Build) challenge picker for the Microsoft Tech Community Halloween event, 29 Oct 2026, 2:30 PM onwards. Round 1 (Tech Trials) runs separately. The event has no name yet, so the site shows none anywhere; the gate greets teams with "Welcome to the Crypt" and the page above the wheels reads "Your Fate Awaits" (neither is a title).

A spooky four-wheel challenge picker. There's no build step and no framework.

## Look
The styling follows the event poster: blood red on black, the Rye headline, Oswald labels, a Pixelify Sans pixel face for the date and countdown, a pixel jack-o'-lantern and a ransom-note tagline (both built in `js/fx.js`). Colours are tokens at the top of `css/style.css`.

## Run it
- **Quickest:** double-click `index.html`.
- **Local server:** run `node serve.js`, then open http://localhost:5173.
- **Hosting:** upload the folder as-is to GitHub Pages, Netlify, or Vercel (static hosting).

## The flow
0. **The gate.** "Enter the Crypt" turns on the sound; browsers only allow audio after a tap. "Enter quietly" skips the sound.
1. Teams sign the ledger by entering a team name. Duplicate names are blocked. **Each phone can register only once.** After that, the phone is bound to its team for good. There is no "next team" button, and reopening the site (even after clearing the page) brings back that team's fate. The host can free a phone from the host ledger if needed, e.g. after a test run.
2. **Wheel I · The Soul** gives one of 10 characters. *The Eye* spins it.
3. **Step II · The Curse** is not a wheel: the team chooses one of that character's problems, a small, one-page site it must build. Characters and problems are never used up: several teams can get the same character and choose the same problem.
4. **Wheel III · The Hex** gives a UI constraint.
5. **Wheel IV · The Twist** stays chained for 15 minutes after the hex, then unlocks. In the last minute a heartbeat speeds up.

From wheel III onwards, **the team's own character spins the wheels**. It has its own voice lines. If a team waits 60 seconds without spinning, the character grows impatient. Its shadow looms over the screen with a laugh, and it spins the wheel itself. The wait time is `idleSpinSeconds` in `js/data.js`.

The wheel stops slowly, like a casino wheel. The flapper arrow is knocked by every peg, and the wheel stays exactly where it lands. Every result is decided and saved *before* the wheel stops, so refreshing the page can't re-roll it. The timer also survives a refresh.

## The haunting
- **The lightning:** strikes every 12–28 seconds. For the length of the flash, the whole page goes see-through, and you see the horde of zombies, figures and ghosts standing in the graveyard behind it. Then it snaps back.
- **Creatures:** only zombies and ghosts, mostly as shadows:
  - hooded wraiths fly across the sky
  - a zombie crosses the moon
  - a ghost's face appears in the haunted-house window
  - hands claw up from the ground
  - extra lightning strikes

  They appear every 18–34 seconds, and every 12–24 seconds while the twist is chained.
- **Your own figure art:** put transparent PNG/SVG files in `assets/figures/` and list them in `shadowFigures` in `js/data.js`. The lightning horde and the sky wraiths will use them.
- **Opening:** a laugh in the dark the moment you enter, the lights stutter, lightning reveals the horde, then wraiths cross the sky.
- **Jump scares:** only while the twist is chained, roughly every 4–7 minutes. The lights go out, two eyes open in the dark, then a zombie face lunges with a scream. The 👻 button in the top bar turns jump scares off.
- **Sound:** everything is generated in the browser except the laugh:
  - a warped music-box lullaby over a low drone and wind
  - random analog noises every 24–54 seconds: theremin wails, a radio drifting between stations, VHS tape warble, a low synth pulse, a glitching music box, a far-off bell, knocks, chains, breathing, scraping, whispers, a distant scream
  - an analog horror-synth theme when the impatient character's shadow looms
  - `assets/audio/creepy-laugh.mp3`: the site plays **one** random laugh from it at a time, never the whole clip. A laugh comes every 25–55 seconds (more often while the twist is chained), plus one the moment you enter.
  - Sound only plays if teams tap **Enter the Crypt**. "Enter quietly" or the speaker button turns it all off.

## Easter eggs 🤫
> **Switched off for now.** Set `eggsEnabled: true` in `js/data.js` to bring back everything in this section (the secrets, the pumpkins and the judges' bonus row).

| Do this | What happens |
|---|---|
| ↑ ↑ ↓ ↓ ← → ← → B A | The blood moon rises |
| Type `boo` | A ghost answers |
| Type `mtc` | The club logo gets cursed |
| Click the moon 3 times | Something walks across it |
| Click the lit window of the haunted house | Someone is home |
| Click the eye 7 times while the wheel is locked | It weeps blood |
| Poke your character's portrait 5 times | It does not like that |
| Triple-click the title | It isn't the title any more |
| Visit between 12 and 1 AM | The witching hour |
| Leave the page alone for 3 minutes | Something checks on you |

### Bonus points 🎃
Each team can earn up to **9 bonus points**. Each one counts once per team, is saved to the team, and shows on the judges' board.
- **6 hidden pumpkins**, tiny and almost invisible, tucked between words. They brighten slightly when hovered, and the cursor never gives them away:
  - the entry gate text
  - beside "The Hex" seal
  - in "or tap the eye"
  - between "Your" and "Grimoire"
  - in the footer
  - in a corner of the fate card
- **Raise the blood moon** (the arrow-key code above).
- **Poke the moon** 3 times.
- **Read the source:** a riddle in an HTML comment at the top of `index.html` points to a word. Typing it anywhere on the page earns the point. The word itself never appears in the code; only a scrambled fingerprint does.

Teams see their count in the grimoire ("🎃 Hidden pumpkins: 2 / 9"). Pumpkins clicked before registering don't count.

## Shadow figures
The silhouettes in `assets/figures/` are CC0 (public domain) clipart from [openclipart.org](https://openclipart.org): Nosferatu shadows, a shambling zombie, a zombie horde, a contorted shadow, a crawling skeleton and a grim reaper. They are drawn pitch black, so any transparent PNG/SVG can be swapped in through `shadowFigures` in `js/data.js`.

## Organisers: back to the sign-in page (temporary)
On a laptop, type `mtchome` anywhere on the page (not inside a text box). This browser forgets its team and reloads on the team-name form. Every team stays in the ledger, so typing a team name again shows straight away whether it was registered ("That name is already written in the ledger"). Remove this before the event if you don't want it.

## Judges' board
Entering the **secret team name** opens the judges' board instead of registering a team. Case, spaces and punctuation don't matter. The name is deliberately not written anywhere in this project, so keep it to the organisers. The board is also reachable at `judges.html`, which stays sealed until the secret name is entered there. A signed-in host can open it straight from the host ledger.

To change the secret name: open the browser console on the site, run `Store.secret("your new phrase")`, and paste the result into `judgeKey` in `js/data.js`. The phrase itself is never stored in the code.

The board shows every team on one page: soul, curse, hex and twist with full descriptions, a live twist countdown, and bonus pumpkins. It has search and filters (still spinning / twist chained / twist revealed), and a print layout. With the shared ledger on, it updates live from every phone.

## Host controls
Open the host ledger by typing the **host word** into the team-name box and pressing Begin (works on phones and laptops). It is the only way in. The word is not written in the code, only its fingerprint (`hostKey` in `js/data.js`); to change it, run `Store.secret("new word")` in the browser console and paste the result there.

From the ledger you can:
- See how many teams each character has, and every team's results
- Change the twist delay (useful for a dry run: set it to 0.5)
- **Free this phone** so a new team can register on it (e.g. after a test run). In shared mode, sign out of the host account before handing the phone to a team.
- Export the ledger as JSON or CSV (CSV opens in Excel / Sheets)
- Wipe everything (you must type `WIPE` to confirm)

With the shared ledger on, anyone can *view* this panel. Changing the timer and wiping need the host sign-in.

## Teams on their own phones: the shared ledger
To let every phone share one ledger, follow **[SETUP-SUPABASE.md](SETUP-SUPABASE.md)** (about 10 minutes, free plan).

Once it's set up:
- **Shared, not exclusive.** Any number of teams can have the same character and problem. Each team's choices live on its own team record.
- **Status pill.** A pill at the top right shows the connection: **Crypt linked**, **Offline — reconnecting**, or **Crypt unreachable**.
- **Host sign-in.** The host signs in inside the host ledger. Twist-delay changes then apply to every phone.
- **Saved progress.** Each team's full progress is saved to the shared ledger, which is what the judges' board reads. If a phone loses its local data mid-event, reopening the site on that phone picks up where the team left off.

Without a Supabase config (`window.SUPABASE_CONFIG` in `js/supabase-config.js` set to `null`), the site runs in **single-device mode**: the ledger lives in that one browser. That's fine for a single shared spinning station. In that mode the host panel can also merge ledgers exported from other devices.

## Editing content
All characters, problems, hexes, and twists live in `js/data.js`.
- Each character needs a unique `id` and a `problems` list.
- In twists, `{char}`, `{randomChar}` and `{randomCurse}` are filled in automatically.
- Each character's `spin` and `idle` lines are what it says when it spins, and when it loses patience.
