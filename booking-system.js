import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { Redis } from "@upstash/redis";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ Upstash Redis using environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Initialize seats if not exists
const seatsExist = await redis.get("available_seats");

if (!seatsExist) {
  await redis.set("available_seats", 100);
  console.log("🎟️ Initialized 100 seats");
}

// Get seats
app.get("/api/seats", async (req, res) => {
  const seats = await redis.get("available_seats");
  res.json({ remaining: parseInt(seats) });
});

// Book seat
app.post("/api/book", async (req, res) => {
  const remaining = await redis.decr("available_seats");

  if (remaining < 0) {
    await redis.incr("available_seats");
    return res.status(400).json({
      success: false,
      message: "House Full"
    });
  }

  const bookingId = uuidv4();

  res.json({
    success: true,
    bookingId,
    remaining
  });
});

// Reset seats
app.get("/reset", async (req, res) => {
  await redis.set("available_seats", 100);
  res.json({ message: "Seats reset to 100" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Booking system running on port ${PORT}`);
});