const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', 'js', 'data.js');
let content = fs.readFileSync(dataFile, 'utf8');

const metadata = {
  voldemort: {
    avatar: "assets/characters/voldemort.svg",
    archetype: "Dark Lord & Horcrux Sovereign",
    quote: "There is no good and evil, there is only power… and those too weak to seek it.",
    brief: "Obsessed with digital immortality and fragmented souls. Build dark-arts cloud vaults, Horcrux telemetry, or defensive ward systems."
  },
  stree: {
    avatar: "assets/characters/stree.svg",
    archetype: "Vengeful Chanderi Spirit & Night Sovereign",
    quote: "O Stree, kal aana… par aaj raat yahan sirf mera raaj hai.",
    brief: "Nocturnal spirit of Chanderi demanding respect. Build sunset safety curfew alerts, SOS geofences, and cultural folklore preservation grids."
  },
  wednesday: {
    avatar: "assets/characters/wednesday.svg",
    archetype: "Nevermore Outcast & Morbid Sleuth",
    quote: "I find social interaction exhausting, but this wheel is mildly amusing.",
    brief: "Brilliant, deadpan outcast prodigy of Nevermore. Build peer barter networks, cello acoustic cryptography, and monochrome forensic investigative tools."
  },
  pennywise: {
    avatar: "assets/characters/pennywise.svg",
    archetype: "Cosmic Terror & Dancing Clown",
    quote: "You will float down here… we all float down here!",
    brief: "Ancient terror lurking beneath Derry's streets. Build municipal sewer stormwater telemetry, phobia databases, or carnival funhouse distortion engines."
  },
  annabelle: {
    avatar: "assets/characters/annabelle.svg",
    archetype: "Cursed Conduit & Occult Vessel",
    quote: "Did you miss me? The glass cannot hold what was never alive.",
    brief: "Malevolent spirit tethered to a vintage porcelain doll. Build occult museum quarantine inventories, blessed barrier monitoring, and EVP paranormal loggers."
  },
  manjulika: {
    avatar: "assets/characters/manjulika.svg",
    archetype: "Royal Haveli Spectre & Court Dancer",
    quote: "Ami je tomar… shudho je tomar… Mukti chai!",
    brief: "Wronged royal dancer locked in the haveli chamber. Build 3D palace architectural restoration viewers, classical Kathak acoustic boards, and heirloom auctions."
  },
};

for (const [id, meta] of Object.entries(metadata)) {
  const targetRegex = new RegExp(`(id:\\s*"${id}",[\\s\\S]*?color:\\s*"[^"]+",)`, "m");
  const match = content.match(targetRegex);
  if (match) {
    const escQuote = meta.quote.replace(/"/g, '\\"');
    const escBrief = meta.brief.replace(/"/g, '\\"');
    const replacement = `${match[1]}\n      avatar: "${meta.avatar}",\n      archetype: "${meta.archetype}",\n      quote: "${escQuote}",\n      brief: "${escBrief}",`;
    content = content.replace(match[0], replacement);
  } else {
    console.error("Could not match character id:", id);
  }
}

fs.writeFileSync(dataFile, content, 'utf8');
console.log("Successfully enriched characters in js/data.js");
