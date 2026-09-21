// Template Engine - String preprocessing (extends / includes / blocks)

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const preprocessMethods = {
  loadTemplate(filePath) {
    if (this.cache.has(filePath)) return this.cache.get(filePath);
    const content = readFileSync(filePath, "utf8");
    this.cache.set(filePath, content);
    return content;
  },

  extractBlocks(content) {
    const blocks = {};
    const blockRegex = /<block\s+name=["']([^"']+)["'][^>]*>(.*?)<\/block>/gs;
    let match;
    while ((match = blockRegex.exec(content)) !== null) {
      blocks[match[1]] = match[2];
    }
    return blocks;
  },

  processExtends(content, _data, currentDir) {
    const extendsMatch = content.match(/<extends\s+src=["']([^"']+)["'][^>]*\/?>/);
    if (!extendsMatch) return content;

    const layoutPath = resolve(currentDir, extendsMatch[1]);
    const layoutContent = this.loadTemplate(layoutPath);
    const blocks = this.extractBlocks(content);

    let result = layoutContent;
    for (const [blockName, blockContent] of Object.entries(blocks)) {
      const blockRegex = new RegExp(`<block\\s+name=["']${blockName}["'][^>]*>.*?<\\/block>`, "gs");
      result = result.replace(blockRegex, blockContent);
    }

    return result;
  },

  processIncludes(content, _data, currentDir) {
    const includeRegex = /<include\s+src=["']([^"']+)["']\s*\/?>|<include\s+src=["']([^"']+)["'][^>]*><\/include>/g;
    return content.replace(includeRegex, (m, s1, s2) => {
      if (/\s(?:data|locals)=['"]/.test(m)) {
        return m;
      }

      const src = s1 || s2;
      const includePath = resolve(currentDir, src);
      try {
        const includeContent = this.loadTemplate(includePath);
        return includeContent; // DOM renderer will handle inner directives
      } catch (err) {
        console.warn("Include failed:", err.message);
        return m;
      }
    });
  },
};
