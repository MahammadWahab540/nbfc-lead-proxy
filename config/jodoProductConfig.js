/**
 * Jodo Flex Product & Fee Configuration Registry
 * 
 * Maps Salesforce products and tenures to Jodo Grade codes,
 * and maintains configurable fee components.
 */

const productGradeMap = {
  'IIT-KGP-OCN': {
    '3': 'IITKGPOCN_-_3_EMI',
    '6': 'IITKGPOCN_-_6_EMI',
    '9': 'IITKGPOCN_-_9_EMI',
    '12': 'IITKGPOCN_-_12_EMI',
    '18': 'IITKGPOCN_-_18_EMI'
  },
  'SMART': {
    '6': 'SMART_-_6_EMI',
    '12': 'SMART_-_12_EMI',
    '18': 'SMART_-_18_EMI',
    '24': 'SMART_-_24_EMI',
    '36': 'SMART_-_36_EMI',
    '48': 'SMART_-_48_EMI',
    '50': 'SMART_-_50_EMI'
  },
  'GENIUS': {
    '6': 'GENIUS_-_6_EMI',
    '12': 'GENIUS_-_12_EMI',
    '18': 'GENIUS_-_18_EMI',
    '24': 'GENIUS_-_24_EMI',
    '30': 'GENIUS_-_30_EMI',
    '36': 'GENIUS_-_36_EMI',
    '48': 'GENIUS_-_48_EMI',
    '50': 'GENIUS_-_50_EMI'
  },
  'EDGE_PLUS': {
    '12': 'EDGE_PLUS_12_EMI',
    '24': 'EDGE_PLUS_24_EMI',
    '36': 'EDGE_PLUS_36_EMI'
  }
};

const feeComponentConfig = {
  'IIT-KGP-OCN': {
    course_fee: 137000.0,
    registration_fee: 0.0
  },
  'DEFAULT': {
    course_fee: 137000.0,
    registration_fee: 0.0
  }
};

/**
 * Resolves Jodo grade code from product and tenure
 */
function resolveJodoGrade(product, tenure) {
  if (!product || !tenure) {
    throw new Error(`Both 'product' and 'Tenure' are required for Jodo Flex. Received product: "${product}", tenure: "${tenure}"`);
  }

  const normalizedProduct = product.toString().trim().toUpperCase();
  const normalizedTenure = tenure.toString().trim();

  // 1. Direct product map lookup
  if (productGradeMap[normalizedProduct] && productGradeMap[normalizedProduct][normalizedTenure]) {
    return productGradeMap[normalizedProduct][normalizedTenure];
  }

  // 2. Fallback prefix cleaning: e.g. "IIT-KGP-OCN" -> "IITKGPOCN_-_<tenure>_EMI"
  const sanitizedPrefix = normalizedProduct.replace(/[^A-Z0-9]/g, '');
  return `${sanitizedPrefix}_-_${normalizedTenure}_EMI`;
}

/**
 * Fetches fee components for a given product or tenure
 */
function resolveFeeComponents(product, tenure, overrideCourseFee = null) {
  const normalizedProduct = (product || 'DEFAULT').toString().trim().toUpperCase();
  const baseConfig = feeComponentConfig[normalizedProduct] || feeComponentConfig['DEFAULT'];

  const courseFee = (overrideCourseFee !== null && !isNaN(Number(overrideCourseFee)))
    ? Number(overrideCourseFee)
    : baseConfig.course_fee;

  return [
    {
      component_type: 'COURSE_FEE',
      fee_amount: courseFee
    },
    {
      component_type: 'REGISTRATION_FEE',
      fee_amount: baseConfig.registration_fee
    }
  ];
}

module.exports = {
  productGradeMap,
  feeComponentConfig,
  resolveJodoGrade,
  resolveFeeComponents
};
