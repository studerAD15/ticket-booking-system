import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from "express";
import { createClient } from "redis";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.get("/reset", async (req, res) => {
  try {
    await redisClient.set("available_seats", 100);
    res.json({ message: "Seats reset to 100" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.get("/api/seats", async (req, res) => {
  const seats = await redisClient.get("available_seats");
  res.json({ remaining: parseInt(seats) });
});

const redisClient = createClient({
  url: "redis://127.0.0.1:6379"
});

redisClient.on("error", (err) => console.log("Redis Error:", err));

await redisClient.connect();

console.log("Redis Connected");

// Initialize seats only if not exists
const seatsExist = await redisClient.get("available_seats");

if (!seatsExist) {
  await redisClient.set("available_seats", 100);
  console.log("Initialized 100 seats");
}

// Booking API
app.post("/api/book", async (req, res) => {
  try {
    const remaining = await redisClient.decr("available_seats");

    if (remaining < 0) {
      await redisClient.incr("available_seats");
      return res.status(400).json({
        success: false,
        message: "House Full"
      });
    }

    const bookingId = uuidv4();

    return res.status(200).json({
      success: true,
      bookingId,
      remaining
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.listen(3000, () => {
  console.log("Booking system running on port 3000");
});
