// Classifica o TIPO de veículo de um anúncio (carro, moto, caminhão, ônibus, máquina, reboque, náutico, aeronave).
// Devolve null para o que não é um veículo inteiro (sucata, carcaça, peças) ou não é veículo (imóveis, eletrônicos).
//
// Ordem de decisão:
//   1. descarta sucata/peças/imóveis;
//   2. usa a categoria informada pela fonte ("Motos", "Caminhões"...) quando houver;
//   3. senão, reconhece pelo texto (modelos e palavras-chave).

export const TIPOS = {
  carro: 'Carros e utilitários',
  moto: 'Motos',
  caminhao: 'Caminhões',
  onibus: 'Ônibus e vans',
  maquina: 'Tratores e máquinas',
  reboque: 'Reboques e carretas',
  nautico: 'Barcos e jet skis',
  aeronave: 'Aeronaves',
};

// Não é um veículo inteiro/rodando, ou não é veículo.
const DESCARTE = [
  /\bSUCATAS?\b/, /\bCARCACAS?\b/, /\bSOMENTE LATARIA\b/, /\bPECAS\b/, /\bMOTOR(ES)? (AVULSO|DE)\b/, /\bSUCATEADO\b/,
  /\bCELULAR(ES)?\b/, /\bSMARTPHONE\b/, /\bIPHONE\b/, /\bNOTEBOOK\b/, /\bTABLET\b/, /\bTELEVISOR\b/, /\bSMART ?TV\b/, /\bGELADEIRA\b/,
  /\bIMOVEL\b/, /\bIMOVEIS\b/, /\bTERRENO\b/, /\bAPARTAMENTO\b/, /\bAPTO\b/, /\bCASA RESIDENCIAL\b/, /\bGALPAO\b/,
];

const REGRAS = [
  ['reboque', [/\bSEMI-?REBOQUES?\b/, /\bREBOQUES?\b/, /\bCARRETAS?\b/, /\bTRAILERS?\b/, /\bCARRETINHA\b/, /\bR\/\s?\w/, /\bSR\/\s?\w/]],
  ['aeronave', [/\bAERONAVES?\b/, /\bAVIAO\b/, /\bHELICOPTERO\b/, /\bMONOMOTOR\b/, /\bCESSNA\b/, /\bEMBRAER\b/, /\bPIPER\b/]],
  ['nautico', [/\bEMBARCACA(O|OES)\b/, /\bLANCHAS?\b/, /\bBARCOS?\b/, /\bJET-?SKIS?\b/, /\bVELEIRO\b/, /\bNAUTIC/, /\bMOTO AQUATICA\b/, /\bSEA-?DOO\b/, /\bWAVE ?RUNNER\b/, /\bWAKE PRO\b/, /\bBOTE\b/]],
  ['caminhao', [/\bCAMINH(AO|OES)\b/, /\bCAVALO MECANICO\b/, /\bTRACTOR\b/, /\bCONSTEL(LATION|\.)?/, /\bCARGO\s?\d{3,4}/, /\bACCELO\b/, /\bATEGO\b/, /\bAXOR\b/,
    /\bACTROS\b/, /\bSCANIA\b/, /\bIVECO\b/, /\bSTRALIS\b/, /\bTECTOR\b/, /\bDAILY\b/, /\bVOLVO FH\b/, /\bFH\s?\d{3}\b/, /\bVM\s?\d{3}\b/, /\bDELIVERY\s?\d/,
    /\bWORKER\b/, /\bMERCEDES[- ]?BENZ L\s?1\d{3}\b/, /\bMB L\s?1\d{3}\b/, /\b\d{2}-\d{3}\b/, /\b\d{1,2}\.\d{3}\b(?!,)/, /\b\d-?EIXOS\b/]],
  ['maquina', [/\bTRATOR(ES)?\b/, /\bRETRO-?ESCAVADEIRA\b/, /\bESCAVADEIRA\b/, /\bEMPILHADEIRA\b/, /\bCOLHEITADEIRA\b/, /\bMOTONIVELADORA\b/,
    /\bPA CARREGADEIRA\b/, /\bROLO COMPACTADOR\b/, /\bPULVERIZADOR\b/, /\bPLANTADEIRA\b/, /\bSEMEADORA\b/, /\bGUINDASTE\b/, /\bMAQUINA AGRICOLA\b/,
    /\bVALTRA\b/, /\bMASSEY\b/, /\bNEW HOLLAND\b/, /\bJOHN DEERE\b/, /\bCATERPILLAR\b/, /\bCASE \d/, /\bJCB\b/]],
  ['onibus', [/\bONIBUS\b/, /\bMICRO-?ONIBUS\b/, /\bMICROONIBUS\b/, /\bMARCOPOLO\b/, /\bCOMIL\b/, /\bCAIO\b/, /\bIRIZAR\b/, /\bBUSSCAR\b/]],
  ['moto', [/\bMOTO(CICLETA|NETA)?S?\b/, /\bCICLOMOTOR\b/, /\bSCOOTER\b/, /\bQUADRICICLO\b/, /\bTRICICLO\b/, /\bKASINSKI\b/, /\bDAFRA\b/, /\bSHINERAY\b/,
    /\bTRAXX\b/, /\bHAOJUE\b/, /\bSUNDOWN\b/, /\bHARLEY\b/, /\bKAWASAKI\b/, /\bDUCATI\b/, /\bTRIUMPH\b/,
    /\bCG\s?1\d{2}\b/, /\bBIZ\b/, /\bPOP\s?1[01]0\b/, /\bFAN\s?1[256]0\b/, /\bTITAN\b/, /\bXRE\b/, /\bNXR\b/, /\bBROS\b/, /\bCB\s?\d{3}/, /\bCBR\b/,
    /\bFAZER\b/, /\bYBR\b/, /\bFACTOR\b/, /\bLANDER\b/, /\bNMAX\b/, /\bPCX\b/, /\bXTZ\b/, /\bCROSSER\b/, /\bBURGMAN\b/, /\bNEO\s?1[12]5\b/, /\bTWISTER\b/, /\bFALCON\b/]],
];

