import { app } from "./app.js";
import { config } from "./config.js";

// Entry point: only starts the HTTP server. All wiring lives in app.ts.
app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});