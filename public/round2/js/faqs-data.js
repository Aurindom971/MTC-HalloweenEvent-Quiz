/* =========================================================
   MTC Halloween Hackathon — Round 2: The Build
   Knowledge Base & Comprehensive FAQs Data
   ========================================================= */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.FAQ_DATA = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  return {
    event: "Microsoft Tech Community (MTC) Halloween Hackathon — Round 2: The Build",
    theme: "Your Fate Awaits: Creep. Code. Create.",
    date: "29 Oct 2026, 2:30 PM Onwards",
    organizer: "Microsoft Tech Community, Amity University Noida",
    sponsor: {
      name: "KAPIDHWAJ",
      handle: "@kapidhwaj.innovations",
      instagramUrl: "https://www.instagram.com/kapidhwaj.innovations/"
    },
    categories: [
      {
        id: "all",
        name: "All Questions",
        glyph: "✨",
        count: 24
      },
      {
        id: "event-rules",
        name: "Event & Rules",
        glyph: "⚔️",
        description: "Schedule, team sizes, project scope, and character destiny.",
        faqs: [
          {
            id: "event-schedule-timeline",
            q: "What is the timeline and duration of Round 2: The Build?",
            a: "The ritual commences on 29 October 2026 at 2:30 PM sharp. Once your team signs the Ledger in the Crypt and completes the initial spins on the Wheel of Evil, the clock starts ticking! The Twist awakens approximately 15 minutes after your UI Hex, and a 5-minute System Shutdown lockdown banner will flash across the interface before Zero Hour, when all portals seal.",
            tags: ["timeline", "duration", "hours", "schedule", "time limit", "start", "end", "deadline"]
          },
          {
            id: "team-size-limits",
            q: "What are the allowed team sizes? Can I summon a horde or hack solo?",
            a: "Teams are limited to a maximum of 2 mortals: <strong>Leader (Student 1)</strong> and <strong>Optional Team Member (Student 2)</strong>. You are more than welcome to hack as a brave solo necromancer (Leader only), but teams exceeding 2 members are strictly barred by the Crypt Ledger.",
            tags: ["team size", "solo", "duo", "members", "leader", "roster", "registration"]
          },
          {
            id: "project-scope-one-page",
            q: "What is the expected project scope? Do we need a massive multi-page web platform?",
            a: "Keep it small, sharp, and deadly: <strong>One page, one killer main feature.</strong> The judges prize atmospheric depth, smooth user experience, and brilliant creative execution over bloated, unfinished multi-page labyrinths. Build an interactive web experience that directly tackles your character's dilemma.",
            tags: ["scope", "pages", "single page", "mvp", "complexity", "feature", "architecture"]
          },
          {
            id: "re-spin-character-problem",
            q: "Can our team re-spin or swap our character or problem if we get someone we dislike?",
            a: "Never! <em>'You cannot choose your favourite. You cannot negotiate with the darkness. Whatever the wheel gives you, that is your mission, that's your destiny!'</em> The Wheel of Evil binds your team permanently upon first spin. Even clearing browser cookies or reopening the site will bring back your recorded fate from the Crypt's ledger.",
            tags: ["change character", "re-spin", "swap", "destiny", "wheel", "problem"]
          },
          {
            id: "duplicate-characters-allowed",
            q: "What if another team lands on the exact same character or problem statement as ours?",
            a: "Fear not! Souls and curses in the Crypt are infinite and never get 'used up'. Multiple teams can receive Lord Voldemort, Valak (The Nun), or Manjulika. What sets you apart is your unique UI Hex constraint, your surprise Twist, your execution of the Alliance Protocol, and your sheer creative coding wizardry.",
            tags: ["duplicate", "same character", "competition", "overlap", "variety"]
          },
          {
            id: "allowed-tech-stack",
            q: "What tech stack or frameworks are permitted? Are we locked into vanilla JavaScript?",
            a: "You are free to conjure with any frontend technology you command! Vanilla HTML/CSS/JS, React, Next.js, Vue, Svelte, Tailwind CSS, Three.js, Canvas, GSAP, or any UI library are 100% permitted. The only sacred commandment is that your final creation must run seamlessly in a modern web browser and be deployed to a public URL.",
            tags: ["stack", "tech", "react", "nextjs", "vue", "tailwind", "frameworks", "vanilla", "libraries"]
          },
          {
            id: "device-binding-ledger",
            q: "What happens if our phone or laptop dies mid-hackathon? Will our team lose its progress?",
            a: "Your team's progress is synced live to the Crypt's cloud ledger (The Other Side). As long as you reopen the site on the same device or sign in with your registered team name, your character, hex, and twist state will be restored exactly where you left off.",
            tags: ["device", "battery", "sync", "lost", "progress", "cloud ledger", "backup"]
          }
        ]
      },
      {
        id: "ai-tools",
        name: "AI & Tech Stack",
        glyph: "🤖",
        description: "Rules on ChatGPT, Claude, Cursor, Copilot, v0, Lovable, and algorithmic transparency.",
        faqs: [
          {
            id: "ai-generators-permitted",
            q: "Can we use AI assistants like ChatGPT, Claude, Cursor, GitHub Copilot, v0, Lovable, or Bolt?",
            a: "Yes! Modern necromancers use modern grimoires. AI code generation, autocomplete, debugging tools, and generative UI scaffolding (v0, Lovable, Cursor, Claude 3.7 Sonnet) are fully permitted as accelerators.",
            tags: ["ai", "chatgpt", "claude", "cursor", "copilot", "v0", "lovable", "tools", "generators"]
          },
          {
            id: "ai-code-understanding-rule",
            q: "Can we submit a 100% AI-generated site if we don't understand how the code works?",
            a: "Beware: the judges are master exorcists. While AI can write code, <strong>you must fully understand, explain, and defend every line of logic and styling during your live evaluation.</strong> If a judge asks you to adjust a CSS property or explain a JavaScript function and you cannot, your technical score will evaporate into the mist.",
            tags: ["understanding", "defense", "questions", "prompt engineering", "ownership", "viva"]
          },
          {
            id: "ai-disclosure-judging",
            q: "How must AI usage be declared during judging and in our submission?",
            a: "Honesty honors the Crypt. Include a brief note in your project README or site footer crediting the tools you leveraged (e.g. <em>'Crafted by The Midnight Coders with assistance from Claude 3.7 & Midjourney'</em>). When presenting to judges, proudly explain how you directed the AI to solve your specific constraints rather than pretending it was written purely from scratch.",
            tags: ["declaration", "transparency", "readme", "disclosure", "honesty", "attribution"]
          },
          {
            id: "ai-media-assets",
            q: "Can we use AI to generate eerie sound effects, custom voice lines, or spooky illustrations?",
            a: "Absolutely! Using AI for bespoke horror artwork, synthesized character voiceovers (ElevenLabs), eerie music loops (Suno), or custom SVG icons will significantly boost your atmosphere and creativity scores.",
            tags: ["assets", "images", "sound", "midjourney", "elevenlabs", "voiceovers", "media", "music"]
          }
        ]
      },
      {
        id: "hex-twist",
        name: "UI Hexes & Twists",
        glyph: "🔮",
        description: "Mandatory design constraints, Must-Have requirements, and handling chaotic twists.",
        faqs: [
          {
            id: "what-is-ui-hex",
            q: "What is Wheel III (The UI Hex), and why does it have a 'Must-Have' requirement?",
            a: "Wheel III inflicts a specific aesthetic curse upon your UI (e.g. <em>Cyberpunk Cemetery, Haunted Glass, Monster Brutalism, 8-Bit Graveyard, Victorian Haunting</em>). Each hex carries a <strong>non-negotiable Must-Have requirement</strong> (e.g. frosted glass panels using <code>backdrop-filter</code>, brutalist heavy drop-shadows, or a strict monochrome noir palette). Judges check this criterion first!",
            tags: ["hex", "wheel 3", "must-have", "aesthetic", "styling", "constraint", "palette"]
          },
          {
            id: "twist-awakening-timer",
            q: "When and how does Wheel IV (The Twist) unlock?",
            a: "Wheel IV is bound in chains when you first receive your Hex. A mystical 15-minute countdown timer runs in the Crypt. In the final minute, a tense heartbeat quickens, the chains shatter, and your character summons you to spin Wheel IV for your gameplay disruption.",
            tags: ["twist timer", "countdown", "15 minutes", "wheel 4", "heartbeat", "chains"]
          },
          {
            id: "twist-breaks-our-ui",
            q: "What if our revealed Twist breaks our layout or disrupts our existing architecture?",
            a: "That is the very crucible of Round 2! Twists (such as <em>'The Runaway Button'</em>, <em>'Jump Scare'</em>, <em>'Lost a Limb'</em>, or <em>'Midnight Is Coming'</em>) are meant to throw chaotic wrenches into your plans. Don't panic: adapt your code with humor and cleverness. Build deliberate fallbacks (e.g. a runaway button that can still be caught after 3 chases) so your site remains usable while fulfilling the curse.",
            tags: ["broken ui", "twist challenge", "adaptation", "runaway button", "glitch", "bugs", "chaos"]
          },
          {
            id: "can-we-ignore-twist",
            q: "Can we ignore the Twist if we run out of time?",
            a: "Ignoring the Twist is fatal to your leaderboard ambitions! 'Hex & Twist Execution' accounts for <strong>25% of your total evaluation score</strong>. Even a minimal, theatrical implementation of your twist will earn far more points than pretending it never happened.",
            tags: ["ignore twist", "skip", "points deduction", "evaluation", "score"]
          },
          {
            id: "double-curse-spread",
            q: "What if our Twist lands on 'The Curse Spreads'?",
            a: "You have been cursed by dark spirits! You must layer a second assigned UI Hex constraint on top of your primary Hex. Blend both aesthetics harmoniously (e.g. Neo-Brutalism infused with Haunted Glass blur effects) to prove your design mastery.",
            tags: ["curse spreads", "double hex", "extreme challenge", "styling", "hybrid"]
          }
        ]
      },
      {
        id: "alliance",
        name: "Kapidhwaj Alliance",
        glyph: "🌀",
        description: "Official links, compulsory sponsor rules, and character-specific creative ideas.",
        faqs: [
          {
            id: "alliance-protocol-overview",
            q: "What is 'The Alliance Protocol', and is it compulsory for every team?",
            a: "Yes! The Alliance Protocol is a <strong>compulsory sponsor twist for ALL teams</strong> in Round 2, running alongside your individual Wheel IV twist. You must creatively integrate our official sponsor, <strong>KAPIDHWAJ</strong>, into your web application's storyline, UI aesthetic, and interactive features.",
            tags: ["alliance protocol", "sponsor", "kapidhwaj", "compulsory", "mandatory", "rules"]
          },
          {
            id: "official-sponsor-instagram",
            q: "What is the official Kapidhwaj Instagram handle and link?",
            a: "The official handle is <strong>@kapidhwaj.innovations</strong> and the mandatory clickable URL is <a href='https://www.instagram.com/kapidhwaj.innovations/' target='_blank' rel='noopener'><strong>https://www.instagram.com/kapidhwaj.innovations/ ↗</strong></a>. Ensure this link is active, opens safely in a new tab (<code>target='_blank' rel='noopener'</code>), and is readily discoverable by judges.",
            tags: ["instagram", "handle", "link", "kapidhwaj.innovations", "url", "sponsor link"]
          },
          {
            id: "why-not-just-footer-logo",
            q: "Can we just put a small Kapidhwaj logo in our website footer and call it done?",
            a: "NO! <em>'A boring logo in the footer won't save your website. The sponsor must become a meaningful part of your world.'</em> Slapping an unstyled logo in the footer will result in 0 or near-zero points for the Alliance Protocol. It must feel like an organic, in-universe narrative element styled to match your character's world.",
            tags: ["footer logo", "lazy integration", "rules", "grading", "branding", "mistake"]
          },
          {
            id: "alliance-protocol-rules",
            q: "What are the four official rules of The Alliance Protocol?",
            a: "<ol class='faq-inner-list'><li><strong>1. Clear Feature:</strong> The official Kapidhwaj Instagram account (@kapidhwaj.innovations) must be clearly featured.</li><li><strong>2. Clickable Link:</strong> Must include a working link to https://www.instagram.com/kapidhwaj.innovations/.</li><li><strong>3. Visual Harmony:</strong> The integration must visually match your website's UI Hex and character aesthetic (not look like an ugly external banner ad).</li><li><strong>4. Narrative Intent:</strong> It must feel intentional, creative, and integrated into the problem you are solving.</li></ol>",
            tags: ["rules", "criteria", "styling", "intent", "requirements", "guidelines"]
          },
          {
            id: "creative-sponsor-ideas",
            q: "What are some creative integration ideas for our character?",
            a: "<div class='faq-inner-ideas'><strong>Valak (The Nun):</strong> Frame Kapidhwaj as the occult engineering firm forging containment wards holding Valak at bay. An interactive 'Consecrated Chamber' links to their Instagram.<br><br><strong>Lord Voldemort:</strong> Position Kapidhwaj as the shadowy dark-arts technology syndicate building the Dark Lord's Horcrux tracking dashboard.<br><br><strong>Manjulika:</strong> Weave Kapidhwaj as the royal architectural guild that constructed the secret acoustic resonance chambers.<br><br><strong>Pennywise:</strong> Depict Kapidhwaj as the carnival tech syndicate supplying holographic balloons.<br><br><strong>Deadpool / Wednesday:</strong> Fourth-wall comedic sponsored shoutouts or Nevermore forensic tech providers.</div>",
            tags: ["ideas", "characters", "valak", "voldemort", "manjulika", "pennywise", "deadpool", "wednesday", "stree"]
          }
        ]
      },
      {
        id: "submission-hosting",
        name: "Submissions & Hosting",
        glyph: "🚀",
        description: "Required links, free hosting guides, emergency crash protocols, and testing checklists.",
        faqs: [
          {
            id: "required-submission-fields",
            q: "What links and details must be submitted in the project submission portal?",
            a: "The submission form provides fields for:<br>1. <strong>🌐 Live Hosted Website URL (MANDATORY):</strong> A publicly accessible <code>https://</code> link.<br>2. <strong>📁 GitHub Repository URL (Strongly Recommended):</strong> Public repository showcasing source code and commit history.<br>3. <strong>📦 Source Code Archive (.zip) or Cloud Drive Link (Optional/Fallback):</strong> Directly attached .zip (max 50MB) or Google Drive link for judge inspection.",
            tags: ["submission", "form", "links", "live url", "github", "zip", "drive", "portal"]
          },
          {
            id: "free-hosting-platforms",
            q: "Where can we host our website for free without paying a single rupee?",
            a: "Use any of these battle-tested free static hosts:<br>• <strong>▲ Vercel:</strong> Instant deployment, lightning fast CDN, <code>project.vercel.app</code> URLs.<br>• <strong>💎 Netlify:</strong> Drag-and-drop your project folder directly into their dashboard—no Git commands required!<br>• <strong>🐙 GitHub Pages:</strong> Free hosting straight from your repo under Settings → Pages.<br>• <strong>⚡ Render:</strong> Connect GitHub repo for instant static site hosting.<br>• <strong>☁️ Cloudflare Pages:</strong> Fast edge hosting with instant builds.",
            tags: ["hosting", "free", "vercel", "netlify", "github pages", "render", "cloudflare", "deploy"]
          },
          {
            id: "fastest-no-git-deployment",
            q: "What is the quickest way to deploy if we have never used Git or GitHub before?",
            a: "Go to <strong>Netlify Drop</strong> (<a href='https://app.netlify.com/drop' target='_blank' rel='noopener'>app.netlify.com/drop ↗</a>). Drag and drop your entire project folder into the browser window. Within 10 seconds, Netlify will generate a live, public <code>https://...netlify.app</code> URL that you can immediately paste into the Crypt's submission form!",
            tags: ["drag and drop", "netlify drop", "no git", "fast deployment", "beginner", "quick"]
          },
          {
            id: "live-site-crashes-during-judging",
            q: "What if our live deployed website goes down or errors out right as the judges arrive?",
            a: "Do not panic! Because you provided your <strong>GitHub repository URL</strong> or uploaded a <strong>Source Code .zip</strong>, the judges can inspect your code and have you run it locally on your laptop (<code>localhost</code>). Always keep a local copy running on your development server as an immediate backup.",
            tags: ["crash", "site down", "backup", "localhost", "emergency", "contingency", "panic"]
          },
          {
            id: "updating-submission-before-deadline",
            q: "Can we update our submitted link or code if we squash a bug before the deadline?",
            a: "Yes! The submission portal includes an <strong>'Update Submission'</strong> button. As long as the final countdown banner hasn't reached Zero Hour, you can push new commits to your host or update your links in the Crypt.",
            tags: ["update submission", "edit link", "resubmit", "deadline", "fix bugs"]
          }
        ]
      },
      {
        id: "judging-scoring",
        name: "Judging & Evaluation",
        glyph: "⚖️",
        description: "Scoring rubric, pitch structure, technical defense, and secret bonus easter eggs.",
        faqs: [
          {
            id: "scoring-rubric-breakdown",
            q: "What is the official evaluation rubric and score breakdown?",
            a: "Judges score each team across 4 core pillars (25% each):<br><br>1. <strong>🎭 Storyline & Concept Creativity (25%):</strong> Depth of character immersion, narrative wit, and lore adaptation.<br>2. <strong>🎨 UI/UX Design & Aesthetic Polish (25%):</strong> Visual hierarchy, responsiveness, atmosphere, typography, and styling coherence.<br>3. <strong>⚙️ Problem Solving & Feature Completeness (25%):</strong> Does the single-page app actually solve the character's problem? Is the main interaction smooth and bug-free?<br>4. <strong>🔮 Hex, Twist & Sponsor Execution (25%):</strong> Strict fulfillment of the Hex Must-Have, seamless execution of the Wheel IV Twist, and imaginative integration of the Kapidhwaj Alliance Protocol.",
            tags: ["judging", "rubric", "criteria", "weighting", "scores", "percentages", "evaluation"]
          },
          {
            id: "how-to-structure-pitch",
            q: "How should our team structure our 2 to 3-minute pitch to the judges?",
            a: "Be crisp and theatrical:<br>• <strong>Minute 1 (The Dilemma):</strong> Introduce your team, reveal your character's problem, and show the live app solving it.<br>• <strong>Minute 2 (The Hex & Twist):</strong> Point out your UI Hex Must-Have in action, then demonstrate your surprise Twist.<br>• <strong>Minute 3 (The Alliance & Code):</strong> Unveil your Kapidhwaj sponsor integration, highlight any technical wizardry in your code, and answer judge questions.",
            tags: ["pitch", "demo", "presentation", "timing", "judging walk-through", "demo script"]
          },
          {
            id: "bonus-easter-eggs",
            q: "Are there bonus points or easter eggs hidden in the Crypt?",
            a: "Indeed! Curious mortal souls who explore the Crypt may uncover <strong>hidden pumpkins, Konami blood-moon invocations, or ancient source-code riddles</strong>. These bonus discoveries are recorded in the Judges' Board and can act as tiebreakers among top contenders!",
            tags: ["easter eggs", "bonus points", "pumpkins", "secrets", "tiebreaker"]
          }
        ]
      }
    ]
  };
});
