// Decide se um anúncio é CARRO (passeio / SUV / picape leve).
// Fontes com categoria "carros" já vêm filtradas; isto é a rede de segurança
// e o filtro principal de fontes que misturam motos, caminhões etc.

const NAO_CARRO = [
  /\bMOTO(CICLETA|NETA)?S?\b/, /\bCICLOMOTOR\b/, /\bSCOOTER\b/, /\bQUADRICICLO\b/, /\bTRICICLO\b/,
  /\bCAMINH(AO|ÃO|OES|ÕES)\b/, /\bONIBUS\b/, /\bÔNIBUS\b/, /\bMICRO-?ONIBUS\b/, /\bMICRO-?ÔNIBUS\b/,
  /\bTRATOR\b/, /\bRETRO-?ESCAVADEIRA\b/, /\bESCAVADEIRA\b/, /\bEMPILHADEIRA\b/, /\bCOLHEITADEIRA\b/,
  /\bREBOQUE\b/, /\bSEMI-?REBOQUE\b/, /\bCARRETA\b/, /\bCAVALO MEC/, /\bEMBARCA(CAO|ÇÃO)\b/, /\bLANCHA\b/,
  /\bJET-?SKI\b/, /\bAERONAVE\b/, /\bHELIC(OPTERO|ÓPTERO)\b/, /\bBICICLETA\b/, /\bSUCATA\b/,
  // modelos de moto comuns
  /\bCG\s?\d{3}\b/, /\bCG1[0-9]{2}\b/, /\bBIZ\b/, /\bPOP\s?1[01]0\b/, /\bFAN\s?1[256]0\b/, /\bTITAN\b/, /\bXRE\b/,
  /\bNXR\b/, /\bBROS\b/, /\bCB\s?\d{3}/, /\bCBR\b/, /\bFAZER\b/, /\bYBR\b/, /\bFACTOR\b/, /\bLANDER\b/, /\bNMAX\b/,
  /\bPCX\b/, /\bXTZ\b/, /\bCROSSER\b/, /\bBURGMAN\b/, /\bNEO\s?1[12]5\b/,
  // caminhões / pesados
  /\bCARGO\s?\d{3,4}/, /\b\d{1,2}\.\d{3}\b(?!,)/, /\bACCELO\b/, /\bATEGO\b/, /\bAXOR\b/, /\bCONSTELLATION\b/,
  /\bDELIVERY\s?\d/, /\bSCANIA\b/, /\bIVECO\b/, /\bVM\s?\d{3}\b/, /\bFH\s?\d{3}\b/,
  // outros segmentos
  /\bIM(OVEL|ÓVEL)\b/, /\bTERRENO\b/, /\bAPARTAMENTO\b/,
];

// Se aparecer um destes, é carro mesmo que haja outro termo "não carro" (lote misto).
const MODELOS_CARRO = [
  'GOL', 'UNO', 'PALIO', 'SIENA', 'STRADA', 'MOBI', 'ARGO', 'CRONOS', 'TORO', 'DOBLO', 'IDEA', 'PUNTO', 'STILO',
  'FIORINO', 'ONIX', 'PRISMA', 'CELTA', 'CORSA', 'CLASSIC', 'COBALT', 'SPIN', 'TRACKER', 'CRUZE', 'S10', 'AGILE',
  'MONTANA', 'VECTRA', 'ASTRA', 'MERIVA', 'ZAFIRA', 'CAPTIVA', 'EQUINOX', 'POLO', 'VIRTUS', 'VOYAGE', 'FOX',
  'SAVEIRO', 'JETTA', 'T-CROSS', 'NIVUS', 'TIGUAN', 'AMAROK', 'UP', 'PASSAT', 'GOLF', 'SPACEFOX', 'KA', 'FIESTA',
  'FOCUS', 'ECOSPORT', 'RANGER', 'FUSION', 'ESCORT', 'SANDERO', 'LOGAN', 'DUSTER', 'KWID', 'CLIO', 'MEGANE',
  'SYMBOL', 'CAPTUR', 'OROCH', 'COROLLA', 'ETIOS', 'YARIS', 'HILUX', 'SW4', 'RAV4', 'CIVIC', 'FIT', 'CITY',
  'HR-V', 'HRV', 'WR-V', 'HB20', 'CRETA', 'TUCSON', 'IX35', 'SANTA FE', 'KICKS', 'VERSA', 'MARCH', 'SENTRA',
  'FRONTIER', 'LIVINA', '208', '2008', '207', '206', '307', '308', '3008', 'C3', 'C4', 'AIRCROSS', 'RENEGADE',
  'COMPASS', 'COMMANDER', 'PAJERO', 'L200', 'ASX', 'OUTLANDER', 'LANCER', 'SPORTAGE', 'CERATO', 'SOUL',
  'PICANTO', 'TIGGO', 'QQ', 'CELER', 'POINTER', 'TRAFIC', 'MASTER', 'KANGOO', 'DOBLÒ',
];

