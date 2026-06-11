import express from 'express';
import cors from 'cors';
import { MongoClient, ServerApiVersion } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is undefined! Check your .env file');
  process.exit(1);
}

const client = new MongoClient(uri, {
  tls: true,
  tlsAllowInvalidCertificates: false,
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Successfully connected to MongoDB!");

    const db = client.db("ideavault");
    const ideasCollection = db.collection("ideas");
    const usersCollection = db.collection("users");
    const commentsCollection = db.collection("comments");

    // ─── Routes ───────────────────────────────────────────

    app.get('/', (req, res) => {
      res.send('IdeaVault Server is running!');
    });

    // Ideas - Get all
    app.get('/api/ideas', async (req, res) => {
      try {
        const ideas = await ideasCollection.find().sort({ createdAt: -1 }).toArray();
        res.json(ideas);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Ideas - Get single
    app.get('/api/ideas/:id', async (req, res) => {
      try {
        const { ObjectId } = await import('mongodb');
        const idea = await ideasCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!idea) return res.status(404).json({ message: 'Idea not found' });
        res.json(idea);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Ideas - Create
    app.post('/api/ideas', async (req, res) => {
      try {
        const idea = { ...req.body, createdAt: new Date(), updatedAt: new Date() };
        const result = await ideasCollection.insertOne(idea);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Ideas - Update
    app.put('/api/ideas/:id', async (req, res) => {
      try {
        const { ObjectId } = await import('mongodb');
        const result = await ideasCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { ...req.body, updatedAt: new Date() } }
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Ideas - Delete
    app.delete('/api/ideas/:id', async (req, res) => {
      try {
        const { ObjectId } = await import('mongodb');
        const result = await ideasCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Comments - Get by idea
    app.get('/api/comments/:ideaId', async (req, res) => {
      try {
        const comments = await commentsCollection
          .find({ ideaId: req.params.ideaId })
          .sort({ createdAt: -1 })
          .toArray();
        res.json(comments);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Comments - Add
    app.post('/api/comments', async (req, res) => {
      try {
        const comment = { ...req.body, createdAt: new Date(), updatedAt: new Date() };
        const result = await commentsCollection.insertOne(comment);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Comments - Update
    app.put('/api/comments/:id', async (req, res) => {
      try {
        const { ObjectId } = await import('mongodb');
        const result = await commentsCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: { text: req.body.text, updatedAt: new Date() } }
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Comments - Delete
    app.delete('/api/comments/:id', async (req, res) => {
      try {
        const { ObjectId } = await import('mongodb');
        const result = await commentsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Users - Save/update on login
    app.post('/api/users', async (req, res) => {
      try {
        const { email, name, photoURL } = req.body;
        const existing = await usersCollection.findOne({ email });
        if (existing) return res.json({ message: 'User already exists', user: existing });
        const result = await usersCollection.insertOne({ email, name, photoURL, createdAt: new Date() });
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

run();

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});