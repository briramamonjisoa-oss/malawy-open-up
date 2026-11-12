
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: 'Méthode non autorisée' })
    };
  }

  try {
    const { code } = JSON.parse(event.body || '{}');
    const adminCode = process.env.ADMIN_CODE;

    if (!adminCode) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Code administrateur non configuré sur Netlify'
        })
      };
    }

    if (typeof code !== 'string' || code !== adminCode) {
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          error: 'Code administrateur incorrect'
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: 'Requête invalide'
      })
    };
  }
};
