import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { createAuth } from './src/lib/auth.js';
import jwt from 'jsonwebtoken';
import { verifyToken } from './src/middleware/verifyToken.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 5000;

// Configure CORS properly
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://ideavault-client-sooty.vercel.app',
  /\.vercel\.app$/,
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cookie',
    'Set-Cookie'
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400,
}));

// Handle preflight requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie');
    return res.status(200).end();
  }
  next();
});

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

    const auth = createAuth(db);

    // Better Auth with proper cookie handling
    app.use('/api/auth', (req, res, next) => {
      // Add CORS headers to auth routes
      const origin = req.headers.origin;
      if (origin && [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://ideavault-client-sooty.vercel.app',
      ].includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      }
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cookie');
      
      // Handle preflight for auth routes
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      
      next();
    }, toNodeHandler(auth));

    app.use(express.json());

    // Generate JWT token
    app.post('/api/jwt/token', async (req, res) => {
      try {
        const { email, name } = req.body;
        if (!email) return res.status(400).json({ message: 'Email required' });
        const token = jwt.sign(
          { email, name },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );
        res.json({ token });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

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

    // Ideas - Create (protected)
    app.post('/api/ideas', verifyToken, async (req, res) => {
      try {
        const idea = { ...req.body, createdAt: new Date(), updatedAt: new Date() };
        const result = await ideasCollection.insertOne(idea);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Ideas - Update (protected)
    app.put('/api/ideas/:id', verifyToken, async (req, res) => {
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

    // Ideas - Delete (protected)
    app.delete('/api/ideas/:id', verifyToken, async (req, res) => {
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

    // Comments - Add (protected)
    app.post('/api/comments', verifyToken, async (req, res) => {
      try {
        const comment = { ...req.body, createdAt: new Date(), updatedAt: new Date() };
        const result = await commentsCollection.insertOne(comment);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Comments - Update (protected)
    app.put('/api/comments/:id', verifyToken, async (req, res) => {
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

    // Comments - Delete (protected)
    app.delete('/api/comments/:id', verifyToken, async (req, res) => {
      try {
        const { ObjectId } = await import('mongodb');
        const result = await commentsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Comments by user email
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

run().catch(console.error);

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});