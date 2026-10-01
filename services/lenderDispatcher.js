/**
 * Lender Dispatcher & Adapters
 * Prepares auth headers, transforms payloads, and forwards requests to target NBFC.
 */

const { resolveJodoGrade, resolveFeeComponents } = require('../config/jodoProductConfig');

/**
 * Handles TechFino Lead Creation Flow
 */
async function handleTechFino(config, payload) {
  const cleanPayload = { ...payload };
  delete cleanPayload.lender;
  delete cleanPayload.nbfc;
  delete cleanPayload.NBFC_name;
  delete cleanPayload.partner;

  // Auto-default branch if missing or empty
  if (!cleanPayload.branch) {
    cleanPayload.branch = '623';
  }

  const { username, password, apiKey } = config.credentials;
  const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');

  const headers = {
    'Content-Type': 'application/json',
    'apiKey': apiKey,
    'Authorization': `Basic ${basicAuth}`
  };

  const startTime = Date.now();
  console.log(`[Dispatcher -> TECHFINO] Sending lead to ${config.apiUrl}`);

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(cleanPayload)
  });

  const durationMs = Date.now() - startTime;
  const responseText = await response.text();

  let parsedData;
  try {
    parsedData = JSON.parse(responseText);
  } catch {
    parsedData = { rawResponse: responseText };
  }

  return {
    status: response.status,
    data: parsedData,
    durationMs
  };
}

/**
 * Handles Jodo Flex Student Onboarding Flow
 * 1. Resolves Product + Tenure -> Grade
 * 2. Fetches Fee Component config
 * 3. Registers / updates User in Jodo to get registration_id
 * 4. Registers / updates Student in Jodo with Fee Components
 * 5. Generates User Access Token & Customer Redirect URL
 * 6. Returns response to Salesforce
 */
