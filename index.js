import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { createAuth } from './src/lib/auth.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: [process.env.CLIENT_URL || 'http://localhost:3000'],
  credentials: true,
}));

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
    await client.db('admin').command({ ping: 1 });
    console.log('Successfully connected to MongoDB!');

    const db = client.db('ideavault');

    // Initialize Better Auth after DB is connected and env is loaded
    const auth = createAuth(db);
    app.all('/api/auth/*splat', toNodeHandler(auth));

    app.use(express.json());

    const ideasCollection = db.collection('ideas');
    const commentsCollection = db.collection('comments');

    app.get('/', (req, res) => {
      res.send('IdeaVault Server is running!');
    });

    // Ideas - Get all
    app.get('/api/ideas', async (req, res) => {
      try {
        const { email, category, search, limit } = req.query;
        let query = {};
        if (email) query.authorEmail = email;
        if (category) query.category = category;
        if (search) query.title = { $regex: search, $options: 'i' };
        const ideas = await ideasCollection
          .find(query)
          .sort({ createdAt: -1 })
          .limit(limit ? parseInt(limit) : 0)
          .toArray();
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

    // Comments by user
    app.get('/api/user-comments', async (req, res) => {
      try {
        const { email } = req.query;
        if (!email) return res.status(400).json({ message: 'Email required' });
        const comments = await commentsCollection
          .find({ userEmail: email })
          .sort({ createdAt: -1 })
          .toArray();
        res.json(comments);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

run();

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});