import admin from "../netlify/functions/admin.js";
import adminData from "../netlify/functions/admin-data.js";
import matches from "../netlify/functions/matches.js";
import playerAccount from "../netlify/functions/player-account.js";
import players from "../netlify/functions/players.js";
import register from "../netlify/functions/register.js";
import teams from "../netlify/functions/teams.js";
import tournamentRegister from "../netlify/functions/tournament-register.js";
import tournamentSignups from "../netlify/functions/tournament-signups.js";
import tournaments from "../netlify/functions/tournaments.js";

const handlers = {
  admin: admin.handler,
  "admin-data": adminData.handler,
  matches: matches.handler,
  "player-account": playerAccount.handler,
  players: players.handler,
  register: register.handler,
  teams: teams.handler,
  "tournament-register": tournamentRegister.handler,
  "tournament-signups": tournamentSignups.handler,
  tournaments: tournaments.handler
};

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const prefix = "/.netlify/functions/";

    if (url.pathname.startsWith(prefix)) {
      const name = url.pathname.slice(prefix.length).replace(/\/$/, "");
      const handler = handlers[name];
      if (!handler) return jsonError(404, "Fonction API introuvable");

      try {
        const body = ["GET", "HEAD"].includes(request.method) ? "" : await request.text();
        const headers = Object.fromEntries(request.headers.entries());
        const event = {
          httpMethod: request.method,
          headers,
          body,
          path: url.pathname,
          rawUrl: request.url,
          queryStringParameters: Object.fromEntries(url.searchParams.entries()),
          multiValueQueryStringParameters: {}
        };
        const result = await handler(event);
        const responseHeaders = new Headers(result.headers || {});
        if (!responseHeaders.has("Content-Type")) {
          responseHeaders.set("Content-Type", "application/json; charset=utf-8");
        }
        return new Response(result.body ?? "", {
          status: result.statusCode || 200,
          headers: responseHeaders
        });
      } catch (error) {
        console.error("API worker error:", name, error);
        return jsonError(500, "Erreur serveur");
      }
    }

    return env.ASSETS.fetch(request);
  }
};