async function handleJodoFlex(config, payload) {
  const startTime = Date.now();
  const { clientKey, clientSecret } = config.credentials;
  const basicAuth = Buffer.from(`${clientKey}:${clientSecret}`).toString('base64');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${basicAuth}`
  };

  // Field extraction with Salesforce fallbacks
  const fullname = payload.fullname || payload.name || '';
  const identifier = payload.identifier || payload.order_id || payload.user_uid || '';
  const product = payload.product || payload.course_name || 'IIT-KGP-OCN';
  const tenure = payload.Tenure || payload.duration || payload.courseTenure || '12';
  const dateOfBirth = payload.date_of_birth || '2000-01-15';
  const primaryContactName = payload.primary_contact_name || fullname;
  const primaryContactNumber = payload.primary_contact_number || payload.mobile_num || '';
  const primaryContactEmail = payload.primary_contact_email || payload.e_mail || '';

  if (!primaryContactNumber || !primaryContactEmail) {
    throw new Error("Missing required contact details: 'primary_contact_number' (or mobile_num) and 'primary_contact_email' (or e_mail) are required for Jodo Flex.");
  }

  // 1. Resolve Grade dynamically from Product and Tenure
  const resolvedGrade = resolveJodoGrade(product, tenure);
  console.log(`[Jodo Flex] Resolved Grade: "${resolvedGrade}" for Product: "${product}", Tenure: "${tenure}"`);

  // 2. Resolve Fee Components from config
  const feeComponents = resolveFeeComponents(product, tenure, payload.amount || payload.course_price);
  console.log(`[Jodo Flex] Resolved Fee Components:`, JSON.stringify(feeComponents));

  // 3. Register User in Jodo
  console.log(`[Jodo Flex] Registering user (${primaryContactNumber}, ${primaryContactEmail})...`);
  const userRegisterRes = await fetch(`${config.apiUrl}/api/v1/integrations/erp/users/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: primaryContactName,
      phone: primaryContactNumber,
      email: primaryContactEmail
    })
  });

  const userRegisterData = await userRegisterRes.json();
  if (!userRegisterRes.ok || userRegisterData.status !== 'success') {
    console.error(`[Jodo Flex] User register failed:`, userRegisterData);
    return {
      status: userRegisterRes.status,
      data: {
        success: false,
        error: userRegisterData.message || 'Failed to register user in Jodo',
        details: userRegisterData
      },
      durationMs: Date.now() - startTime
    };
  }

  const registrationId = userRegisterData.data.registration_id;
  console.log(`[Jodo Flex] User registered with registration_id: ${registrationId}`);

  // 4. Register / Update Student in Jodo
  const studentPayload = {
    student: {
      fullname,
      identifier,
      grade: resolvedGrade,
      new_admission: false,
      academic_year_start: '2022',
      academic_year_end: '2023',
      date_of_birth: dateOfBirth,
      primary_contact_name: primaryContactName,
      primary_contact_number: primaryContactNumber,
      primary_contact_email: primaryContactEmail
    },
    fee_components: feeComponents,
    payments: []
  };

  console.log(`[Jodo Flex] Registering student under registration_id ${registrationId}...`);
  const studentRes = await fetch(`${config.apiUrl}/api/v1/integrations/erp/users/${registrationId}/students`, {
    method: 'POST',
    headers,
    body: JSON.stringify(studentPayload)
  });

  const studentData = await studentRes.json();
  if (!studentRes.ok || studentData.status !== 'success') {
    console.error(`[Jodo Flex] Student registration failed:`, studentData);
    return {
      status: studentRes.status,
      data: {
        success: false,
        grade: resolvedGrade,
        error: studentData.message || 'Failed to register/update student in Jodo',
        errors: studentData.errors || [],
        details: studentData
      },
      durationMs: Date.now() - startTime
    };
  }

  const jodoStudentId = studentData.data?.jodo_student_id;
  console.log(`[Jodo Flex] Student registered with jodo_student_id: ${jodoStudentId}`);

  // 5. Generate User Access Token for Redirection
  console.log(`[Jodo Flex] Fetching access token for user ${registrationId}...`);
  const tokenRes = await fetch(`${config.apiUrl}/api/v1/integrations/erp/users/${registrationId}/access_token`, {
    method: 'GET',
    headers
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.data?.access_token || '';
  const customerBaseUrl = config.customerUrl || 'https://app.devtest1.jodopay.com';
  const redirectionUrl = `${customerBaseUrl}/consumer/login-redirect?access_token=${encodeURIComponent(accessToken)}`;

  const finalResponse = {
    status: 'success',
    NBFC_name: 'Jodo_flex',
    identifier,
    jodo_student_id: jodoStudentId,
    registration_id: registrationId,
    grade: resolvedGrade,
    redirection_url: redirectionUrl,
    access_token: accessToken,
    response_code: '200'
  };

  console.log(`[Jodo Flex] Successfully generated student onboarding & redirection response`);

  return {
    status: 200,
    data: finalResponse,
    durationMs: Date.now() - startTime
  };
}

/**
 * Handles Auxilo Lead Creation Flow (Placeholder)
 */
async function handleAuxilo(config, payload) {
  if (!config.apiUrl) {
    throw new Error('Auxilo API endpoint is not yet configured. Set the AUXILO_API_URL environment variable to enable Auxilo forwarding.');
  }

  const cleanPayload = { ...payload };
  delete cleanPayload.lender;
  delete cleanPayload.nbfc;
  delete cleanPayload.NBFC_name;
  delete cleanPayload.partner;

  const headers = { 'Content-Type': 'application/json' };
  const { token, apiKey, username, password } = config.credentials;

  if (config.authType === 'BEARER' && token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (config.authType === 'API_KEY' && apiKey) {
    headers['x-api-key'] = apiKey;
  } else if (config.authType === 'BASIC' && username && password) {
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    headers['Authorization'] = `Basic ${basicAuth}`;
  }

  const startTime = Date.now();
  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(cleanPayload)
  });

  const responseText = await response.text();
  let parsedData;
  try {
    parsedData = JSON.parse(responseText);
  } catch {
    parsedData = { rawResponse: responseText };
  }

  return {
    status: response.status,
    data: parsedData,
    durationMs: Date.now() - startTime
  };
}

/**
 * Dispatches lead payload to the appropriate lender
 */
async function dispatchToLender(lenderKey, config, payload) {
  switch (lenderKey) {
    case 'TECHFINO':
      return await handleTechFino(config, payload);

    case 'JODO_FLEX':
      return await handleJodoFlex(config, payload);

    case 'AUXILO':
      return await handleAuxilo(config, payload);

    default:
      throw new Error(`Unsupported lender adapter: ${lenderKey}`);
  }
}

module.exports = {
  dispatchToLender
};
