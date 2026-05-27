import { MCPServer } from "@modelcontextprotocol/sdk/server/index.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const server = new MCPServer({
  name: "stitch-mcp",
  version: "1.0.0"
});

// tool gọi Stitch
server.tool("generate_ui", async ({ prompt }) => {
  const res = await axios.post(
    "https://stitch.googleapis.com/v1/generate",
    {
      prompt
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.STITCH_API_KEY}`
      }
    }
  );

  return res.data;
});

server.start();