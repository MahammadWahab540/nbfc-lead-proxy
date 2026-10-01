/**
 * Jodo Flex Product & Fee Configuration Registry
 * 
 * Maps Salesforce products and tenures to Jodo Grade codes,
 * and maintains configurable fee components.
 */

// All 46 verified production grades configured for NxtWave in Jodo
const VALID_JODO_GRADES = new Set([
  "EDGE_-_12_EMI", "EDGE_-_18_EMI", "EDGE_-_24_EMI", "EDGE_-_30_EMI", "EDGE_-_36_EMI",
  "EDGE_PLUS_12_EMI", "EDGE_PLUS_24_EMI", "EDGE_PLUS_36_EMI",
  "GENIUS_-_12_EMI", "GENIUS_-_18_EMI", "GENIUS_-_24_EMI", "GENIUS_-_30_EMI", "GENIUS_-_36_EMI",
  "GENIUS_-_45_EMI", "GENIUS_-_48_EMI", "GENIUS_-_50_EMI", "GENIUS_-_6_EMI", "GENIUS_-_CUSTOM",
  "GENIUS_(DP)_-_12_EMI", "GENIUS_(DP)_-_24_EMI", "GENIUS_(DP)_-_36_EMI",
  "GENUIS_PLUS_12_EMI", "GENUIS_PLUS_24_EMI", "GENUIS_PLUS_36_EMI",
  "IITKGPOCN_-_12_EMI", "IITKGPOCN_-_18_EMI", "IITKGPOCN_-_3_EMI", "IITKGPOCN_-_6_EMI", "IITKGPOCN_-_9_EMI",
  "SMART_-_12_EMI", "SMART_-_18_EMI", "SMART_-_24_EMI", "SMART_-_30_EMI", "SMART_-_36_EMI",
  "SMART_-_45_EMI", "SMART_-_48_EMI", "SMART_-_50_EMI", "SMART_-_6_EMI", "SMART_-_CUSTOM",
  "SMART_(S)_-_50_EMI", "SMART_PLUS_12_EMI", "SMART_PLUS_24_EMI", "SMART_PLUS_36_EMI",
  "SMART(DP)_-_12_EMI", "SMART(DP)_-_24_EMI", "SMART(DP)_-_36_EMI"
]);

const tenureFeeMap = {
  '3': 82000.0,
  '6': 82000.0,
  '9': 91840.0,
  '12': 93480.0,
  '18': 99220.0
};

const feeComponentConfig = {
  'IITKGPOCN': {
    tenure_fees: { ...tenureFeeMap },
    default_course_fee: 82000.0,
    registration_fee: 0.0
  },
  'DEFAULT': {
    tenure_fees: { ...tenureFeeMap },
    default_course_fee: 82000.0,
    registration_fee: 0.0
  }
};

function normalizeProduct(rawProduct) {
  if (!rawProduct) return '';
  let str = rawProduct.toString().trim().toUpperCase();

  // If already an exact valid grade
  if (VALID_JODO_GRADES.has(str)) return str;

  // Replace any IITOCN variation with IITKGPOCN (as Jodo registers it under IITKGPOCN)
  str = str.replace(/IIT[-_ ]?OCN/g, 'IITKGPOCN')
           .replace(/IIT[-_ ]?KGP[-_ ]?OCN/g, 'IITKGPOCN');

  if (VALID_JODO_GRADES.has(str)) return str;

  return str;
}

/**
 * Resolves Jodo grade code from product and tenure
 */
function resolveJodoGrade(product, tenure) {
  if (!product && !tenure) {
    throw new Error(`Both 'product' and 'Tenure' are required for Jodo Flex.`);
  }

  const rawProduct = (product || '').toString().trim().toUpperCase();
  const normalized = normalizeProduct(rawProduct);

  // 1. Direct match if product contains the full valid grade
  if (VALID_JODO_GRADES.has(normalized)) {
    return normalized;
  }

  // 2. Extract tenure digits
  let cleanTenure = tenure ? tenure.toString().trim().replace(/[^0-9]/g, '') : '';
  if (!cleanTenure) {
    const tenureMatch = rawProduct.match(/(\d+)\s*(?:EMI|MONTHS?|M)?$/i) || rawProduct.match(/(\d+)/);
    if (tenureMatch) {
      cleanTenure = tenureMatch[1];
    }
  }

  // 3. Map canonical prefix
  let prefix = normalized.replace(/[^A-Z0-9]/g, '');
  if ((prefix.includes('IIT') && prefix.includes('OCN')) || prefix === 'OCN') {
    prefix = 'IITKGPOCN';
  } else if (prefix.startsWith('SMART')) {
    if (prefix.includes('PLUS')) prefix = 'SMART_PLUS';
    else if (prefix.includes('DP')) prefix = 'SMART(DP)';
    else prefix = 'SMART';
  } else if (prefix.startsWith('GENIUS') || prefix.startsWith('GENUIS')) {
    if (prefix.includes('PLUS')) prefix = 'GENUIS_PLUS';
    else if (prefix.includes('DP')) prefix = 'GENIUS_(DP)';
    else prefix = 'GENIUS';
  } else if (prefix.startsWith('EDGE')) {
    if (prefix.includes('PLUS')) prefix = 'EDGE_PLUS';
    else prefix = 'EDGE';
  }

  // 4. Check candidates against valid production grades
  const candidateHyphen = `${prefix}_-_${cleanTenure}_EMI`;
  if (VALID_JODO_GRADES.has(candidateHyphen)) {
    return candidateHyphen;
  }

  const candidateNoHyphen = `${prefix}_${cleanTenure}_EMI`;
  if (VALID_JODO_GRADES.has(candidateNoHyphen)) {
    return candidateNoHyphen;
  }

  return candidateHyphen;
}

/**
 * Fetches fee components for a given product or tenure
 */
function resolveFeeComponents(product, tenure, overrideCourseFee = null, overrideRegFee = null) {
  let cleanTenure = tenure ? tenure.toString().trim().replace(/[^0-9]/g, '') : '';

  let courseFee;
  if (overrideCourseFee !== null && overrideCourseFee !== undefined && !isNaN(Number(overrideCourseFee)) && Number(overrideCourseFee) > 0) {
    // Explicit course fee passed from Salesforce has highest precedence
    courseFee = Number(overrideCourseFee);
  } else if (tenureFeeMap[cleanTenure] !== undefined) {
    courseFee = tenureFeeMap[cleanTenure];
  } else {
    courseFee = 82000.0;
  }

  const regFee = (overrideRegFee !== null && overrideRegFee !== undefined && !isNaN(Number(overrideRegFee)))
    ? Number(overrideRegFee)
    : 0.0;

  return [
    {
      component_type: 'COURSE_FEE',
      fee_amount: courseFee
    },
    {
      component_type: 'REGISTRATION_FEE',
      fee_amount: regFee
    }
  ];
}

module.exports = {
  VALID_JODO_GRADES,
  tenureFeeMap,
  feeComponentConfig,
  resolveJodoGrade,
  resolveFeeComponents
};
