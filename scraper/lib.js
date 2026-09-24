// Utilitários compartilhados pelos coletores.

export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// fetch com user-agent de navegador, timeout e pequena pausa entre chamadas
// (educado com o servidor de origem).
export async function get(url, opts = {}) {
  await sleep(opts.delay ?? 800);
  const res = await fetch(url, {
    ...opts,
    headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9', ...(opts.headers || {}) },
    signal: AbortSignal.timeout(opts.timeout ?? 30000),
    redirect: opts.redirect ?? 'follow',
  });
  if (!res.ok && !(opts.redirect === 'manual' && res.status >= 300 && res.status < 400)) throw new Error(`${res.status} em ${url}`);
  return res;
}

// Decodifica entidades HTML (&#xCD; &amp; etc.)
export function decode(s = '') {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

export const clean = (s = '') => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// "R$ 9.961,50" -> 9961.5
export function brl(s) {
  if (s == null) return null;
  const m = String(s).match(/[\d.]+,\d{2}|\d[\d.]*/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// "25/09/2026" + "10:30" -> ISO em horário de Brasília (-03:00)
export function dataBR(d, h = '00:00') {
  const m = d && d.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const hm = (h && h.match(/\d{2}:\d{2}/)?.[0]) || '00:00';
  return `${m[3]}-${m[2]}-${m[1]}T${hm}:00-03:00`;
}

export function slug(s = '') {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Primeira letra maiúscula por palavra, mantendo siglas curtas (GM, VW, LTZ...).
export function titulo(s = '') {
  return s
    .toLowerCase()
    .replace(/(^|[\s/(-])([a-zà-ú])/g, (_, a, b) => a + b.toUpperCase())
    .replace(/\b(Gm|Vw|Bmw|Ltz|Lt|Lx|Gli|Glx|Xr3|Thp|Ks|Sd|Se|Xlt|Suv|Tsi|Fsi|Gti|Hb|Tdi|Cvt|Flex|Mpi|Dcc)\b/g, (m) =>
      m === 'Flex' ? m : m.toUpperCase()
    );
}

export const MARCAS = [
  'CHEVROLET', 'GM', 'VOLKSWAGEN', 'VW', 'FIAT', 'FORD', 'RENAULT', 'TOYOTA', 'HONDA', 'HYUNDAI',
  'NISSAN', 'PEUGEOT', 'CITROEN', 'CITROËN', 'JEEP', 'MITSUBISHI', 'KIA', 'BMW', 'MERCEDES-BENZ', 'MERCEDES',
  'AUDI', 'VOLVO', 'LAND ROVER', 'CAOA CHERY', 'CHERY', 'JAC', 'SUZUKI', 'SUBARU', 'DODGE', 'RAM', 'CHRYSLER',
  'PORSCHE', 'LEXUS', 'MINI', 'LR', 'BYD', 'GWM', 'TROLLER', 'SSANGYONG', 'LIFAN', 'SMART', 'JAGUAR', 'ALFA ROMEO',
];

const NORMALIZA_MARCA = { GM: 'Chevrolet', VW: 'Volkswagen', 'CITROËN': 'Citroën', CITROEN: 'Citroën', MERCEDES: 'Mercedes-Benz', LR: 'Land Rover', 'CAOA CHERY': 'Chery' };

export function marcaDe(texto = '') {
  const t = ' ' + texto.toUpperCase().replace(/[\/,()-]/g, ' ') + ' ';
  for (const m of MARCAS) if (t.includes(' ' + m + ' ')) return NORMALIZA_MARCA[m] || titulo(m);
  return null;
}

export function anoDe(texto = '') {
  // "2018/2019", "ANO 14/15", "Ano 2008", "- 2006" (não pega "GLI 2000")
  const ano2 = (a) => (2000 + +a > new Date().getFullYear() + 1 ? 1900 + +a : 2000 + +a);
  let m = texto.match(/\b(19[5-9]\d|20[0-3]\d)\s*\/\s*(19[5-9]\d|20[0-3]\d)\b/);
  if (m) return Math.max(+m[1], +m[2]);
  m = texto.match(/\bANO\s*(\d{2})\s*\/\s*(\d{2})\b/i);
  if (m) return Math.max(ano2(m[1]), ano2(m[2]));
  m = texto.match(/(?:\bANO\s*|-\s*)(19[5-9]\d|20[0-3]\d)\b/i);
  return m ? +m[1] : null;
}

// "VEÍCULO MARCA FORD, MODELO ESCORT XR3 - ANO 2010/2011" -> "Ford Escort XR3"
export function limparTitulo(s = '') {
  return titulo(
    s
      .replace(/^nova oportunidade de adquirir (esse|este) ve[ií]culo:\s*/i, '')
      .replace(/\b(direitos sobre\s+)?ve[ií]culos?\b\s*/gi, (m, d) => (d ? 'Direitos sobre ' : ''))
      .replace(/\b(marcas?|modelos?)\s*:?\s*/gi, '')
      .replace(/,?\s*-?\s*\bano\b\s*[\d/ ]+$/i, '')
      .replace(/\bGM\s*-\s*CHEVROLET\b/i, 'Chevrolet')
      .replace(/\s*,\s*/g, ' ')
      .replace(/\bplacas?\s+[a-z]{3}-?\d[a-z0-9]\d{2}\b.*$/i, '')
      // só pares "2012 2013" / "fab/mod 2009/2010" (não corta modelos como "Peugeot 2008")
      .replace(/\s+(fab\/mod\s*)?(19|20)\d{2}\s*\/?\s*(19|20)\d{2}\b.*$/i, '')
      .replace(/\s+-\s*$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  ).replace(/^Carros?\s+/, '');
}