// Nunca entram, mesmo citando modelo de carro (não é um carro inteiro/rodando).
const BLOQUEIO_FORTE = [
  // ônibus, marcas de moto, caminhões Mercedes linha L, imóveis
  /\bONIBUS\b/, /\bMICRO-?ONIBUS\b/, /\bKASINSKI\b/, /\bDAFRA\b/, /\bSHINERAY\b/, /\bTRAXX\b/, /\bHAOJUE\b/,
  /\bMERCEDES[- ]?BENZ L\s?1\d{3}\b/, /\bMB L\s?1\d{3}\b/, /\bAPTO\b/, /\bAPARTAMENTO\b/,
  // modelos de moto inequívocos (às vezes aparecem em categorias "Carros")
  /\bNXR\b/, /\bBROS\b/, /\bCG\s?1\d{2}\b/, /\bBIZ\b/, /\bXRE\b/, /\bYBR\b/, /\bCBR\b/, /\bNMAX\b/, /\bPCX\b/, /\bXTZ\b/, /\bFACTOR\b/, /\bBURGMAN\b/, /\bPOP\s?1[01]0\b/, /\bCB\s?\d{3}\b/,
/\bREBOQUES?\b/, /\bSEMI-?REBOQUE\b/, /\bCARGO\s?\d{3,4}/, /\b\d-?EIXOS\b/, /\bCAMINH(AO|ÃO|OES|ÕES)\b/, /\bMOTOCICLETA\b/,/\bCARCA(CA|ÇA)S?\b/, /\bSOMENTE LATARIA\b/, /\bTRAILERS?\b/, /\bSUCATAS?\b/, /\bPE(CAS|ÇAS)\b/, /\bMOTOR(ES)? (AVULSO|DE)\b/];

function norm(s) {
  // sem acentos: "ÔNIBUS" -> "ONIBUS", "CAMINHÃO" -> "CAMINHAO" (o \b do JS não enxerga letras acentuadas)
  const semAcento = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return ' ' + semAcento.toUpperCase().replace(/[\/,()]/g, ' ').replace(/\s+/g, ' ') + ' ';
}

export function temModeloCarro(texto) {
  const t = norm(texto);
  return MODELOS_CARRO.some((m) => t.includes(' ' + m + ' '));
}

export function ehCarro(texto = '', { categoriaCarro = false } = {}) {
  const t = norm(texto);
  if (BLOQUEIO_FORTE.some((re) => re.test(t))) return false;
  const bloqueado = NAO_CARRO.some((re) => re.test(t));
  if (!bloqueado) return true;
  // Lote misto (ex.: "HONDA CG125 E FIAT UNO MILLE") — mantém, pois contém um carro.
  if (temModeloCarro(texto)) return true;
  // Categoria da fonte já garante carro e o "bloqueio" veio de falso positivo (ex.: número 1.600).
  return categoriaCarro && !/MOTO|CAMINH|ONIBUS|ÔNIBUS|TRATOR|SUCATA/.test(t);
}
