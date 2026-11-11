
exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Méthode non autorisée" })
    };
  }

  try {
    const { pseudo, playerId, mode } = JSON.parse(event.body || "{}");

    if (!pseudo || !playerId || !["1 VS 1", "2 VS 1"].includes(mode)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Informations invalides" })
      };
    }

    const token = process.env.AIRTABLE_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!token || !baseId) {
      throw new Error("Configuration Airtable manquante");
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/Inscriptions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          records: [{
            fields: {
              "Pseudo Free Fire": pseudo,
              "ID Free Fire": String(playerId),
              "Mode de combat": mode
            }
          }]
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "Erreur Airtable");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: "Inscription réussie !" })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
