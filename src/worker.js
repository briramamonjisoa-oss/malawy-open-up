import admin from "../netlify/functions/admin.js";
import adminData from "../netlify/functions/admin-data.js";
import matches from "../netlify/functions/matches.js";
import playerAccount from "../netlify/functions/player-account.js";
import players from "../netlify/functions/players.js";
import register from "../netlify/functions/register.js";
import teams from "../netlify/functions/teams.js";
import tournamentRegister from "../netlify/functions/tournament-register.js";
import tournamentRosters from "../netlify/functions/tournament-rosters.js";
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
  "tournament-rosters": tournamentRosters.handler,
  "tournament-signups": tournamentSignups.handler,
  tournaments: tournaments.handler
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export default {
  async scheduled(controller, env, ctx) {
    globalThis.__MOU_ENV = {
      ADMIN_CODE: env.ADMIN_CODE,
      AIRTABLE_TOKEN: env.AIRTABLE_TOKEN,
      AIRTABLE_BASE_ID: env.AIRTABLE_BASE_ID
    };
    ctx.waitUntil(handlers.tournaments({httpMethod:"GET",headers:{},body:""}));
  },
  async fetch(request, env) {
    const url = new URL(request.url);

    // Safe diagnostic: reports presence only, never returns secret values.
    if (url.pathname === "/__health") {
      return json({
        worker: "malawy-open-up",
        bindings: {
          ADMIN_CODE: Boolean(env.ADMIN_CODE),
          AIRTABLE_TOKEN: Boolean(env.AIRTABLE_TOKEN),
          AIRTABLE_BASE_ID: Boolean(env.AIRTABLE_BASE_ID)
        }
      });
    }

    const prefix = "/.netlify/functions/";
    if (url.pathname.startsWith(prefix)) {
      const name = url.pathname.slice(prefix.length).replace(/\/$/, "");
      const handler = handlers[name];
      if (!handler) return json({ error: "Fonction API introuvable" }, 404);

      try {
        globalThis.__MOU_ENV = {
          ADMIN_CODE: env.ADMIN_CODE,
          AIRTABLE_TOKEN: env.AIRTABLE_TOKEN,
          AIRTABLE_BASE_ID: env.AIRTABLE_BASE_ID
        };
        const body = ["GET", "HEAD"].includes(request.method) ? "" : await request.text();
        const event = {
          httpMethod: request.method,
          headers: Object.fromEntries(request.headers.entries()),
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
        return json({ error: "Erreur serveur" }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
