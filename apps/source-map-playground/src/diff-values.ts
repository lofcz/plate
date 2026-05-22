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
