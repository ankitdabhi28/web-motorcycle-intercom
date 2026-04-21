import express, { Express } from "express";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";
import dotenv from "dotenv";
import cors from "cors";
import bcrypt from "bcryptjs";
import { authMiddleware, generateToken, AuthRequest } from "./middleware/auth";
import { initializeDatabase } from "./db/schema";
import * as userModel from "./models/user";
import * as rideModel from "./models/ride";

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Register
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Check if user already exists
    const existingUser = await userModel.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = `user-${Date.now()}`;
    const user = await userModel.createUser(
      userId,
      email,
      hashedPassword,
      name,
    );

    const token = generateToken(userId, email);

    res.json({
      token,
      userId: user.userId,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  try {
    // Find user
    const user = await userModel.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user.userId, user.email);

    res.json({
      token,
      userId: user.userId,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Refresh token
app.post("/api/auth/refresh", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Missing token" });
  }

  try {
    // Verify token and return new token
    // For now, just return the same token (JWT tokens are stateless)
    // In production, you might want to implement a refresh token strategy
    res.json({ token });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// Update profile
app.put("/api/auth/profile", authMiddleware, async (req: AuthRequest, res) => {
  const { name } = req.body;

  try {
    const user = await userModel.updateUser(req.user!.userId, { name });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ userId: user.userId, email: user.email, name: user.name });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Profile update failed" });
  }
});

// Get current user
app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await userModel.getUserById(req.user!.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check for active rides for this user
    const riderId = `rider-${user.userId}`;
    const activeRides = await rideModel.getActiveRidesByRiderId(riderId);

    // Get the most recent active ride if exists
    let activeRide = null;
    if (activeRides.length > 0) {
      const latestRide = activeRides[0];
      const participants = await rideModel.getRideParticipants(
        latestRide.rideId,
      );
      activeRide = {
        rideId: latestRide.rideId,
        rideCode: latestRide.rideCode,
        name: latestRide.name,
        createdBy: latestRide.createdBy,
        isLeader: latestRide.createdBy === user.userId,
        participants,
      };
    }

    res.json({
      userId: user.userId,
      email: user.email,
      name: user.name,
      activeRide,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// List all rides (for debugging)
app.get("/api/rides", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const ridesArray = await rideModel.getAllRides();
    res.json({ rides: ridesArray });
  } catch (error) {
    console.error("List rides error:", error);
    res.status(500).json({ error: "Failed to list rides" });
  }
});

// Create a new ride
app.post("/api/rides", authMiddleware, async (req: AuthRequest, res) => {
  const { name } = req.body;
  const rideCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const rideId = `ride-${Date.now()}`;

  try {
    const ride = await rideModel.createRide(
      rideId,
      rideCode,
      name || "New Ride",
      req.user!.userId,
    );

    console.log(
      `Created ride: ${ride.rideCode} - ${ride.name} by ${req.user!.email}`,
    );
    res.json({ rideCode: ride.rideCode, rideId: ride.rideId });
  } catch (error: any) {
    console.error("Create ride error:", error);
    res
      .status(500)
      .json({ error: "Failed to create ride", details: error.message });
  }
});

// Get user's ride history
app.get("/api/rides/my", authMiddleware, async (req: AuthRequest, res) => {
  try {
    // Disable old rides first
    await rideModel.disableOldRides();

    const rides = await rideModel.getRidesByUserId(req.user!.userId);
    res.json({ rides });
  } catch (error) {
    console.error("Get ride history error:", error);
    res.status(500).json({ error: "Failed to get ride history" });
  }
});

// Update ride activity
app.post(
  "/api/rides/:rideCode/activity",
  authMiddleware,
  async (req: AuthRequest, res) => {
    const { rideCode } = req.params;
    const code = Array.isArray(rideCode) ? rideCode[0] : rideCode;

    try {
      const ride = await rideModel.getRideByCode(code);

      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      if (ride.status === "disabled") {
        return res.status(403).json({ error: "Ride is disabled" });
      }

      await rideModel.updateRideActivity(ride.rideId);
      res.json({ success: true });
    } catch (error) {
      console.error("Update ride activity error:", error);
      res.status(500).json({ error: "Failed to update ride activity" });
    }
  },
);

// Get ride details
app.get(
  "/api/rides/:rideCode",
  authMiddleware,
  async (req: AuthRequest, res) => {
    const { rideCode } = req.params;
    const code = Array.isArray(rideCode) ? rideCode[0] : rideCode;

    try {
      const ride = await rideModel.getRideByCode(code);

      if (!ride) {
        return res.status(404).json({
          error: "Ride not found",
          message: `No ride exists with code: ${code}`,
        });
      }

      // Get participants
      const participants = await rideModel.getRideParticipants(ride.rideId);

      res.json({
        ...ride,
        participants,
      });
    } catch (error) {
      console.error("Get ride error:", error);
      res.status(500).json({ error: "Failed to get ride" });
    }
  },
);

// Join a ride
app.post(
  "/api/rides/:rideCode/join",
  authMiddleware,
  async (req: AuthRequest, res) => {
    const { rideCode } = req.params;
    const code = Array.isArray(rideCode) ? rideCode[0] : rideCode;
    const { riderId } = req.body;

    try {
      const ride = await rideModel.getRideByCode(code);

      if (!ride) {
        console.log(`Ride not found: ${code}`);
        return res.status(404).json({
          error: "Ride not found",
          message: `No ride exists with code: ${code}`,
        });
      }

      // Add rider to participants
      if (riderId) {
        await rideModel.addParticipant(ride.rideId, riderId);
      }

      // Get updated participants
      const participants = await rideModel.getRideParticipants(ride.rideId);

      console.log(`User ${req.user!.email} joined ride: ${code}`);
      console.log(`Participants: ${participants.length}`);
      res.json({ rideId: ride.rideId, rideCode: ride.rideCode, participants });
    } catch (error) {
      console.error("Join ride error:", error);
      res.status(500).json({ error: "Failed to join ride" });
    }
  },
);

// Leave a ride
app.delete(
  "/api/rides/:rideCode/leave",
  authMiddleware,
  async (req: AuthRequest, res) => {
    const { rideCode } = req.params;
    const code = Array.isArray(rideCode) ? rideCode[0] : rideCode;
    const { riderId } = req.body;

    try {
      const ride = await rideModel.getRideByCode(code);

      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      // Remove rider from participants
      if (riderId) {
        await rideModel.removeParticipant(ride.rideId, riderId);
      }

      // Get updated participants
      const participants = await rideModel.getRideParticipants(ride.rideId);

      console.log(`User ${req.user!.email} left ride: ${code}`);
      console.log(`Participants remaining: ${participants.length}`);
      res.json({ success: true, participants });
    } catch (error) {
      console.error("Leave ride error:", error);
      res.status(500).json({ error: "Failed to leave ride" });
    }
  },
);

// Socket.io Events
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("HELLO", (data) => {
    // Broadcast to all riders in same group
    socket.broadcast.emit("HELLO", data);
  });

  socket.on("LOCATION_UPDATE", (data) => {
    // Broadcast location update to all other riders
    socket.broadcast.emit("LOCATION_UPDATE", data);
  });

  socket.on("OFFER", (data) => {
    // Forward offer to specific peer
    io.to(data.to).emit("OFFER", data);
  });

  socket.on("ANSWER", (data) => {
    // Forward answer to specific peer
    io.to(data.to).emit("ANSWER", data);
  });

  socket.on("ICE_CANDIDATE", (data) => {
    // Forward ICE candidate to specific peer
    io.to(data.to).emit("ICE_CANDIDATE", data);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;

// Initialize database before starting server
initializeDatabase()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database:", error);
    process.exit(1);
  });
