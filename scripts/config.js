import path from 'path';
import process from 'process';

export const CWD = process.cwd();
export const PATH_JSON_FILE = path.join(CWD, '../data.json');
export const PATH_MD_FILE = path.join(CWD, '../data.md');