// Modelos de carro que "vencem" termos de outros tipos (lote misto: "HONDA CG125 E FIAT UNO MILLE").
const MODELOS_CARRO = [
  'GOL', 'UNO', 'PALIO', 'SIENA', 'STRADA', 'MOBI', 'ARGO', 'CRONOS', 'TORO', 'DOBLO', 'IDEA', 'PUNTO', 'STILO',
  'FIORINO', 'ONIX', 'PRISMA', 'CELTA', 'CORSA', 'CLASSIC', 'COBALT', 'SPIN', 'TRACKER', 'CRUZE', 'S10', 'AGILE',
  'MONTANA', 'VECTRA', 'ASTRA', 'MERIVA', 'ZAFIRA', 'CAPTIVA', 'EQUINOX', 'POLO', 'VIRTUS', 'VOYAGE', 'FOX',
  'SAVEIRO', 'JETTA', 'T-CROSS', 'NIVUS', 'TIGUAN', 'AMAROK', 'PASSAT', 'GOLF', 'SPACEFOX', 'FIESTA',
  'FOCUS', 'ECOSPORT', 'RANGER', 'FUSION', 'ESCORT', 'SANDERO', 'LOGAN', 'DUSTER', 'KWID', 'CLIO', 'MEGANE',
  'SYMBOL', 'CAPTUR', 'OROCH', 'COROLLA', 'ETIOS', 'YARIS', 'HILUX', 'SW4', 'RAV4', 'CIVIC', 'CITY',
  'HB20', 'CRETA', 'TUCSON', 'IX35', 'KICKS', 'VERSA', 'MARCH', 'SENTRA', 'FRONTIER', 'LIVINA', 'RENEGADE',
  'COMPASS', 'COMMANDER', 'PAJERO', 'L200', 'ASX', 'OUTLANDER', 'LANCER', 'SPORTAGE', 'CERATO', 'SOUL',
  'PICANTO', 'TIGGO', 'QQ', 'CELER', 'POINTER', 'KANGOO',
];

// Categoria da fonte -> tipo.
const CATEGORIA = [
  [/aeronave|avi[aã]o|helic/i, 'aeronave'],
  [/n[aá]utic|barco|embarca|lancha|jet/i, 'nautico'],
  [/trator|colheitadeira|m[aá]quina|agr[ií]col/i, 'maquina'],
  [/pesad/i, 'pesado'],
  [/reboque|carreta|semi/i, 'reboque'],
  [/[oô]nibus|micro/i, 'onibus'],
  [/caminh[aã]o|caminh[oõ]es|truck/i, 'caminhao'],
  [/moto|ciclomotor|motoneta/i, 'moto'],
  [/carro|autom[oó]ve|passeio|utilit|caminhonete|camioneta|picape|suv/i, 'carro'],
];

function norm(s) {
  // sem acentos: "ÔNIBUS" -> "ONIBUS" (o \b do JS não enxerga letras acentuadas)
  const semAcento = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return ' ' + semAcento.toUpperCase().replace(/[,()]/g, ' ').replace(/\s+/g, ' ') + ' ';
}

export function temModeloCarro(texto) {
  const t = norm(texto).replace(/\//g, ' ');
  return MODELOS_CARRO.some((m) => t.includes(' ' + m + ' '));
}

/**
 * @param {string} texto  título/descrição do lote
 * @param {string} [categoria]  categoria/subcategoria da fonte ("Motos", "Caminhões", "Carros"...)
 * @returns {keyof TIPOS | null}
 */
export function tipoVeiculo(texto = '', categoria = '') {
  const t = norm(texto);
  if (DESCARTE.some((re) => re.test(t))) return null;
  const doTexto = REGRAS.find(([, res]) => res.some((re) => re.test(t)))?.[0] || null;
  const daCategoria = CATEGORIA.find(([re]) => re.test(categoria || ''))?.[1] || null;
  // Categoria "Carros" com modelo de moto/caminhão no título: vale o texto (fontes erram a categoria).
  if (daCategoria === 'carro' && doTexto && !temModeloCarro(texto)) return doTexto;
  // Aeronave/barco só pela categoria não basta: há leiloeiros que cadastram celular e carro nessas categorias.
  if (['aeronave', 'nautico'].includes(daCategoria) && doTexto !== daCategoria) return doTexto || (temModeloCarro(texto) ? 'carro' : null);
  if (daCategoria === 'pesado') return doTexto && doTexto !== 'carro' ? doTexto : 'caminhao';
  if (daCategoria) return daCategoria;
  if (doTexto && doTexto !== 'carro' && temModeloCarro(texto) && ['moto', 'caminhao'].includes(doTexto)) return 'carro'; // lote misto
  return doTexto || 'carro';
}

// Compatibilidade: coletores antigos que só querem carros.
export function ehCarro(texto = '', { categoriaCarro = false } = {}) {
  return tipoVeiculo(texto, categoriaCarro ? 'Carros' : '') === 'carro';
}
