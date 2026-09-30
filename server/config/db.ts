import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import './env';

// Disable buffering so Mongoose operations fail fast rather than hanging when disconnected
mongoose.set('bufferCommands', false);

// Storage file for persistent fallback if external MongoDB is not set up
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'eventhub_db.json');

// Memory/Disk store for resilient standalone execution
export class LocalStore {
  private static instance: LocalStore;
  public data: {
    users: any[];
    events: any[];
    registrations: any[];
    categories: any[];
    notifications: any[];
    feedbacks: any[];
    reports: any[];
    teamInvitations: any[];
  } = {
    users: [],
    events: [],
    registrations: [],
    categories: [],
    notifications: [],
    feedbacks: [],
    reports: [],
    teamInvitations: []
  };

  private constructor() {
    this.load();
  }

  public static getInstance(): LocalStore {
    if (!LocalStore.instance) {
      LocalStore.instance = new LocalStore();
    }
    return LocalStore.instance;
  }

  private load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!Array.isArray(this.data.teamInvitations)) {
          this.data.teamInvitations = [];
        }
      }
    } catch (e) {
      console.warn('Initializing empty fallback store');
    }
  }

  public save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save to disk store', e);
    }
  }
}

/**
 * Validates if the URI starts with a valid MongoDB scheme (mongodb:// or mongodb+srv://)
 */
export function isValidMongoScheme(uri: string): boolean {
  if (!uri || typeof uri !== 'string') return false;
  const trimmed = uri.trim().replace(/^['"]|['"]$/g, '');
  return /^mongodb(\+srv)?:\/\//i.test(trimmed);
}

/**
 * Masks user credentials from MongoDB connection string for safe logging and error reporting
 */
export function maskMongoUri(uri: string): string {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/:\/\/([^:]+):([^@]+)@/i, '://$1:****@');
}

/**
 * Sanitizes and formats MongoDB connection string
 */
export function cleanMongoUri(uri: string): string {
  if (!uri || typeof uri !== 'string') return '';
  let cleaned = uri.trim().replace(/^['"]|['"]$/g, '').trim();

  // If valid scheme, clean credentials and database path
  if (isValidMongoScheme(cleaned)) {
    // Remove accidental angle brackets or quotes around credentials
    cleaned = cleaned.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/i, (_match, srv, user, pass) => {
      const cleanUser = user.replace(/^[<"']|[>"']$/g, '').trim();
      const cleanPass = pass.replace(/^[<"']|[>"']$/g, '').trim();
      return `mongodb${srv || ''}://${cleanUser}:${cleanPass}@`;
    });

    // Ensure database name is included before query parameters if missing
    if (/mongodb(\+srv)?:\/\/[^/]+\/\?/.test(cleaned)) {
      cleaned = cleaned.replace(/\/(\?.*)?$/, '/eventhub$1');
    }
  }

  return cleaned;
}

export const connectDB = async (customUri?: string): Promise<boolean> => {
  const rawUri = customUri || process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL;

  if (!rawUri || typeof rawUri !== 'string' || !rawUri.trim()) {
    console.log(`ℹ️ [DataStore] MONGODB_URI is not set. Operating on resilient local storage (.data/eventhub_db.json).`);
    return false;
  }

  const cleaned = cleanMongoUri(rawUri);

  // Validate scheme to prevent Mongoose "Invalid scheme" unhandled errors
  if (!isValidMongoScheme(cleaned)) {
    const preview = cleaned.length > 25 ? `${cleaned.slice(0, 22)}...` : cleaned;
    console.warn(`⚠️ [MongoDB Atlas] Invalid MongoDB connection string scheme ("${preview}"). MONGODB_URI must start with mongodb:// or mongodb+srv://.`);
    console.warn(`⚠️ [DataStore] Warning: Operating on local fallback (.data/eventhub_db.json) due to invalid MONGODB_URI scheme.`);
    return false;
  }

  // Check for placeholder credentials or dummy cluster configurations
  const isPlaceholder =
    cleaned.includes('<db_username>') ||
    cleaned.includes('<db_password>') ||
    cleaned.includes('<password>') ||
    cleaned.includes('<username>') ||
    cleaned.includes('USERNAME:PASSWORD') ||
    cleaned.includes('your_mongodb_atlas') ||
    /:\/\/(db_username|username|your_username|USERNAME):/i.test(cleaned) ||
    /:(db_password|password|your_password|PASSWORD)@/i.test(cleaned) ||
    cleaned.includes('CLUSTER.mongodb.net') ||
    cleaned.includes('gecb6ri.mongodb.net') ||
    cleaned.includes('example.com');

  if (isPlaceholder) {
    console.warn('⚠️ [MongoDB Atlas] Placeholder credentials detected in MONGODB_URI. Please provide real MongoDB Atlas credentials.');
    console.warn('⚠️ [DataStore] Warning: Operating on local fallback storage (.data/eventhub_db.json) until real MongoDB Atlas credentials are provided.');
    return false;
  }

  try {
    const masked = maskMongoUri(cleaned);
    console.log(`🔄 [MongoDB Atlas] Connecting to MongoDB Atlas (${masked})...`);

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(cleaned, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 8000,
    });
    console.log(`✅ Connected to MongoDB Atlas successfully (Database: ${mongoose.connection.name || 'eventhub'})`);
    return true;
  } catch (error: any) {
    const masked = maskMongoUri(cleaned);
    console.error(`❌ [MongoDB Atlas] Connection failed to [${masked}]: ${error.message}`);
    console.warn(`⚠️ [DataStore] Warning: Operating on local disk storage fallback (.data/eventhub_db.json) because MongoDB Atlas is unreachable.`);
    return false;
  }
};
