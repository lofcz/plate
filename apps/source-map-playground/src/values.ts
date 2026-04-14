export const LESSON_PLAN = `# Elektrické obvody hrou: Série vs. Paralela (8. třída)

<lesson_info>
  <info_grade>
    8\\. ročník ZŠ, 45 minut
  </info_grade>

  <info_learns>
    Žáci na základě experimentu vysvětlí rozdíl mezi sériovým a paralelním zapojením spotřebičů. Naučí se předpovědět chování obvodu při poruše jedné součástky a zdůvodnit využití konkrétního zapojení v praxi (domácnost, vánoční osvětlení).
  </info_learns>

  <info_why>
    Pochopení elektrických obvodů je klíčové pro bezpečné zacházení s elektrospotřebiči a pochopení fungování domácí elektroinstalace. Pomáhá žákům pochopit, proč při výpadku jedné žárovky v bytě ostatní svítí, zatímco u starých vánočních řetězů zhasne vše.
  </info_why>

  <info_assessment>
    Žák správně sestaví oba typy obvodů podle zadání, vysvětlí princip průtoku proudu v uzlech a větvích a určí typ zapojení u reálných příkladů z praxe.
  </info_assessment>

  <info_rvp>
    F-9-3-02: Žák sestaví správně podle schématu elektrický obvod a analyzuje jeho části.
    F-9-3-03: Žák rozliší sériové a paralelní zapojení spotřebičů v obvodu.
  </info_rvp>

  <info_materials>
    Sady pro každou skupinu (3–4 žáci): 1x plochá baterie (4,5 V) nebo regulovatelný zdroj, 2x stejná žárovka v objímce (např. 3,5 V / 0,2 A), 1x spínač, minimálně 6–8 propojovacích vodičů.
  </info_materials>
</lesson_info>

<phase name="Evokace">
  <activity name="Záhada vánočního řetězu" duration="5">
    **Předestřete žákům problémovou situaci s nefunkčním vánočním osvětlením.**

    Představte si, že věšíte na stromeček starý vánoční řetěz. Zapojíte ho do zásuvky a nic se neděje. Zjistíte, že jedna jediná žárovka je prasklá. Jak je možné, že kvůli jedné malé žárovce nesvítí zbylých čtyřicet? Nechte žáky volně diskutovat a zapisujte jejich nápady na tabuli (např. "přerušený proud", "všechno je v jedné řadě"). Cílem je dospět k myšlence, že proud musí mít cestu, aby mohl téct.
  </activity>
</phase>

<phase name="Uvědomění">
  <activity name="Badatelská mise 1: Za sebou" duration="15">
    **Vyzvěte žáky, aby ve skupinách sestavili obvod, kde jsou dvě žárovky a spínač zapojeny v jedné řadě za sebou (sériově).**

    Žáci propojují zdroj, spínač a dvě žárovky tak, aby vytvořili jeden uzavřený kruh. Po sestavení sledují intenzitu svitu žárovek. Poté dostanou úkol: "Co se stane, když jednu žárovku z objímky vyšroubujete?" Žáci zjistí, že druhá žárovka okamžitě zhasne.

    Každá skupina vyplní tabulku:

    | Stav obvodu | Žárovka A | Žárovka B |
    |---|---|---|
    | Obě zapojeny | svítí slabě | svítí slabě |
    | A vyšroubována | nesvítí | nesvítí |
    | B vyšroubována | nesvítí | nesvítí |

    > Upozorněte žáky, aby při rozpojování obvodu vždy nejprve vypnuli spínač, i když pracují s bezpečným napětím, aby si vytvořili správný návyk pro práci s elektřinou.
  </activity>

  <activity name="Badatelská mise 2: Vedle sebe" duration="15">
    **Zadejte žákům úkol přestavět obvod tak, aby každá žárovka měla svou vlastní cestu ke zdroji (paralelně).**

    Žáci nyní vytvářejí obvod s "uzly". Spínač může být v hlavní větvi nebo u jedné z žárovek (nechte je experimentovat). Klíčovým pozorováním je, že žárovky svítí jasněji než v předchozím případě.

    Postup experimentu:

    1. Zapojte obvod podle schématu
       - Připojte kladný pól ke spínači
       - Spínač propojte s uzlem A
    2. Změřte jas obou žárovek
       - Porovnejte se sériovým zapojením
       - Zapište výsledky do tabulky
    3. Vyšroubujte jednu žárovku
       - Pozorujte, co se stane s druhou
       - Diskutujte ve skupině proč

    | Stav obvodu | Žárovka A | Žárovka B | Celkový proud |
    |---|---|---|---|
    | Obě zapojeny | svítí jasně | svítí jasně | vyšší |
    | A vyšroubována | nesvítí | svítí jasně | nižší |
    | B vyšroubována | svítí jasně | nesvítí | nižší |

    Vysvětlete, že proud se v uzlu rozdělil a pokračoval druhou větví, která zůstala uzavřená.
  </activity>
</phase>

<phase name="Reflexe">
  <activity name="Analýza a praxe" duration="10">
    **Shrňte výsledky pokusů a propojte je s reálným světem pomocí otázek a odpovědí.**

    Diskutujte se žáky o následujících bodech:

    1. Proč žárovky v sérii svítily méně?
       - Napětí zdroje se dělí mezi ně
       - Každá má k dispozici jen část energie
    2. Proč žárovky v paralele svítily více?
       - Každá je připojena přímo na plné napětí zdroje
    3. Jak jsou zapojeny zásuvky u vás doma?
       - Paralelně
       - Kdyby byly sériově, museli byste mít zapnutý vysavač, aby vám svítila lampička
    4. Jak byste zapojili vypínač k lustru?
       - Sériově s lustrem, aby ho mohl přerušit
       - Ale paralelně k ostatním spotřebičům v domě

    Srovnání obou typů zapojení:

    | Vlastnost | Sériové | Paralelní |
    |---|---|---|
    | Proud | stejný ve všech prvcích | dělí se v uzlech |
    | Napětí | dělí se mezi prvky | stejné na všech prvcích |
    | Porucha jednoho prvku | vyřadí celý obvod | ostatní fungují dál |
    | Příklad z praxe | vánoční řetěz (starý) | zásuvky v domácnosti |

    > Pro vizualizaci můžete použít analogii s vodou: Sériové zapojení je jako jedna trubka s dvěma turbínami za sebou. Paralelní zapojení je jako řeka, která se větví do dvou ramen a v každém je jedna turbína.
  </activity>
</phase>
`;

export const MIXED_GFM = `# GFM Mixed Content

A paragraph with **bold**, *italic*, \`inline code\`, and ~~strikethrough~~.

## Table

| Element | Symbol | State |
|---------|--------|-------|
| Hydrogen | H | gas |
| Oxygen | O | gas |
| Iron | Fe | solid |

## Lists

- Bullet A
  - Nested B
  - Nested C
- Bullet D

1. First
2. Second
3. Third

## Code

\`\`\`python
def hello():
    print("world")
\`\`\`

## Blockquote

> This is a blockquote
> spanning multiple lines.

---

Final paragraph.
`;

export const PRESETS: Record<string, string> = {
  'Lesson plan (MDX)': LESSON_PLAN,
  'Mixed GFM': MIXED_GFM,
  Blank: '',
};
