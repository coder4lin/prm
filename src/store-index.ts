// Index module for component metadata
// Scans store directory and builds index from component metadata files

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

export interface ComponentMetadata {
  name: string;
  description: string;
  path: string;
}

export interface StoreIndex {
  version: number;
  updatedAt: string;
  skills: ComponentMetadata[];
  agents: ComponentMetadata[];
  mcps: ComponentMetadata[];
}

const INDEX_VERSION = 1;
const INDEX_FILENAME = 'index.json';

/**
 * Build index by scanning store directory
 */
export async function buildIndex(storeDir: string): Promise<StoreIndex> {
  const index: StoreIndex = {
    version: INDEX_VERSION,
    updatedAt: new Date().toISOString(),
    skills: [],
    agents: [],
    mcps: [],
  };

  // Scan skills: {storeDir}/skills/ directories, read SKILL.md YAML frontmatter
  const skillsDir = path.join(storeDir, 'skills');
  if (fs.existsSync(skillsDir)) {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(skillsDir, entry.name);
        const skillFile = path.join(skillPath, 'SKILL.md');
        const metadata = readSkillMetadata(skillFile, entry.name);
        index.skills.push({
          name: metadata.name,
          description: metadata.description,
          path: skillPath,
        });
      }
    }
  }

  // Scan agents: {storeDir}/agents/*.md files, read YAML frontmatter
  const agentsDir = path.join(storeDir, 'agents');
  if (fs.existsSync(agentsDir)) {
    const files = fs.readdirSync(agentsDir, { withFileTypes: true });
    for (const file of files) {
      if (file.isFile() && file.name.endsWith('.md')) {
        const agentPath = path.join(agentsDir, file.name);
        const metadata = readAgentMetadata(agentPath, file.name);
        index.agents.push({
          name: metadata.name,
          description: metadata.description,
          path: agentPath,
        });
      }
    }
  }

  // Scan MCPs: {storeDir}/mcp/*.json files, read top-level name/description
  const mcpDir = path.join(storeDir, 'mcp');
  if (fs.existsSync(mcpDir)) {
    const files = fs.readdirSync(mcpDir, { withFileTypes: true });
    for (const file of files) {
      if (file.isFile() && file.name.endsWith('.json')) {
        const mcpPath = path.join(mcpDir, file.name);
        const metadata = readMcpMetadata(mcpPath, file.name);
        index.mcps.push({
          name: metadata.name,
          description: metadata.description,
          path: mcpPath,
        });
      }
    }
  }

  return index;
}

/**
 * Read skill metadata from SKILL.md file
 */
function readSkillMetadata(skillFile: string, fallbackName: string): { name: string; description: string } {
  try {
    if (!fs.existsSync(skillFile)) {
      return { name: fallbackName, description: '' };
    }
    const content = fs.readFileSync(skillFile, 'utf-8');
    const { data } = matter(content);
    return {
      name: data.name || fallbackName,
      description: data.description || '',
    };
  } catch (error) {
    console.warn(`Warning: Failed to parse ${skillFile}:`, error);
    return { name: fallbackName, description: '' };
  }
}

/**
 * Read agent metadata from .md file
 */
function readAgentMetadata(agentFile: string, fallbackName: string): { name: string; description: string } {
  try {
    const content = fs.readFileSync(agentFile, 'utf-8');
    const { data } = matter(content);
    // Remove .md extension from fallback name
    const baseName = fallbackName.replace(/\.md$/, '');
    return {
      name: data.name || baseName,
      description: data.description || '',
    };
  } catch (error) {
    console.warn(`Warning: Failed to parse ${agentFile}:`, error);
    const baseName = fallbackName.replace(/\.md$/, '');
    return { name: baseName, description: '' };
  }
}

/**
 * Read MCP metadata from .json file
 */
function readMcpMetadata(mcpFile: string, fallbackName: string): { name: string; description: string } {
  try {
    const content = fs.readFileSync(mcpFile, 'utf-8');
    const json = JSON.parse(content);
    // Remove .json extension from fallback name
    const baseName = fallbackName.replace(/\.json$/, '');
    return {
      name: json.name || baseName,
      description: json.description || '',
    };
  } catch (error) {
    console.warn(`Warning: Failed to parse ${mcpFile}:`, error);
    const baseName = fallbackName.replace(/\.json$/, '');
    return { name: baseName, description: '' };
  }
}

/**
 * Save index to index.json file
 */
export async function saveIndex(storeDir: string, index: StoreIndex): Promise<void> {
  const indexPath = path.join(storeDir, INDEX_FILENAME);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}

/**
 * Load index from index.json file
 */
export async function loadIndex(storeDir: string): Promise<StoreIndex | null> {
  const indexPath = path.join(storeDir, INDEX_FILENAME);
  if (!fs.existsSync(indexPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(indexPath, 'utf-8');
    return JSON.parse(content) as StoreIndex;
  } catch (error) {
    console.warn(`Warning: Failed to load index from ${indexPath}:`, error);
    return null;
  }
}

/**
 * Get or generate index
 */
export async function getIndex(storeDir: string): Promise<StoreIndex> {
  const index = await loadIndex(storeDir);
  if (index) {
    return index;
  }
  // Build new index if not exists
  const newIndex = await buildIndex(storeDir);
  await saveIndex(storeDir, newIndex);
  return newIndex;
}