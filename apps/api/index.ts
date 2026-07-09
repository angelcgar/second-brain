import { serve } from "bun";

serve({
  port: 3001,
  fetch(req) {
    return new Response("API running");
  },
});

console.log("API running on http://localhost:3001");

