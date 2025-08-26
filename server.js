const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());


// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error(err));

// Schema
const repoSchema = new mongoose.Schema({
  name: String,
  description: String,
  stars: Number,
  url: String,
});

const Repo = mongoose.model("Repo", repoSchema);

// Route: search + save repos
app.post("/api/search", async (req, res) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ error: "Keyword required" });

    // Fetch from GitHub API
    const response = await axios.get(`https://api.github.com/search/repositories?q=${keyword}&per_page=20`);
    const repos = response.data.items.map((repo) => ({
      name: repo.name,
      description: repo.description,
      stars: repo.stargazers_count,
      url: repo.html_url,
    }));

    // Save to DB (clear old first for simplicity)
    await Repo.deleteMany({});
    await Repo.insertMany(repos);

    res.json({ message: "Repos fetched & stored", repos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch repos" });
  }
});

// Route: get repos (pagination)
app.get("/api/repos", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const repos = await Repo.find().skip(skip).limit(limit);
    res.json(repos);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch repos from DB" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
