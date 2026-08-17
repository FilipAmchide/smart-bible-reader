import type { BibleBook, BookCategory, Testament } from "@sbr/shared-types";

/**
 * Table compacte : [code USFM, nom FR, nom EN, nom ES, nom DE, nb. chapitres].
 * Ordre = ordre canonique protestant (1 à 66). Regroupée par testament/catégorie
 * ci-dessous pour garder la correspondance évidente à la relecture.
 */
type Row = [string, string, string, string, string, number];

const LAW: Row[] = [
  ["GEN", "Genèse", "Genesis", "Génesis", "Genesis", 50],
  ["EXO", "Exode", "Exodus", "Éxodo", "Exodus", 40],
  ["LEV", "Lévitique", "Leviticus", "Levítico", "Levitikus", 27],
  ["NUM", "Nombres", "Numbers", "Números", "Numeri", 36],
  ["DEU", "Deutéronome", "Deuteronomy", "Deuteronomio", "Deuteronomium", 34],
];

const HISTORY_OT: Row[] = [
  ["JOS", "Josué", "Joshua", "Josué", "Josua", 24],
  ["JDG", "Juges", "Judges", "Jueces", "Richter", 21],
  ["RUT", "Ruth", "Ruth", "Rut", "Rut", 4],
  ["1SA", "1 Samuel", "1 Samuel", "1 Samuel", "1. Samuel", 31],
  ["2SA", "2 Samuel", "2 Samuel", "2 Samuel", "2. Samuel", 24],
  ["1KI", "1 Rois", "1 Kings", "1 Reyes", "1. Könige", 22],
  ["2KI", "2 Rois", "2 Kings", "2 Reyes", "2. Könige", 25],
  ["1CH", "1 Chroniques", "1 Chronicles", "1 Crónicas", "1. Chronik", 29],
  ["2CH", "2 Chroniques", "2 Chronicles", "2 Crónicas", "2. Chronik", 36],
  ["EZR", "Esdras", "Ezra", "Esdras", "Esra", 10],
  ["NEH", "Néhémie", "Nehemiah", "Nehemías", "Nehemia", 13],
  ["EST", "Esther", "Esther", "Ester", "Ester", 10],
];

const WISDOM: Row[] = [
  ["JOB", "Job", "Job", "Job", "Hiob", 42],
  ["PSA", "Psaumes", "Psalms", "Salmos", "Psalmen", 150],
  ["PRO", "Proverbes", "Proverbs", "Proverbios", "Sprüche", 31],
  ["ECC", "Ecclésiaste", "Ecclesiastes", "Eclesiastés", "Prediger", 12],
  ["SNG", "Cantique des Cantiques", "Song of Solomon", "Cantar de los Cantares", "Hoheslied", 8],
];

const MAJOR_PROPHETS: Row[] = [
  ["ISA", "Ésaïe", "Isaiah", "Isaías", "Jesaja", 66],
  ["JER", "Jérémie", "Jeremiah", "Jeremías", "Jeremia", 52],
  ["LAM", "Lamentations", "Lamentations", "Lamentaciones", "Klagelieder", 5],
  ["EZK", "Ézéchiel", "Ezekiel", "Ezequiel", "Hesekiel", 48],
  ["DAN", "Daniel", "Daniel", "Daniel", "Daniel", 12],
];

const MINOR_PROPHETS: Row[] = [
  ["HOS", "Osée", "Hosea", "Oseas", "Hosea", 14],
  ["JOL", "Joël", "Joel", "Joel", "Joel", 3],
  ["AMO", "Amos", "Amos", "Amós", "Amos", 9],
  ["OBA", "Abdias", "Obadiah", "Abdías", "Obadja", 1],
  ["JON", "Jonas", "Jonah", "Jonás", "Jona", 4],
  ["MIC", "Michée", "Micah", "Miqueas", "Micha", 7],
  ["NAM", "Nahum", "Nahum", "Nahúm", "Nahum", 3],
  ["HAB", "Habacuc", "Habakkuk", "Habacuc", "Habakuk", 3],
  ["ZEP", "Sophonie", "Zephaniah", "Sofonías", "Zefanja", 3],
  ["HAG", "Aggée", "Haggai", "Hageo", "Haggai", 2],
  ["ZEC", "Zacharie", "Zechariah", "Zacarías", "Sacharja", 14],
  ["MAL", "Malachie", "Malachi", "Malaquías", "Maleachi", 4],
];

