/**
 * FILE: seed-data.js
 * USAGE: Shared seed contacts generator — pure JS, works in both Electron and browser.
 * @returns {Array} 75 sample contacts
 */
export function generateSeedContacts() {
  const COLORS = [
    "#007AFF",
    "#34C759",
    "#FF9500",
    "#FF2D55",
    "#5856D6",
    "#AF52DE",
    "#FFCC00",
    "#30D158",
    "#64D2FF",
    "#BF5AF2",
    "#FF375F",
    "#0071E3",
  ];
  const CATEGORIES = ["friends", "family", "work"];
  const FIRST_NAMES =
    "Alessandro,Alice,Anna,Antonio,Arianna,Beatrice,Benedetta,Bruno,Camilla,Carlo,Caterina,Chiara,Claudio,Cristina,Daniela,Daniele,Davide,Debora,Diego,Elena,Elisa,Emanuele,Emma,Erica,Fabio,Federica,Filippo,Francesca,Gabriele,Gaia,Gianni,Giorgia,Giovanni,Giulia,Giuseppe,Laura,Leonardo,Letizia,Lorenzo,Luca,Maddalena,Manuel,Margherita,Marco,Martina,Massimo,Matilde,Matteo,Michele,Nicola,Nicolò,Olivia,Paolo,Patrizia,Pietro,Rachele,Raffaele,Roberta,Roberto,Sara,Silvia,Simone,Sofia,Stefano,Susanna,Tommaso,Tiziana,Valentina,Valerio,Veronica,Vittorio,Zoe".split(
      ",",
    );
  const LAST_NAMES =
    "Agosti,Alberti,Amato,Ambrosini,Barbieri,Bellini,Bernardi,Bianchi,Cattaneo,Colombo,Contarini,Conti,Corsi,Costantini,Costa,De Angelis,De Luca,Donati,Durazzo,Esposito,Fabbri,Farina,Ferrari,Ferretti,Fiorentini,Fontana,Foscari,Franco,Frattini,Galli,Gallo,Gatta,Gentile,Giannini,Giordano,Grassi,Greco,Leone,Lombardi,Lorusso,Lucchesi,Mancini,Marchetti,Mariani,Martinelli,Messori,Milani,Montanari,Moretti,Neri,Niccolai,Orlandi,Palmieri,Parrini,Pellegrini,Ricci,Rinaldi,Rizzi,Rizzo,Romano,Rossi,Ruggeri,Salvadori,Santini,Sartori,Serra,Sforza,Taviani,Testa,Valenti,Vanni,Venturi,Verdi,Vitali,Zanella".split(
      ",",
    );
  const CITIES =
    "Ancona,Bari,Bergamo,Bolzano,Bologna,Brescia,Cagliari,Catania,Como,Cremona,Ferrara,Firenze,Genova,Lecco,Lucca,Mantova,Milano,Modena,Napoli,Palermo,Parma,Pavia,Perugia,Pescara,Pisa,Prato,Ravenna,Reggio Emilia,Roma,Salerno,Sassari,Siena,Torino,Trento,Trieste,Udine,Venezia,Verona,Vicenza".split(
      ",",
    );
  const STREETS =
    "Via Roma,Corso Italia,Piazza Duomo,Via Garibaldi,Corso Vittorio Emanuele,Via Mazzini,Piazza della Repubblica,Via Dante Alighieri,Corso Umberto I,Via Cavour,Piazza Navona,Lungarno,Via Indipendenza,Corso Sempione,Via Etnea,Piazza del Popolo,Via Manzoni,Corso Venezia,Via IV Novembre,Piazza San Marco".split(
      ",",
    );
  const NOTES = [
    "",
    "Amico di vecchia data",
    "Collega università",
    "Vicino di casa",
    "Compagno di corso",
    "Fratello",
    "Sorella",
    "Cugino",
    "Cugina",
    "Zio",
    "Nonna",
    "Team lead",
    "Collega reparto design",
    "Responsabile HR",
    "CTO startup",
    "DevOps engineer",
    "Coach sportivo",
    "Amico di calcetto",
    "Amico di serate",
    "Compagna di palestra",
    "Mentor",
    "Nuovo assunto",
    "Amica del corso di yoga",
    "Conosciuto al corso di fotografia",
    "Ex collega",
    "Amico di montagna",
    "Amica di famiglia",
    "",
  ];
  const PHONE_PREFIXES = "320,328,331,334,337,339,340,344,345,347,348,355,356,366,367,375,377,378,388,389,390".split(
    ",",
  );
  const EMAIL_DOMAINS = ["gmail.com", "icloud.com", "libero.it", "tin.it"];

  const contacts = [];
  const seen = new Set();

  function pad(n) {
    return n.toString().padStart(2, "0");
  }

  function genPhone() {
    const p = PHONE_PREFIXES[Math.floor(Math.random() * PHONE_PREFIXES.length)];
    return "+39 " + p + " " + (100 + Math.floor(Math.random() * 899)) + " " + (1000 + Math.floor(Math.random() * 9000));
  }

  function genDate(i) {
    const d = new Date(2026, 0, 1);
    d.setDate(d.getDate() + i * 4 + (Math.floor(i * 1.7) % 28));
    const h = 8 + (i % 12);
    const mi = i % 60;
    return (
      d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(h) + ":" + pad(mi) + ":00.000Z"
    );
  }

  function genAddress(i) {
    return STREETS[i % STREETS.length] + " " + (1 + Math.floor(Math.random() * 200)) + ", " + CITIES[i % CITIES.length];
  }

  function genEmail(first, last) {
    const f = first
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const l = last
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return f + "." + l + "@" + EMAIL_DOMAINS[Math.floor(Math.random() * EMAIL_DOMAINS.length)];
  }

  let idx = 0;
  while (contacts.length < 75 && idx < 5000) {
    const fn = FIRST_NAMES[idx % FIRST_NAMES.length];
    const ln = LAST_NAMES[idx % LAST_NAMES.length];
    const key = fn + "|" + ln;
    if (!seen.has(key)) {
      seen.add(key);
      contacts.push({
        id: String(contacts.length + 1),
        firstName: fn,
        lastName: ln,
        phone: genPhone(),
        email: genEmail(fn, ln),
        address: genAddress(contacts.length),
        category: CATEGORIES[contacts.length % CATEGORIES.length],
        avatarColor: COLORS[contacts.length % COLORS.length],
        notes: NOTES[contacts.length % NOTES.length] || "",
        createdAt: genDate(contacts.length),
        updatedAt: genDate(contacts.length + 37),
      });
    }
    idx++;
  }

  return contacts;
}
