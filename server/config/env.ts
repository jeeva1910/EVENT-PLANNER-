import dotenv from 'dotenv';
import path from 'path';

// Load root-level .env file if present.
// If .env is not present, process.env will seamlessly use host/container environment variables.
dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });
