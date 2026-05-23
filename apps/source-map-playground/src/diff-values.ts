/**
 * Preset scenarios for the Diff Playground.
 *
 * Each preset is a `before` / `after` markdown pair that exercises a specific
 * shape of edit. They roughly map to the AI tool calls we see in production:
 *
 *  - "Typo fix"          — a single token changed inside one paragraph
 *  - "Paragraph rewrite" — one entire block replaced with another
 *  - "Multi-block edit"  — several adjacent paragraphs rewritten
 *  - "Insert / Delete"   — pure insertions and pure deletions interleaved
 *  - "Full document"     — every block changes (full set_document tool)
 *  - "MDX lesson plan"   — replacement inside an `<activity>` MDX block
 *
 * The presets deliberately stay small (≤ 6 blocks) so the diff result fits on
 * screen and is legible at a glance.
 */

export type DiffPreset = {
  label: string;
  description: string;
  before: string;
  after: string;
};

export const DIFF_PRESETS: Record<string, DiffPreset> = {
  'Typo fix': {
    label: 'Typo fix',
    description: 'A single word changed inside one paragraph.',
    before:
      'Žáci sestaví obvod s baterií a žárovkou. Pozorují, co se stane, když přerušíme proud.',
    after:
      'Žáci sestaví obvod s baterií a LED diodou. Pozorují, co se stane, když přerušíme proud.',
  },

  'Paragraph rewrite': {
    label: 'Paragraph rewrite',
    description:
      'Whole paragraph rephrased. Word-hints should still surface inside.',
    before:
      'Učitel rozdá pracovní listy. Žáci si přečtou zadání a začnou pracovat samostatně.',
    after:
      'Vyučující rozdá pracovní listy a vysvětlí postup. Žáci poté pracují ve dvojicích nad zadáním.',
  },

  'Multi-block edit': {
    label: 'Multi-block edit',
    description:
      'Three adjacent paragraphs each rewritten; their pairs MUST stay independent.',
    before: `Cíl hodiny: Pochopit rozdíl mezi pevnou a kapalnou látkou.

Pomůcky: kostka ledu, sklenice vody, plastová tyčinka.

Postup: Žáci porovnají vzhled obou látek a popíší rozdíly.`,
    after: `Cíl hodiny: Pochopit rozdíl mezi pevnou, kapalnou a plynnou látkou.

Pomůcky: kostka ledu, sklenice vody, balónek s teplým vzduchem.

Postup: Žáci porovnají vlastnosti všech tří skupenství a popíší přechody mezi nimi.`,
  },

  'Insert / Delete': {
    label: 'Insert / Delete',
    description:
      'A pure delete and a pure insert separated by an unchanged block.',
    before: `Stará myšlenka, která zmizí.

Tahle věta zůstane stejná.`,
    after: `Tahle věta zůstane stejná.

Nová myšlenka, která se přidá.`,
  },

  'Full document': {
    label: 'Full document',
    description:
      'Every block is different — simulates an AI "set_document" tool call.',
    before: `# Výchozí téma

První odstavec o starém tématu.

Druhý odstavec rozvíjí původní myšlenku.

Třetí odstavec uzavírá výchozí verzi.`,
    after: `# Přepracované téma

První odstavec představuje nový kontext.

Druhý odstavec přidává praktický příklad.

Třetí odstavec shrnuje nové závěry.`,
  },

  'Heading swap': {
    label: 'Heading swap',
    description:
      'Paragraph → heading. Word-hinting must NOT kick in (structural change).',
    before: 'Toto je obyčejný odstavec s nějakým obsahem.',
    after: '# Toto je nadpis s nějakým obsahem.',
  },

  'List bullet edit': {
    label: 'List bullet edit',
    description:
      'A list with one item rewritten; other items must remain unmarked.',
    before: `- První bod beze změny
- Druhý bod ke změně
- Třetí bod beze změny`,
    after: `- První bod beze změny
- Druhý bod přepsaný úplně jinak
- Třetí bod beze změny`,
  },

  'Code block edit': {
    label: 'Code block edit',
    description:
      'Code block content changed. Code blocks are non-prose: no inner word hints.',
    before: `\`\`\`python
def hello():
    print("world")
\`\`\``,
    after: `\`\`\`python
def hello(name):
    print(f"Hello, {name}")
\`\`\``,
  },

  'Whitespace only': {
    label: 'Whitespace only',
    description:
      'Only spacing changed; expectations: no change at all (text equal).',
    before: 'Hello  world',
    after: 'Hello world',
  },

  'No change': {
    label: 'No change',
    description:
      'Identical inputs; diff must be empty (no spurious paired blocks).',
    before: `# Same heading

Same paragraph.`,
    after: `# Same heading

Same paragraph.`,
  },

  // ───────────────────────────────────────────────────────────────────
  // MDX presets — exercise the custom `<lesson_info>`, `<phase>` and
  // `<activity>` containers from the lesson-plan plugin. These probe
  // the most common failure modes when diffing nested custom elements:
  //   - changes deep inside a wrapper produce a top-level pair on the
  //     wrapper (block-mode treats nested containers as atomic)
  //   - MDX attribute-only changes still bubble up to the wrapper
  //   - siblings stay clean when only one of them changes
  // ───────────────────────────────────────────────────────────────────

  'MDX: activity prose tweak': {
    label: 'MDX: activity prose tweak',
    description:
      'A typo inside an <activity> nested in a <phase>. Block-mode marks the whole phase because it has nested non-leafy children; the surrounding markdown stays clean.',
    before: `<phase name="Uvědomění">
  <activity name="Úvod" duration="5">
    Žáci si přečtou starou definici a diskutují ve dvojicích.
  </activity>
</phase>`,
    after: `<phase name="Uvědomění">
  <activity name="Úvod" duration="5">
    Žáci si přečtou novou definici a vlastními slovy ji vysvětlí.
  </activity>
</phase>`,
  },

  'MDX: activity attribute only': {
    label: 'MDX: activity attribute only',
    description:
      'Only the activity duration changes (5 → 15). Same content but block-mode still pairs the whole phase — verify the wrapper carries the attribute change while inner prose is byte-identical on both sides.',
    before: `<phase name="Reflexe">
  <activity name="Shrnutí" duration="5">
    Učitel shrne hlavní závěry hodiny a propojí je s každodenním životem.
  </activity>
</phase>`,
    after: `<phase name="Reflexe">
  <activity name="Shrnutí" duration="15">
    Učitel shrne hlavní závěry hodiny a propojí je s každodenním životem.
  </activity>
</phase>`,
  },

  'MDX: add activity to phase': {
    label: 'MDX: add activity to phase',
    description:
      'A new <activity> appears as a sibling inside the same <phase>. Container recursion keeps the phase wrapper AND the first activity untouched; only the second activity should appear as an inserted block.',
    before: `<phase name="Uvědomění">
  <activity name="Pokus 1" duration="10">
    Žáci provedou základní experiment podle pracovního listu.
  </activity>
</phase>`,
    after: `<phase name="Uvědomění">
  <activity name="Pokus 1" duration="10">
    Žáci provedou základní experiment podle pracovního listu.
  </activity>

  <activity name="Pokus 2" duration="10">
    Žáci rozšíří experiment a porovnají výsledky se skupinou vedle.
  </activity>
</phase>`,
  },

  'MDX: lesson_info field edit': {
    label: 'MDX: lesson_info field edit',
    description:
      'Content inside one <info_*> field changes; the other fields are unchanged. Block-mode pairs the whole <lesson_info> wrapper.',
    before: `<lesson_info>
  <info_grade>
    8\\. ročník ZŠ, 45 minut
  </info_grade>

  <info_learns>
    Žáci pochopí rozdíl mezi sériovým a paralelním zapojením elektrického obvodu.
  </info_learns>
</lesson_info>`,
    after: `<lesson_info>
  <info_grade>
    8\\. ročník ZŠ, 45 minut
  </info_grade>

  <info_learns>
    Žáci samostatně sestaví obvod, vysvětlí rozdíl mezi zapojeními a uvedou příklad z domácnosti.
  </info_learns>
</lesson_info>`,
  },

  'MDX: two phases, one changes': {
    label: 'MDX: two phases, one changes',
    description:
      'Two <phase> blocks at top level. Only the first one changes — the second must NOT pick up any diff marks, and its activity must not share a pairId with the changed phase.',
    before: `<phase name="Evokace">
  <activity name="Otázka na úvod" duration="5">
    Učitel položí žákům starou motivační otázku.
  </activity>
</phase>

<phase name="Reflexe">
  <activity name="Shrnutí" duration="10">
    Žáci si vzájemně shrnou, co se naučili.
  </activity>
</phase>`,
    after: `<phase name="Evokace">
  <activity name="Otázka na úvod" duration="5">
    Učitel položí žákům novou problémovou situaci k diskusi.
  </activity>
</phase>

<phase name="Reflexe">
  <activity name="Shrnutí" duration="10">
    Žáci si vzájemně shrnou, co se naučili.
  </activity>
</phase>`,
  },

  'MDX: phase replaced wholesale': {
    label: 'MDX: phase replaced wholesale',
    description:
      'One <phase> swapped for a structurally different one (different name, different activity, different inner content). Tests full container replacement.',
    before: `<phase name="Evokace">
  <activity name="Brainstorming" duration="5">
    Žáci si zapíší své prekoncepce o magnetismu.
  </activity>
</phase>`,
    after: `<phase name="Uvědomění">
  <activity name="Pokus s magnetem" duration="20">
    Žáci ve skupinách zkoumají, které předměty magnet přitahuje.

    Zapíší si pozorování do pracovního listu.
  </activity>
</phase>`,
  },

  // ───────────────────────────────────────────────────────────────────
  // Lists — exercise the indent-based Plate list model. The markdown
  // deserializer emits paragraphs carrying `listStyleType` ('disc' /
  // 'decimal' / 'todo') and `indent` instead of nested ul>li wrappers,
  // so each visible "item" is a sibling at the top level of the tree.
  // ───────────────────────────────────────────────────────────────────

  'List: bullet rewrite': {
    label: 'List: bullet rewrite',
    description:
      'One bullet rewritten among three. Other items must stay clean; word-hint kicks in INSIDE the changed item.',
    before: `- První bod, který zůstává
- Druhý bod, který se přepíše
- Třetí bod, který zůstává`,
    after: `- První bod, který zůstává
- Druhý bod, kompletně přepsaný novou formulací
- Třetí bod, který zůstává`,
  },

  'List: ordered with rich content': {
    label: 'List: ordered with rich content',
    description:
      'Numbered list where one item contains **bold** and *italic*. Marks on unchanged words must survive into the diff output.',
    before: `1. První krok je jednoduchý.
2. Druhý krok je **důležitý** a *konkrétní*, žáci ho musí pochopit.
3. Třetí krok shrnuje výsledky.`,
    after: `1. První krok je jednoduchý.
2. Druhý krok je **důležitý** a *konkrétní*, žáci ho musí prezentovat.
3. Třetí krok shrnuje výsledky.`,
  },

  'List: todo toggle': {
    label: 'List: todo toggle',
    description:
      'A GFM task list with one checkbox flipped from unchecked to checked. Item text unchanged — diff lives entirely on the `checked` attribute.',
    before: `- [ ] Připravit pomůcky
- [ ] Rozdat pracovní listy
- [ ] Zkontrolovat výsledky`,
    after: `- [x] Připravit pomůcky
- [ ] Rozdat pracovní listy
- [ ] Zkontrolovat výsledky`,
  },

  'List: todo with text change': {
    label: 'List: todo with text change',
    description:
      'Todo item that BOTH gets checked AND rephrased. Word-hint surfaces the prose change inside, while the `checked` attribute change rides along on the wrapper.',
    before: `- [ ] Koupit mléko a chléb
- [ ] Vyzvednout balíček`,
    after: `- [x] Koupit ovesné mléko a chléb
- [ ] Vyzvednout balíček`,
  },

  'List: nested multilevel': {
    label: 'List: nested multilevel',
    description:
      'Two-level nested list. A grandchild item changes; parents and uncle items must stay untouched.',
    before: `- Hlavní téma
  - Podtéma A, původní popis
  - Podtéma B, beze změny
    - Detail B1, beze změny
    - Detail B2, beze změny
- Druhé hlavní téma`,
    after: `- Hlavní téma
  - Podtéma A, podstatně rozšířený popis s novými fakty
  - Podtéma B, beze změny
    - Detail B1, beze změny
    - Detail B2, beze změny
- Druhé hlavní téma`,
  },

  'List: mixed ordered + bullet + todo': {
    label: 'List: mixed ordered + bullet + todo',
    description:
      'Three list shapes interleaved with paragraphs. Edit lands in the todo block only — the ordered and bullet blocks must stay clean.',
    before: `Plán hodiny:

1. Příprava materiálu
2. Krátká motivace
3. Hlavní aktivita

Postup hlavní aktivity:

- Žáci pracují ve dvojicích
- Učitel obchází třídu

Checklist pro učitele:

- [ ] Připravit pomůcky den předem
- [ ] Zkontrolovat AV techniku`,
    after: `Plán hodiny:

1. Příprava materiálu
2. Krátká motivace
3. Hlavní aktivita

Postup hlavní aktivity:

- Žáci pracují ve dvojicích
- Učitel obchází třídu

Checklist pro učitele:

- [x] Připravit pomůcky den předem
- [ ] Zkontrolovat AV techniku`,
  },

  // ───────────────────────────────────────────────────────────────────
  // Math — `remark-math` parses `$..$` as `inlineMath` and `$$..$$` as
  // `math` (block). The markdown plugin maps them to `inline_equation`
  // and `equation` voids respectively, both carrying `texExpression`.
  // ───────────────────────────────────────────────────────────────────

  'Math: inline expression change': {
    label: 'Math: inline expression change',
    description:
      'Two paragraphs each containing an inline $..$. Only one expression changes; the prose around it stays put.',
    before: `Klíčový vztah je $E = mc^2$, který popisuje ekvivalenci hmoty a energie.

Druhý vztah $a^2 + b^2 = c^2$ platí v pravoúhlém trojúhelníku.`,
    after: `Klíčový vztah je $E = m c^2 + \\epsilon$, který popisuje ekvivalenci hmoty a energie.

Druhý vztah $a^2 + b^2 = c^2$ platí v pravoúhlém trojúhelníku.`,
  },

  'Math: block equation edit': {
    label: 'Math: block equation edit',
    description:
      'Standalone $$..$$ block changed. Equations are atomic voids → whole-block delete + insert.',
    before: `Druhý Newtonův zákon zní:

$$
F = m \\cdot a
$$

Z toho plyne závislost zrychlení na síle.`,
    after: `Druhý Newtonův zákon zní:

$$
F = \\frac{dp}{dt}
$$

Z toho plyne závislost zrychlení na síle.`,
  },

  'Math: inline + block mixed': {
    label: 'Math: inline + block mixed',
    description:
      'Both inline $..$ AND block $$..$$ present. Only the inline math changes — the block equation must pass through byte-equal.',
    before: `V klasické mechanice platí $p = mv$ pro hybnost.

$$
E_k = \\frac{1}{2} m v^2
$$

Tento vztah platí pro pomalé objekty.`,
    after: `V relativistické mechanice platí $p = \\gamma m v$ pro hybnost.

$$
E_k = \\frac{1}{2} m v^2
$$

Tento vztah platí pro pomalé objekty.`,
  },

  'Math: add block equation': {
    label: 'Math: add block equation',
    description:
      'A pure insertion of a block equation. Overflow path → no pairId, no delete half.',
    before: 'Pythagorova věta se používá v geometrii.',
    after: `Pythagorova věta se používá v geometrii.

$$
a^2 + b^2 = c^2
$$`,
  },

  // ───────────────────────────────────────────────────────────────────
  // Media — image is standard markdown (`![alt](url)`); video and audio
  // are MDX components defined in `extra-plugins.tsx`. All three are
  // declared atomic so the diff engine produces clean whole-block pairs
  // instead of recursing into their (empty) void children.
  // ───────────────────────────────────────────────────────────────────

  // Media presets use real public URLs so the player frames actually
  // render. picsum.photos serves stable images by id (?id=N), W3Schools
  // hosts the canonical demo MP4/MP3 clips. The diff engine doesn't
  // care WHAT the URL points at — only that it changed — so the
  // semantics are identical to placeholder URLs but the demo looks real.
  'Media: image URL change': {
    label: 'Media: image URL change',
    description:
      'Same alt text, different image URL. Wrapper paragraph stays clean; the inline `img` void carries the URL change.',
    before: `Obrázek experimentu:

![Schéma obvodu](https://picsum.photos/id/180/300/180)

Žáci porovnají schéma s vlastním modelem.`,
    after: `Obrázek experimentu:

![Schéma obvodu](https://picsum.photos/id/250/300/180)

Žáci porovnají schéma s vlastním modelem.`,
  },

  'Media: image alt change': {
    label: 'Media: image alt change',
    description:
      'Image URL identical, only alt text changes. Tests that the diff catches accessibility-relevant attribute edits.',
    before: '![Stará popisek](https://picsum.photos/id/237/300/180)',
    after:
      '![Nový a podrobnější popisek obrázku](https://picsum.photos/id/237/300/180)',
  },

  'Media: add video block': {
    label: 'Media: add video block',
    description:
      'A `<video>` MDX block appended after the prose. Overflow insert; no delete half, no pairId.',
    before: 'Žáci si přečtou úvodní text a diskutují ve dvojicích.',
    after: `Žáci si přečtou úvodní text a diskutují ve dvojicích.

<video src="https://www.w3schools.com/html/mov_bbb.mp4" />`,
  },

  'Media: swap video for audio': {
    label: 'Media: swap video for audio',
    description:
      'A video is replaced by an audio recording at the same position. Different element types → whole-block delete + insert.',
    before: `Poslechový vstup k tématu:

<video src="https://www.w3schools.com/html/movie.mp4" />`,
    after: `Poslechový vstup k tématu:

<audio src="https://www.w3schools.com/html/horse.mp3" />`,
  },

  'Media: audio URL change': {
    label: 'Media: audio URL change',
    description:
      'Two audio blocks; only the URL on the first changes. Second block must pass through byte-equal.',
    before: `<audio src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" />

<audio src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" />`,
    after: `<audio src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" />

<audio src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" />`,
  },

  'MDX: activity contains list + table': {
    label: 'MDX: activity contains list + table',
    description:
      'An <activity> with structured content (list + table). Only one list item changes, but the whole activity gets paired because the container has nested elements.',
    before: `<phase name="Uvědomění">
  <activity name="Postup pokusu" duration="15">
    Postup:

    1. Sestavte obvod podle schématu.
    2. Změřte napětí na žárovce.
    3. Zapište výsledek.

    | Měření | Hodnota |
    |---|---|
    | U1 | 4,5 V |
    | U2 | 4,5 V |
  </activity>
</phase>`,
    after: `<phase name="Uvědomění">
  <activity name="Postup pokusu" duration="15">
    Postup:

    1. Sestavte obvod podle schématu.
    2. Změřte napětí na obou žárovkách paralelně.
    3. Zapište výsledek.

    | Měření | Hodnota |
    |---|---|
    | U1 | 4,5 V |
    | U2 | 4,5 V |
  </activity>
</phase>`,
  },
};

export const DIFF_PRESET_KEYS = Object.keys(DIFF_PRESETS);
