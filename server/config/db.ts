import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Ensure environment variables are loaded regardless of import entrypoint
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

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
    const msg = 'MONGODB_URI is not configured. Please define MONGODB_URI in your .env file with format: mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority';
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_FALLBACK !== 'true') {
      console.error(`❌ ${msg}`);
      throw new Error(msg);
    }
    console.log(`ℹ️ [MongoDB Atlas] MONGODB_URI not configured. Running on local persistent store until MongoDB Atlas connection is configured in Admin Console.`);
    return false;
  }

  const cleaned = cleanMongoUri(rawUri);

  // Validate scheme to prevent Mongoose "Invalid scheme" unhandled errors
  if (!isValidMongoScheme(cleaned)) {
    const preview = cleaned.length > 25 ? `${cleaned.slice(0, 22)}...` : cleaned;
    const msg = `Invalid MongoDB connection string scheme. Expected connection string to start with 'mongodb://' or 'mongodb+srv://', but received: "${preview}". Please verify your MONGODB_URI environment variable.`;
    console.error(`❌ ${msg}`);
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_FALLBACK !== 'true') {
      throw new Error(msg);
    }
    return false;
  }

  // Check for placeholder credentials
  if (cleaned.includes('<db_username>') || cleaned.includes('<db_password>') || cleaned.includes('<password>') || cleaned.includes('<username>')) {
    const msg = 'MONGODB_URI contains unconfigured placeholder credentials (such as <db_username> or <db_password>). Please replace placeholders with your actual MongoDB Atlas database user and password.';
    console.error(`❌ ${msg}`);
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_FALLBACK !== 'true') {
      throw new Error(msg);
    }
    return false;
  }

  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(cleaned, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    console.log(`✅ Connected to MongoDB Atlas successfully (Database: ${mongoose.connection.name || 'eventhub'})`);
    return true;
  } catch (error: any) {
    const masked = maskMongoUri(cleaned);
    console.error(`❌ MongoDB Atlas connection attempt failed for [${masked}]:`, error.message);
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_LOCAL_FALLBACK !== 'true') {
      throw new Error(`Failed to connect to MongoDB Atlas: ${error.message}`);
    }
    return false;
  }
};