const GOSPELS: Row[] = [
  ["MAT", "Matthieu", "Matthew", "Mateo", "Matthäus", 28],
  ["MRK", "Marc", "Mark", "Marcos", "Markus", 16],
  ["LUK", "Luc", "Luke", "Lucas", "Lukas", 24],
  ["JHN", "Jean", "John", "Juan", "Johannes", 21],
];

const HISTORY_NT: Row[] = [["ACT", "Actes", "Acts", "Hechos", "Apostelgeschichte", 28]];

const PAULINE_EPISTLES: Row[] = [
  ["ROM", "Romains", "Romans", "Romanos", "Römer", 16],
  ["1CO", "1 Corinthiens", "1 Corinthians", "1 Corintios", "1. Korinther", 16],
  ["2CO", "2 Corinthiens", "2 Corinthians", "2 Corintios", "2. Korinther", 13],
  ["GAL", "Galates", "Galatians", "Gálatas", "Galater", 6],
  ["EPH", "Éphésiens", "Ephesians", "Efesios", "Epheser", 6],
  ["PHP", "Philippiens", "Philippians", "Filipenses", "Philipper", 4],
  ["COL", "Colossiens", "Colossians", "Colosenses", "Kolosser", 4],
  ["1TH", "1 Thessaloniciens", "1 Thessalonians", "1 Tesalonicenses", "1. Thessalonicher", 5],
  ["2TH", "2 Thessaloniciens", "2 Thessalonians", "2 Tesalonicenses", "2. Thessalonicher", 3],
  ["1TI", "1 Timothée", "1 Timothy", "1 Timoteo", "1. Timotheus", 6],
  ["2TI", "2 Timothée", "2 Timothy", "2 Timoteo", "2. Timotheus", 4],
  ["TIT", "Tite", "Titus", "Tito", "Titus", 3],
  ["PHM", "Philémon", "Philemon", "Filemón", "Philemon", 1],
];

const GENERAL_EPISTLES: Row[] = [
  ["HEB", "Hébreux", "Hebrews", "Hebreos", "Hebräer", 13],
  ["JAS", "Jacques", "James", "Santiago", "Jakobus", 5],
  ["1PE", "1 Pierre", "1 Peter", "1 Pedro", "1. Petrus", 5],
  ["2PE", "2 Pierre", "2 Peter", "2 Pedro", "2. Petrus", 3],
  ["1JN", "1 Jean", "1 John", "1 Juan", "1. Johannes", 5],
  ["2JN", "2 Jean", "2 John", "2 Juan", "2. Johannes", 1],
  ["3JN", "3 Jean", "3 John", "3 Juan", "3. Johannes", 1],
  ["JUD", "Jude", "Jude", "Judas", "Judas", 1],
];

const APOCALYPTIC: Row[] = [["REV", "Apocalypse", "Revelation", "Apocalipsis", "Offenbarung", 22]];

const GROUPS: Array<{ testament: Testament; category: BookCategory; rows: Row[] }> = [
  { testament: "AT", category: "law", rows: LAW },
  { testament: "AT", category: "history_ot", rows: HISTORY_OT },
  { testament: "AT", category: "wisdom", rows: WISDOM },
  { testament: "AT", category: "major_prophets", rows: MAJOR_PROPHETS },
  { testament: "AT", category: "minor_prophets", rows: MINOR_PROPHETS },
  { testament: "NT", category: "gospel", rows: GOSPELS },
  { testament: "NT", category: "history_nt", rows: HISTORY_NT },
  { testament: "NT", category: "pauline_epistles", rows: PAULINE_EPISTLES },
  { testament: "NT", category: "general_epistles", rows: GENERAL_EPISTLES },
  { testament: "NT", category: "apocalyptic", rows: APOCALYPTIC },
];

let order = 0;
export const bibleBooks: BibleBook[] = GROUPS.flatMap(({ testament, category, rows }) =>
  rows.map(([code, fr, en, es, de, chapterCount]) => {
    order += 1;
    return {
      code,
      names: { fr, en, es, de },
      testament,
      category,
      chapterCount,
      canonicalOrder: order,
    };
  }),
);

// Garde-fous exécutés au chargement du module : le référentiel ne doit
// jamais dériver silencieusement des faits canoniques qu'il encode.
if (bibleBooks.length !== 66) {
  throw new Error(`@sbr/bible-data: attendu 66 livres, trouvé ${bibleBooks.length}`);
}
const totalChapters = bibleBooks.reduce((sum, b) => sum + b.chapterCount, 0);
if (totalChapters !== 1189) {
  throw new Error(`@sbr/bible-data: attendu 1189 chapitres au total, trouvé ${totalChapters}`);
}
