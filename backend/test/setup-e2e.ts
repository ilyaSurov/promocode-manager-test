import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

const repoRoot = path.resolve(__dirname, '../..');
const envFile = fs.existsSync(path.join(repoRoot, '.env'))
  ? path.join(repoRoot, '.env')
  : path.join(repoRoot, '.env.example');
config({ path: envFile });
