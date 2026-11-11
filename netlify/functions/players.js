
exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Méthode non autorisée" })
    };
  }

  try {
    const token = process.env.AIRTABLE_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!token || !baseId) {
      throw new Error("Configuration Airtable manquante");
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/Inscriptions`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Erreur Airtable");
    }

    const players = data.records.map(record => ({
      id: record.id,
      pseudo: record.fields["Pseudo Free Fire"] || "",
      playerId: record.fields["ID Free Fire"] || "",
      mode: record.fields["Mode de combat"] || ""
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, players })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
