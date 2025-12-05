#!/usr/bin/env node

/**
 * 创建新的 Livebook 子项目
 * 
 * Usage: npm run new:livebook -- <name>
 * Example: npm run new:livebook -- 2024-12-10-my-article
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const name = args[0];

if (!name) {
  console.error("Error: Please provide a livebook name");
  console.error("Usage: npm run new:livebook -- <name>");
  console.error("Example: npm run new:livebook -- 2024-12-10-my-article");
  process.exit(1);
}

// 验证名称格式
const match = name.match(/^(\d{4})-(.+)$/);
if (!match) {
  console.error("Error: Name must match pattern YYYY-* (e.g., 2024-12-10-my-article)");
  process.exit(1);
}

const [, year, slug] = match;
const livebookDir = path.resolve(__dirname, "../livebooks", name);

// 检查是否已存在
if (fs.existsSync(livebookDir)) {
  console.error(`Error: Livebook "${name}" already exists`);
  process.exit(1);
}

// 创建目录
fs.mkdirSync(livebookDir, { recursive: true });

// 创建 package.json
const packageJson = {
  name: `@website/livebook-${name}`,
  private: true,
  version: "1.0.0"
};
fs.writeFileSync(
  path.join(livebookDir, "package.json"),
  JSON.stringify(packageJson, null, 2) + "\n"
);

// 创建 index.html 模板
const htmlTemplate = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Livebook - ${slug}</title>
</head>
<body>
  <div class="notebook">
    <!-- Markdown 单元格 -->
    <div class="cell markdown">
      <h1>标题</h1>
      <p>在这里编写你的 Livebook 内容...</p>
    </div>

    <!-- 代码单元格示例 -->
    <div class="cell">
      <div class="cell-code">
        <pre><span class="highlight-comment"># 你的 Elixir 代码</span>
IO.puts(<span class="highlight-string">"Hello, World!"</span>)</pre>
      </div>
      <div class="cell-output">
        <pre>Hello, World!</pre>
      </div>
    </div>
  </div>
</body>
</html>
`;
fs.writeFileSync(path.join(livebookDir, "index.html"), htmlTemplate);

// 创建 tailwind.config.js
const tailwindConfig = `// Tailwind CSS configuration for this livebook
const path = require("path");
const sharedPreset = require("../../shared/tailwind.preset.js");

module.exports = {
  presets: [sharedPreset],
  content: [
    path.join(__dirname, "./index.html"),
    path.join(__dirname, "./*.js"),
  ],
};
`;
fs.writeFileSync(path.join(livebookDir, "tailwind.config.js"), tailwindConfig);

// 创建 styles.css（可选，带基础样式）
const cssTemplate = `/* Livebook 样式 - ${name} */

.notebook {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}

.cell {
  margin: 1.5rem 0;
}

.cell-code {
  background: #1e1e2e;
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
}

.cell-code pre {
  margin: 0;
  color: #cdd6f4;
  font-family: 'GeistMono', ui-monospace, monospace;
  font-size: 14px;
}

.cell-output {
  background: #313244;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 0.5rem;
  color: #a6adc8;
}

.markdown {
  line-height: 1.7;
}

.markdown h1 {
  color: #cba6f7;
  margin-bottom: 1rem;
}

.markdown h2 {
  color: #cba6f7;
  margin-top: 2rem;
}

.markdown h3 {
  color: #89b4fa;
  margin-top: 1.5rem;
}

.markdown p {
  margin: 1rem 0;
}

.markdown code {
  background: #313244;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9em;
}

.markdown ul, .markdown ol {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.markdown li {
  margin: 0.5rem 0;
}

/* 语法高亮 */
.highlight-keyword { color: #cba6f7; }
.highlight-string { color: #a6e3a1; }
.highlight-number { color: #fab387; }
.highlight-comment { color: #6c7086; font-style: italic; }
.highlight-function { color: #89b4fa; }
.highlight-atom { color: #f9e2af; }

/* Kino 表格 */
.kino-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.kino-table th,
.kino-table td {
  border: 1px solid #45475a;
  padding: 0.75rem;
  text-align: left;
}

.kino-table th {
  background: #313244;
  color: #cba6f7;
}

.kino-table tr:hover {
  background: #313244;
}

/* VegaLite 图表 */
.vega-chart {
  background: #1e1e2e;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}
`;
fs.writeFileSync(path.join(livebookDir, "styles.css"), cssTemplate);

console.log(`✅ Created livebook: ${name}`);
console.log(`   Directory: ${livebookDir}`);
console.log(`   Output: priv/resources/livebooks/${year}/${slug}.html`);
console.log("");
console.log("Files created:");
console.log("  - package.json");
console.log("  - index.html (template)");
console.log("  - styles.css (optional styles)");
console.log("  - tailwind.config.js");
console.log("");
console.log("Next steps:");
console.log("  1. Edit index.html with your Livebook content");
console.log("  2. Customize styles.css as needed");
console.log("  3. Run: npm run build:livebook -- --env name=" + name);

