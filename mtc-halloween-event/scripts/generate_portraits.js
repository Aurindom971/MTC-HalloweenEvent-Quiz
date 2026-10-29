const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'assets', 'characters');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const characters = [
  {
    id: 'voldemort',
    name: 'LORD VOLDEMORT',
    title: 'He Who Must Not Be Named',
    c1: '#072b18', c2: '#010c06', glow: '#2dc653',
    features: `
      <!-- Wand and serpent energy -->
      <path d="M 230 380 L 195 240 L 190 242 L 225 380 Z" fill="#8892b0" opacity="0.8"/>
      <circle cx="192" cy="238" r="8" fill="#2dc653" filter="url(#glow)"/>
      <path d="M 192 238 Q 160 210 170 180 T 150 140" stroke="#2dc653" stroke-width="3" fill="none" opacity="0.6" filter="url(#glow)"/>
      <!-- Body & Robes -->
      <path d="M 80 400 L 110 260 L 160 230 L 210 260 L 240 400 Z" fill="#0d1f16" stroke="#1b4332" stroke-width="2"/>
      <path d="M 125 250 L 160 300 L 195 250 L 160 235 Z" fill="#06120b"/>
      <!-- Voldemort Head (Pale, bald, gaunt) -->
      <path d="M 120 180 C 115 110 130 90 160 90 C 190 90 205 110 200 180 C 195 220 180 235 160 235 C 140 235 125 220 120 180 Z" fill="#d8e2dc"/>
      <!-- Sunken cheek contours -->
      <path d="M 130 170 Q 145 190 140 210" stroke="#9ba09d" stroke-width="2" fill="none" opacity="0.6"/>
      <path d="M 190 170 Q 175 190 180 210" stroke="#9ba09d" stroke-width="2" fill="none" opacity="0.6"/>
      <!-- Piercing Red Eyes -->
      <ellipse cx="143" cy="155" rx="8" ry="4" fill="#0d0d0d"/>
      <circle cx="143" cy="155" r="3" fill="#e63946" filter="url(#glow)"/>
      <ellipse cx="177" cy="155" rx="8" ry="4" fill="#0d0d0d"/>
      <circle cx="177" cy="155" r="3" fill="#e63946" filter="url(#glow)"/>
      <!-- Serpentine Slit Nostrils -->
      <line x1="156" y1="178" x2="153" y2="186" stroke="#4a5568" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="164" y1="178" x2="167" y2="186" stroke="#4a5568" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Cruel Slit Mouth -->
      <path d="M 148 206 Q 160 210 172 206" stroke="#4a5568" stroke-width="2.5" fill="none"/>
      <!-- Dark Mark Serpent Motif in Background -->
      <path d="M 50 120 Q 80 80 120 110 T 160 70" stroke="#2dc653" stroke-width="1.5" fill="none" opacity="0.25" stroke-dasharray="4,4"/>
    `
  },
  {
    id: 'stree',
    name: 'STREE',
    title: 'The Legend of Chanderi',
    c1: '#470007', c2: '#0d0002', glow: '#ff0033',
    features: `
      <!-- Crimson Wedding Dupatta / Flowing Veil -->
      <path d="M 70 400 C 60 250 80 130 130 90 C 160 70 190 85 210 110 C 240 150 255 250 250 400 Z" fill="#9b0012" stroke="#ff0033" stroke-width="1.5"/>
      <path d="M 85 400 C 95 280 110 180 140 140 C 160 120 180 130 195 150 C 215 190 230 290 235 400 Z" fill="#6a040f"/>
      <!-- Golden Zari Border Details -->
      <path d="M 90 150 Q 130 100 160 100 Q 190 100 225 150" stroke="#ffb703" stroke-width="2.5" fill="none" stroke-dasharray="5,3"/>
      <!-- Shadowy Silhouetted Female Face -->
      <path d="M 132 170 C 130 130 140 110 160 110 C 180 110 190 130 188 170 C 186 205 176 225 160 225 C 144 225 134 205 132 170 Z" fill="#1f0205"/>
      <!-- Eerie Piercing White Eyes -->
      <ellipse cx="148" cy="160" rx="6" ry="3.5" fill="#fff" filter="url(#glow)"/>
      <circle cx="148" cy="160" r="1.5" fill="#000"/>
      <ellipse cx="172" cy="160" rx="6" ry="3.5" fill="#fff" filter="url(#glow)"/>
      <circle cx="172" cy="160" r="1.5" fill="#000"/>
      <!-- Traditional Nose Ring (Nath) -->
      <circle cx="152" cy="180" r="4.5" fill="none" stroke="#ffb703" stroke-width="1.5"/>
      <path d="M 152 180 Q 140 178 135 170" stroke="#ffb703" stroke-width="1" fill="none"/>
      <!-- Long Braided Hair Floating Down -->
      <path d="M 185 170 Q 210 240 195 350" stroke="#000000" stroke-width="9" fill="none" stroke-linecap="round"/>
      <!-- Red Lantern in Foreground -->
      <path d="M 60 260 L 80 260 L 85 300 L 55 300 Z" fill="#ff0033" opacity="0.85" filter="url(#glow)"/>
      <rect x="62" y="250" width="16" height="10" fill="#ffb703"/>
      <path d="M 70 250 L 70 230" stroke="#ffb703" stroke-width="2"/>
      <!-- 'O Stree Kal Aana' Wall Script Motif in Background -->
      <text x="45" y="80" font-family="'Rye', serif" font-size="13" fill="#ff0033" opacity="0.4" transform="rotate(-10, 45, 80)">ओ स्त्री कल आना</text>
    `
  },
  {
    id: 'wednesday',
    name: 'WEDNESDAY ADDAMS',
    title: 'Outcast Prodigy of Nevermore',
    c1: '#1b1d28', c2: '#07080d', glow: '#8d99ae',
    features: `
      <!-- Black Nevermore Blazer with Striped Trims -->
      <path d="M 75 400 L 105 270 L 160 240 L 215 270 L 245 400 Z" fill="#12131a" stroke="#2b2d42" stroke-width="2"/>
      <path d="M 105 270 L 160 350 L 215 270" fill="#0a0a0f"/>
      <!-- Sharp White Pointed Peter Pan Collar -->
      <polygon points="160,245 125,230 140,270 160,255" fill="#edf2f4" stroke="#2b2d42" stroke-width="1.5"/>
      <polygon points="160,245 195,230 180,270 160,255" fill="#edf2f4" stroke="#2b2d42" stroke-width="1.5"/>
      <polygon points="156,255 164,255 160,290" fill="#12131a"/>
      <!-- Pale Cold Symmetrical Face -->
      <path d="M 128 170 C 124 125 135 105 160 105 C 185 105 196 125 192 170 C 189 210 178 230 160 230 C 142 230 131 210 128 170 Z" fill="#e0e1dd"/>
      <!-- Center-Parted Black Hair & Twin Braids -->
      <path d="M 115 130 C 115 90 130 65 160 65 C 190 65 205 90 205 130 C 195 100 175 95 160 115 C 145 95 125 100 115 130 Z" fill="#0d0d11"/>
      <!-- Left Braid -->
      <path d="M 118 170 Q 100 240 110 330" stroke="#0d0d11" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="110" cy="330" r="4" fill="#2b2d42"/>
      <!-- Right Braid -->
      <path d="M 202 170 Q 220 240 210 330" stroke="#0d0d11" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="210" cy="330" r="4" fill="#2b2d42"/>
      <!-- Cold Unblinking Dark Eyes & Straight Eyebrows -->
      <line x1="135" y1="145" x2="152" y2="147" stroke="#0d0d11" stroke-width="3" stroke-linecap="round"/>
      <circle cx="144" cy="157" r="4.5" fill="#1b1d28"/>
      <circle cx="143" cy="156" r="1.5" fill="#edf2f4"/>
      <line x1="185" y1="145" x2="168" y2="147" stroke="#0d0d11" stroke-width="3" stroke-linecap="round"/>
      <circle cx="176" cy="157" r="4.5" fill="#1b1d28"/>
      <circle cx="175" cy="156" r="1.5" fill="#edf2f4"/>
      <!-- Deadpan Unimpressed Mouth -->
      <line x1="150" y1="205" x2="170" y2="205" stroke="#415a77" stroke-width="2.2" stroke-linecap="round"/>
      <!-- "Thing" (The Disembodied Hand) on Shoulder -->
      <path d="M 220 270 Q 235 255 240 245 Q 245 255 235 275" stroke="#e0e1dd" stroke-width="3" fill="#e0e1dd"/>
      <path d="M 228 250 L 232 258" stroke="#780000" stroke-width="1"/>
    `
  },
  {
    id: 'pennywise',
    name: 'PENNYWISE',
    title: 'The Dancing Clown of Derry',
    c1: '#4a080d', c2: '#0e0103', glow: '#e63946',
    features: `
      <!-- Victorian Frilled Ruffled Collar -->
      <path d="M 75 400 L 95 280 L 160 250 L 225 280 L 245 400 Z" fill="#9e9e9e" stroke="#e0e0e0" stroke-width="1.5"/>
      <circle cx="120" cy="270" r="18" fill="#d6ccc2" stroke="#b7b7a4" stroke-width="1.5"/>
      <circle cx="160" cy="265" r="20" fill="#ede0d4" stroke="#b7b7a4" stroke-width="1.5"/>
      <circle cx="200" cy="270" r="18" fill="#d6ccc2" stroke="#b7b7a4" stroke-width="1.5"/>
      <circle cx="160" cy="320" r="9" fill="#ba181b"/>
      <!-- Giant Bulbous Forehead Face (Cracked White Makeup) -->
      <path d="M 115 160 C 105 95 125 65 160 65 C 195 65 215 95 205 160 C 200 205 185 230 160 230 C 135 230 120 205 115 160 Z" fill="#f8f9fa"/>
      <!-- Wild Flared Orange/Copper Clown Tufts -->
      <path d="M 110 130 C 85 90 90 140 80 180 C 100 175 105 155 110 130 Z" fill="#d9480f" filter="url(#glow)"/>
      <path d="M 210 130 C 235 90 230 140 240 180 C 220 175 215 155 210 130 Z" fill="#d9480f" filter="url(#glow)"/>
      <!-- Sinister Yellow Deadlight Eyes -->
      <ellipse cx="142" cy="150" rx="7" ry="4" fill="#1b1b1b"/>
      <circle cx="142" cy="150" r="3.5" fill="#ffb703" filter="url(#glow)"/>
      <ellipse cx="178" cy="150" rx="7" ry="4" fill="#1b1b1b"/>
      <circle cx="178" cy="150" r="3.5" fill="#ffb703" filter="url(#glow)"/>
      <!-- Iconic Red Smile Lines bisecting eyes -->
      <path d="M 142 125 Q 140 148 136 175 Q 145 198 160 202" stroke="#ba181b" stroke-width="3.5" fill="none"/>
      <path d="M 178 125 Q 180 148 184 175 Q 175 198 160 202" stroke="#ba181b" stroke-width="3.5" fill="none"/>
      <!-- Bulbous Red Nose & Jagged Mouth -->
      <circle cx="160" cy="170" r="6.5" fill="#ba181b"/>
      <path d="M 130 190 Q 160 228 190 190 Q 160 210 130 190 Z" fill="#370617"/>
      <!-- Floating Red Balloon on the Side -->
      <ellipse cx="65" cy="110" rx="22" ry="28" fill="#e63946" filter="url(#glow)"/>
      <polygon points="63,138 67,138 65,143" fill="#ba181b"/>
      <path d="M 65 143 Q 75 170 65 210 T 70 270" stroke="#ced4da" stroke-width="1.2" fill="none"/>
    `
  },
  {
    id: 'annabelle',
    name: 'ANNABELLE',
    title: 'The Cursed Conduit',
    c1: '#3d081b', c2: '#0e0105', glow: '#ff4d6d',
    features: `
      <!-- White Silk Doll Dress with Red Sash -->
      <path d="M 80 400 L 105 280 L 160 250 L 215 280 L 240 400 Z" fill="#f8f9fa" stroke="#e9ecef" stroke-width="2"/>
      <rect x="110" y="315" width="100" height="18" fill="#c9184a"/>
      <circle cx="160" cy="324" r="8" fill="#800f2f"/>
      <!-- Porcelain Doll Face with Craquelure Cracks -->
      <circle cx="160" cy="165" r="48" fill="#fff0f3" stroke="#ffccd5" stroke-width="1.5"/>
      <path d="M 175 130 L 185 145 L 180 160 L 195 175" stroke="#590d22" stroke-width="1.5" fill="none"/>
      <!-- Rosy Doll Cheeks -->
      <circle cx="132" cy="180" r="9" fill="#ff758f" opacity="0.6"/>
      <circle cx="188" cy="180" r="9" fill="#ff758f" opacity="0.6"/>
      <!-- Twin Braided Brunette Pigtails & Red Ribbons -->
      <path d="M 115 160 Q 95 120 120 110 Q 160 115 200 110 Q 225 120 205 160" fill="#3d2618"/>
      <path d="M 115 160 Q 90 220 100 280" stroke="#3d2618" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="100" cy="240" r="6" fill="#c9184a"/>
      <path d="M 205 160 Q 230 220 220 280" stroke="#3d2618" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="220" cy="240" r="6" fill="#c9184a"/>
      <!-- Wide Unblinking Glass Eyes -->
      <circle cx="142" cy="155" r="10" fill="#fff" stroke="#590d22" stroke-width="1"/>
      <circle cx="142" cy="155" r="6" fill="#0077b6"/>
      <circle cx="142" cy="155" r="2.5" fill="#000"/>
      <circle cx="140" cy="153" r="1.5" fill="#fff"/>
      <circle cx="178" cy="155" r="10" fill="#fff" stroke="#590d22" stroke-width="1"/>
      <circle cx="178" cy="155" r="6" fill="#0077b6"/>
      <circle cx="178" cy="155" r="2.5" fill="#000"/>
      <circle cx="176" cy="153" r="1.5" fill="#fff"/>
      <!-- Eerie Painted Red Doll Smirk -->
      <path d="M 146 195 Q 160 208 174 195" stroke="#c9184a" stroke-width="3" fill="none" stroke-linecap="round"/>
      <!-- Warrens' Warning Sign Motif -->
      <rect x="220" y="70" width="60" height="40" rx="3" fill="#ffe3e0" stroke="#c9184a" stroke-width="1.5"/>
      <text x="226" y="86" font-size="8" font-weight="bold" fill="#800f2f">WARNING</text>
      <text x="225" y="98" font-size="6" fill="#590d22">POSITIVELY</text>
      <text x="225" y="106" font-size="6" fill="#590d22">DO NOT OPEN</text>
    `
  },
  {
    id: 'manjulika',
    name: 'MANJULIKA',
    title: 'The Dancer of the Haveli',
    c1: '#4a031e', c2: '#0e0005', glow: '#ff0a54',
    features: `
      <!-- Royal Haveli Kathak Ghagra & Choli -->
      <path d="M 70 400 L 100 270 L 160 230 L 220 270 L 250 400 Z" fill="#590d22" stroke="#ff0a54" stroke-width="1.5"/>
      <!-- Royal Gold Choker Necklace & Pearls -->
      <path d="M 140 235 Q 160 250 180 235" stroke="#ffb703" stroke-width="4" fill="none"/>
      <path d="M 132 245 Q 160 265 188 245" stroke="#ffb703" stroke-width="2.5" fill="none"/>
      <!-- Wild Untamed Flowing Black Locks -->
      <path d="M 90 280 C 70 180 90 90 160 80 C 230 90 250 180 230 280 C 210 240 215 150 195 130 C 175 110 145 110 125 130 C 105 150 110 240 90 280 Z" fill="#0d0d0d"/>
      <!-- Traditional Royal Indian Princess Face -->
      <path d="M 130 170 C 126 130 136 110 160 110 C 184 110 194 130 190 170 C 187 205 176 225 160 225 C 144 225 133 205 130 170 Z" fill="#eddcd2"/>
      <!-- Red Chandan & Kumkum Bindi -->
      <circle cx="160" cy="138" r="4.5" fill="#ba181b" filter="url(#glow)"/>
      <circle cx="160" cy="138" r="1.5" fill="#ffb703"/>
      <!-- Dramatic Kohl-Rimmed Manic Eyes -->
      <path d="M 134 152 Q 146 144 154 154 Q 146 162 134 152 Z" fill="#0d0d0d"/>
      <circle cx="145" cy="153" r="3" fill="#ff0a54" filter="url(#glow)"/>
      <path d="M 186 152 Q 174 144 166 154 Q 174 162 186 152 Z" fill="#0d0d0d"/>
      <circle cx="175" cy="153" r="3" fill="#ff0a54" filter="url(#glow)"/>
      <!-- Alta-Stained Dancing Hand with Ghungroos -->
      <path d="M 60 270 Q 75 240 90 250 Q 85 275 65 290 Z" fill="#eddcd2" stroke="#ba181b" stroke-width="2"/>
      <circle cx="78" cy="256" r="6" fill="#ba181b"/>
      <!-- Golden Ghungroo Bells -->
      <circle cx="85" cy="285" r="4" fill="#ffb703"/>
      <circle cx="95" cy="283" r="4" fill="#ffb703"/>
      <circle cx="105" cy="285" r="4" fill="#ffb703"/>
    `
  },
  {
    id: 'thanos',
    name: 'THANOS',
    title: 'The Mad Titan',
    c1: '#2a1747', c2: '#0a0514', glow: '#ffb703',
    features: `
      <!-- Starfield -->
      <circle cx="60" cy="70" r="1.5" fill="#fff" opacity="0.7"/>
      <circle cx="260" cy="95" r="1.2" fill="#fff" opacity="0.6"/>
      <circle cx="245" cy="45" r="1" fill="#fff" opacity="0.5"/>
      <circle cx="75" cy="200" r="1" fill="#fff" opacity="0.5"/>
      <!-- Armoured Body -->
      <path d="M 60 400 L 90 260 L 160 238 L 230 260 L 260 400 Z" fill="#1d3557" stroke="#ffb703" stroke-width="2"/>
      <path d="M 110 262 L 160 300 L 210 262 L 160 245 Z" fill="#ffb703" opacity="0.85"/>
      <!-- Massive Head (purple, ridged chin) -->
      <path d="M 112 175 C 108 105 128 82 160 82 C 192 82 212 105 208 175 C 205 222 186 244 160 244 C 134 244 115 222 112 175 Z" fill="#7b5ea7"/>
      <path d="M 140 212 L 145 236 M 160 214 L 160 242 M 180 212 L 175 236" stroke="#4a3570" stroke-width="3" stroke-linecap="round"/>
      <!-- Brow & Eyes -->
      <path d="M 128 145 Q 143 136 154 146" stroke="#4a3570" stroke-width="4" fill="none"/>
      <path d="M 166 146 Q 177 136 192 145" stroke="#4a3570" stroke-width="4" fill="none"/>
      <ellipse cx="142" cy="156" rx="7" ry="4" fill="#89c2d9" filter="url(#glow)"/>
      <ellipse cx="178" cy="156" rx="7" ry="4" fill="#89c2d9" filter="url(#glow)"/>
      <path d="M 145 198 Q 160 203 175 198" stroke="#3c2a5c" stroke-width="3" fill="none"/>
      <!-- Infinity Gauntlet raised -->
      <path d="M 232 300 L 228 250 L 268 246 L 272 298 Z" fill="#ffb703" stroke="#9c6644" stroke-width="2"/>
      <rect x="230" y="226" width="9" height="26" rx="4" fill="#ffb703"/>
      <rect x="241" y="220" width="9" height="30" rx="4" fill="#ffb703"/>
      <rect x="252" y="222" width="9" height="28" rx="4" fill="#ffb703"/>
      <rect x="263" y="230" width="8" height="22" rx="4" fill="#ffb703"/>
      <circle cx="250" cy="272" r="6" fill="#e9c46a" filter="url(#glow)"/>
      <circle cx="234" cy="238" r="3" fill="#e63946" filter="url(#glow)"/>
      <circle cx="245" cy="232" r="3" fill="#4361ee" filter="url(#glow)"/>
      <circle cx="256" cy="234" r="3" fill="#9d4edd" filter="url(#glow)"/>
      <circle cx="267" cy="240" r="3" fill="#2dc653" filter="url(#glow)"/>
      <circle cx="250" cy="288" r="3" fill="#f77f00" filter="url(#glow)"/>
    `
  },
  {
    id: 'kirmada',
    name: 'KIRMADA',
    title: 'Keeper of Forbidden Spells',
    c1: '#06302c', c2: '#020c0b', glow: '#2ec4b6',
    features: `
      <!-- Floating runes -->
      <text x="58" y="120" font-family="serif" font-size="22" fill="#2ec4b6" opacity="0.5" filter="url(#glow)">ᚱ</text>
      <text x="250" y="150" font-family="serif" font-size="20" fill="#2ec4b6" opacity="0.5" filter="url(#glow)">ᛟ</text>
      <text x="70" y="250" font-family="serif" font-size="18" fill="#2ec4b6" opacity="0.4" filter="url(#glow)">ᛉ</text>
      <!-- Staff with orb -->
      <line x1="245" y1="400" x2="232" y2="170" stroke="#6b4423" stroke-width="7" stroke-linecap="round"/>
      <circle cx="231" cy="160" r="15" fill="#2ec4b6" opacity="0.85" filter="url(#glow)"/>
      <!-- Hooded robe -->
      <path d="M 70 400 L 100 245 C 92 120 118 72 160 72 C 202 72 228 120 220 245 L 250 400 Z" fill="#0b1f1d" stroke="#0f766e" stroke-width="2"/>
      <!-- Horns -->
      <path d="M 118 108 Q 92 70 104 40 Q 112 78 132 96 Z" fill="#3d2b1f"/>
      <path d="M 202 108 Q 228 70 216 40 Q 208 78 188 96 Z" fill="#3d2b1f"/>
      <!-- Shadowed face -->
      <path d="M 126 172 C 122 125 134 100 160 100 C 186 100 198 125 194 172 C 190 212 178 230 160 230 C 142 230 130 212 126 172 Z" fill="#040a09"/>
      <!-- Glowing eyes -->
      <path d="M 135 158 L 152 162 L 135 166 Z" fill="#2ec4b6" filter="url(#glow)"/>
      <path d="M 185 158 L 168 162 L 185 166 Z" fill="#2ec4b6" filter="url(#glow)"/>
      <!-- Sinister grin -->
      <path d="M 142 198 Q 160 210 178 198" stroke="#2ec4b6" stroke-width="2" fill="none" opacity="0.7"/>
      <!-- Spell circle -->
      <circle cx="160" cy="300" r="34" fill="none" stroke="#2ec4b6" stroke-width="1.5" stroke-dasharray="5,4" opacity="0.6" filter="url(#glow)"/>
    `
  },
  {
    id: 'spiderman',
    name: 'SPIDER-MAN',
    title: 'Friendly Neighbourhood Web-Slinger',
    c1: '#0c1f4d', c2: '#030817', glow: '#e63946',
    features: `
      <!-- City skyline -->
      <path d="M 20 330 L 20 260 L 50 260 L 50 230 L 75 230 L 75 280 L 95 280 L 95 330 Z" fill="#081229"/>
      <path d="M 230 330 L 230 250 L 255 250 L 255 215 L 280 215 L 280 270 L 300 270 L 300 330 Z" fill="#081229"/>
      <!-- Web thread -->
      <line x1="160" y1="0" x2="160" y2="88" stroke="#e5e5e5" stroke-width="1.5" opacity="0.7"/>
      <!-- Suit body -->
      <path d="M 80 400 L 105 260 L 160 238 L 215 260 L 240 400 Z" fill="#c1121f" stroke="#1d4ed8" stroke-width="2"/>
      <path d="M 80 400 L 100 300 L 125 300 L 120 400 Z" fill="#1d4ed8"/>
      <path d="M 240 400 L 220 300 L 195 300 L 200 400 Z" fill="#1d4ed8"/>
      <!-- Spider emblem -->
      <ellipse cx="160" cy="285" rx="6" ry="10" fill="#111"/>
      <path d="M 154 280 L 138 268 M 166 280 L 182 268 M 154 290 L 138 302 M 166 290 L 182 302" stroke="#111" stroke-width="2"/>
      <!-- Masked head -->
      <path d="M 118 172 C 114 112 132 88 160 88 C 188 88 206 112 202 172 C 198 218 182 238 160 238 C 138 238 122 218 118 172 Z" fill="#c1121f"/>
      <!-- Web lines on mask -->
      <g stroke="#3a0a0f" stroke-width="1" fill="none" opacity="0.8">
        <line x1="160" y1="88" x2="160" y2="238"/>
        <line x1="160" y1="160" x2="118" y2="130"/>
        <line x1="160" y1="160" x2="202" y2="130"/>
        <line x1="160" y1="160" x2="120" y2="200"/>
        <line x1="160" y1="160" x2="200" y2="200"/>
        <path d="M 132 120 Q 160 132 188 120"/>
        <path d="M 124 160 Q 160 172 196 160"/>
        <path d="M 130 205 Q 160 215 190 205"/>
      </g>
      <!-- Big white eyes -->
      <path d="M 128 140 Q 132 168 154 166 Q 150 146 128 140 Z" fill="#f8f9fa" stroke="#111" stroke-width="3"/>
      <path d="M 192 140 Q 188 168 166 166 Q 170 146 192 140 Z" fill="#f8f9fa" stroke="#111" stroke-width="3"/>
    `
  },
  {
    id: 'deadpool',
    name: 'DEADPOOL',
    title: 'The Merc with a Mouth',
    c1: '#3d0306', c2: '#0d0102', glow: '#f8f9fa',
    features: `
      <!-- Crossed katanas behind -->
      <line x1="70" y1="90" x2="230" y2="330" stroke="#adb5bd" stroke-width="4"/>
      <line x1="250" y1="90" x2="90" y2="330" stroke="#adb5bd" stroke-width="4"/>
      <rect x="62" y="74" width="10" height="26" rx="2" transform="rotate(-34 67 87)" fill="#212529"/>
      <rect x="248" y="74" width="10" height="26" rx="2" transform="rotate(34 253 87)" fill="#212529"/>
      <!-- Suit body -->
      <path d="M 80 400 L 105 260 L 160 238 L 215 260 L 240 400 Z" fill="#9d0208" stroke="#212529" stroke-width="3"/>
      <path d="M 92 330 L 228 330 L 226 346 L 94 346 Z" fill="#212529"/>
      <circle cx="160" cy="338" r="9" fill="#9d0208" stroke="#e5e5e5" stroke-width="2"/>
      <!-- Masked head -->
      <path d="M 118 172 C 114 112 132 88 160 88 C 188 88 206 112 202 172 C 198 218 182 238 160 238 C 138 238 122 218 118 172 Z" fill="#b5070f"/>
      <!-- Black eye patches -->
      <path d="M 120 135 Q 122 185 156 172 Q 154 140 120 135 Z" fill="#111"/>
      <path d="M 200 135 Q 198 185 164 172 Q 166 140 200 135 Z" fill="#111"/>
      <!-- White eyes, one squinting -->
      <ellipse cx="141" cy="160" rx="9" ry="6" fill="#f8f9fa"/>
      <path d="M 170 160 Q 180 155 190 160 Q 180 163 170 160 Z" fill="#f8f9fa"/>
      <!-- Smirk under the mask -->
      <path d="M 145 210 Q 163 218 178 206" stroke="#5c0105" stroke-width="2.5" fill="none"/>
      <!-- Speech bubble -->
      <rect x="208" y="40" width="88" height="34" rx="8" fill="#f8f9fa" opacity="0.92"/>
      <path d="M 220 74 L 214 88 L 232 74 Z" fill="#f8f9fa" opacity="0.92"/>
      <text x="252" y="62" text-anchor="middle" font-family="'Pixelify Sans', monospace" font-size="11" fill="#9d0208">HI, READER</text>
    `
  }
];

