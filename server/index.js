import http from "http";
import { handleRequest } from "./router.js";

const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {
  handleRequest(req, res);
});

server.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});

