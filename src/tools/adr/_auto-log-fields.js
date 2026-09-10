

/** The auto-log entry fields, one shape per logged tool. */

/** Title, tags and body lines for one auto-logged call, by tool. */
export function autoLogFields(toolName, arguments_, result) {
  switch (toolName) {
    case "pix_tool": {
      // pix_tool: capture prompt + routing result
      const prompt = (arguments_.prompt || "").slice(0, 200);
      let route = "unknown";
      let confidence = "0";
      let alternatives = "";

      try {
        const resultText = result?.content?.[0]?.text || "{}";
        const parsed = JSON.parse(resultText);

        if (parsed.route) {
          route = parsed.route;
        }

        if (parsed.confidence) {
          confidence = String(parsed.confidence);
        }

        if (parsed.alternatives?.length > 0) {
          alternatives = parsed.alternatives
            .slice(0, 3)
            .map((a) => `${a.route} (${a.confidence})`)
            .join(", ");
        }
      } catch {
        /* use defaults */
      }

      const contextLines = [`Prompt: "${prompt}"`, `Routed to: **${route}** (confidence: ${confidence})`];

      if (alternatives) {
        contextLines.push(`Alternatives: ${alternatives}`);
      }

      return {
        title: `Skill routing: ${prompt.slice(0, 80)}`,
        tags: "tool, auto-log, routing",
        contextLines,
        decisionLines: [`Use \`${route}\` for this task.`],
      };
    }
    case "rule_tool_scaffold": {
      return {
        title: `Scaffold: ${arguments_.mode || "generate"} ${arguments_.file || "all files"}`,
        tags: "tool, auto-log",
        contextLines: [`Scaffold operation: ${arguments_.mode || "generate"}`, `File: ${arguments_.file || "all"}`],
        decisionLines: [`Project scaffold files generated/validated.`],
      };
    }
    case "rule_tool_detect": {
      let framework = "unknown";

      try {
        const resultText = result?.content?.[0]?.text || "{}";
        const parsed = JSON.parse(resultText);

        framework = parsed.framework || "unknown";
      } catch {
        /* result may not be valid JSON */
      }

      return {
        title: `Framework detection for ${arguments_.path || "."}`,
        tags: "tool, auto-log",
        contextLines: [`Path: ${arguments_.path || "."}`, `Detected framework: ${framework}`],
        decisionLines: [`Use ${framework} tooling for this project.`],
      };
    }
    case "rule_tool_fix": {
      return {
        title: `File tree fix: ${arguments_.mode || "lint"} on ${arguments_.path || "."}`,
        tags: "tool, auto-log, file-tree",
        contextLines: [`Mode: ${arguments_.mode || "lint"}`, `Source: ${arguments_.srcDir || "src"}`],
        decisionLines: [`File tree validated/fixed for rule AI conventions.`],
      };
    }
    default: {
      // Generic (any rule_tool_* action)
      return {
        title: `Tool: ${toolName} - ${arguments_.action || arguments_.mode || "execute"}`,
        tags: "tool, auto-log",
        contextLines: [`Tool: ${toolName}`, `Args: ${JSON.stringify(arguments_).slice(0, 200)}`],
        decisionLines: [`Tool executed successfully.`],
      };
    }
  }
}