characters.forEach(char => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" width="100%" height="100%">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="38%" r="65%">
      <stop offset="0%" stop-color="${char.c1}"/>
      <stop offset="70%" stop-color="${char.c2}"/>
      <stop offset="100%" stop-color="#020104"/>
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${char.glow}" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#2a080c" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${char.glow}" stop-opacity="0.8"/>
    </linearGradient>
  </defs>

  <!-- Background Base -->
  <rect width="320" height="400" fill="url(#bgGrad)"/>

  <!-- Cyber-Occult Grid Pattern in Background -->
  <g stroke="${char.glow}" stroke-width="0.5" opacity="0.12">
    <line x1="0" y1="80" x2="320" y2="80"/>
    <line x1="0" y1="160" x2="320" y2="160"/>
    <line x1="0" y1="240" x2="320" y2="240"/>
    <line x1="0" y1="320" x2="320" y2="320"/>
    <line x1="80" y1="0" x2="80" y2="400"/>
    <line x1="160" y1="0" x2="160" y2="400"/>
    <line x1="240" y1="0" x2="240" y2="400"/>
  </g>

  <!-- Character Vector Features -->
  <g id="character-artwork">
    ${char.features}
  </g>

  <!-- Gothic Framing & Corner Brackets -->
  <rect x="10" y="10" width="300" height="380" rx="4" fill="none" stroke="url(#frameGrad)" stroke-width="2"/>
  <rect x="15" y="15" width="290" height="370" rx="2" fill="none" stroke="${char.glow}" stroke-width="0.8" opacity="0.4"/>

  <!-- Ornate Corner Accents -->
  <path d="M 10 35 L 35 10 M 10 22 L 22 10" stroke="${char.glow}" stroke-width="1.5"/>
  <path d="M 310 35 L 285 10 M 310 22 L 298 10" stroke="${char.glow}" stroke-width="1.5"/>
  <path d="M 10 365 L 35 390 M 10 378 L 22 390" stroke="${char.glow}" stroke-width="1.5"/>
  <path d="M 310 365 L 285 390 M 310 378 L 298 390" stroke="${char.glow}" stroke-width="1.5"/>

  <!-- Name Banner Plate at Bottom -->
  <rect x="25" y="340" width="270" height="42" rx="3" fill="#0a0204" fill-opacity="0.88" stroke="${char.glow}" stroke-width="1.2"/>
  <text x="160" y="360" text-anchor="middle" font-family="'Rye', 'Oswald', serif" font-size="14" font-weight="bold" fill="#f8f9fa" letter-spacing="1.5">${char.name}</text>
  <text x="160" y="374" text-anchor="middle" font-family="'Pixelify Sans', monospace" font-size="9" fill="${char.glow}" letter-spacing="1">${char.title.toUpperCase()}</text>
</svg>`;

  fs.writeFileSync(path.join(outDir, `${char.id}.svg`), svg.trim());
});

console.log(`Generated ${characters.length} character portraits in ${outDir}`);
