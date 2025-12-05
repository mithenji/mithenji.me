const path = require("path");
const fs = require("fs");
const { rspack } = require("@rspack/core");

const isDev = process.env.NODE_ENV !== "production";

/**
 * 扫描 livebooks 目录，获取所有子项目
 * @returns {Array<{name: string, dir: string, year: string, slug: string}>}
 */
function scanLivebooks() {
  const livebooksDir = path.resolve(__dirname, "livebooks");
  
  if (!fs.existsSync(livebooksDir)) {
    return [];
  }
  
  return fs.readdirSync(livebooksDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => {
      const name = dirent.name;
      // 解析目录名: YYYY-MM-DD-slug -> year: YYYY, slug: MM-DD-slug
      const match = name.match(/^(\d{4})-(.+)$/);
      if (!match) {
        console.warn(`Warning: Livebook directory "${name}" does not match pattern YYYY-*`);
        return null;
      }
      return {
        name,
        dir: path.join(livebooksDir, name),
        year: match[1],
        slug: match[2]
      };
    })
    .filter(Boolean);
}

/**
 * 创建 main 项目的配置
 */
function createMainConfig() {
  return {
    name: "main",
    mode: isDev ? "development" : "production",
    devtool: isDev ? "inline-source-map" : false,
    entry: {
      app: path.resolve(__dirname, "main/javascript/app.js"),
    },
    output: {
      path: path.resolve(__dirname, "../priv/static/assets"),
      filename: "[name].js",
      publicPath: "/assets/",
      clean: false,
    },
    resolve: {
      extensions: [".js", ".json"],
      alias: {
        phoenix: path.resolve(__dirname, "../deps/phoenix/priv/static/phoenix.mjs"),
        phoenix_html: path.resolve(__dirname, "../deps/phoenix_html/priv/static/phoenix_html.js"),
        phoenix_live_view: path.resolve(__dirname, "../deps/phoenix_live_view/priv/static/phoenix_live_view.esm.js"),
      },
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          type: "javascript/auto",
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: [
                    require("tailwindcss")(path.resolve(__dirname, "main/tailwind.config.js")),
                    require("autoprefixer"),
                  ],
                },
              },
            },
          ],
          type: "css",
        },
        {
          test: /\.(ttf|woff|woff2|eot|svg)$/,
          type: "asset/resource",
          generator: {
            filename: "fonts/[name][ext]",
          },
        },
      ],
    },
    optimization: {
      minimize: !isDev,
    },
    watchOptions: {
      ignored: /node_modules/,
      aggregateTimeout: 200,
    },
    stats: {
      colors: true,
      modules: false,
      children: false,
    },
  };
}

/**
 * 内联 CSS 到 HTML 的插件
 */
class InlineCssPlugin {
  constructor(options) {
    this.cssFile = options.cssFile;
    this.htmlFile = options.htmlFile;
    this.outputDir = options.outputDir;
  }
  
  apply(compiler) {
    compiler.hooks.afterEmit.tap("InlineCssPlugin", () => {
      const htmlPath = path.join(this.outputDir, this.htmlFile);
      const cssPath = path.join(this.outputDir, "_styles.css");
      
      if (fs.existsSync(htmlPath) && fs.existsSync(cssPath)) {
        let html = fs.readFileSync(htmlPath, "utf-8");
        const css = fs.readFileSync(cssPath, "utf-8");
        
        // 查找 <link rel="stylesheet"> 并替换为内联 <style>
        html = html.replace(
          /<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*styles\.css["'][^>]*\/?>/gi,
          `<style>\n${css}\n</style>`
        );
        
        // 也处理 href 在前的情况
        html = html.replace(
          /<link[^>]*href=["'][^"']*styles\.css["'][^>]*rel=["']stylesheet["'][^>]*\/?>/gi,
          `<style>\n${css}\n</style>`
        );
        
        // 如果没有找到 link 标签，在 </head> 前插入
        if (!html.includes("<style>")) {
          html = html.replace("</head>", `<style>\n${css}\n</style>\n</head>`);
        }
        
        fs.writeFileSync(htmlPath, html);
        
        // 删除临时 CSS 文件
        fs.unlinkSync(cssPath);
      }
      
      // 清理临时 JS 文件
      const tempJs = path.join(this.outputDir, "_main.js");
      if (fs.existsSync(tempJs)) {
        fs.unlinkSync(tempJs);
      }
    });
  }
}

/**
 * 创建单个 livebook 项目的配置
 * @param {{name: string, dir: string, year: string, slug: string}} livebook
 */
function createLivebookConfig(livebook) {
  const { name, dir, year, slug } = livebook;
  const outputDir = path.resolve(__dirname, `../priv/resources/livebooks/${year}`);
  const outputFilename = `${slug}.html`;
  
  // 检查必需的文件
  const htmlTemplate = path.join(dir, "index.html");
  if (!fs.existsSync(htmlTemplate)) {
    console.warn(`Warning: Livebook "${name}" missing index.html, skipping...`);
    return null;
  }
  
  // 检查可选的入口文件
  const jsEntry = path.join(dir, "index.js");
  const cssEntry = path.join(dir, "styles.css");
  const hasJs = fs.existsSync(jsEntry);
  const hasCss = fs.existsSync(cssEntry);
  
  // 检查是否有 tailwind 配置
  const tailwindConfig = path.join(dir, "tailwind.config.js");
  const hasTailwind = fs.existsSync(tailwindConfig);
  
  // 构建入口
  const entry = {};
  if (hasJs) {
    entry.main = jsEntry;
  }
  if (hasCss) {
    entry._styles = cssEntry;
  }
  
  // 如果没有任何入口，使用占位符
  const hasEntry = Object.keys(entry).length > 0;
  if (!hasEntry) {
    entry._placeholder = path.join(__dirname, "scripts/placeholder.js");
  }
  
  const config = {
    name: `livebook-${name}`,
    mode: isDev ? "development" : "production",
    devtool: false,
    entry,
    output: {
      path: outputDir,
      filename: "[name].js",
      cssFilename: "[name].css",
      clean: false,
    },
    experiments: {
      css: true,
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          type: "javascript/auto",
        },
        {
          test: /\.css$/,
          use: [
            {
              loader: "postcss-loader",
              options: {
                postcssOptions: {
                  plugins: [
                    require("tailwindcss")(
                      hasTailwind ? tailwindConfig : path.resolve(__dirname, "shared/tailwind.preset.js")
                    ),
                    require("autoprefixer"),
                  ],
                },
              },
            },
          ],
          type: "css",
        },
      ],
    },
    plugins: [
      new rspack.HtmlRspackPlugin({
        template: htmlTemplate,
        filename: outputFilename,
        inject: hasJs ? "body" : false,
        minify: !isDev,
        scriptLoading: "blocking",
      }),
      // 内联 CSS 到 HTML
      ...(hasCss ? [new InlineCssPlugin({
        cssFile: cssEntry,
        htmlFile: outputFilename,
        outputDir,
      })] : []),
      // 清理临时文件
      {
        apply(compiler) {
          compiler.hooks.afterEmit.tap("CleanupTempFiles", () => {
            // 清理占位符文件
            const placeholderFile = path.join(outputDir, "_placeholder.js");
            if (fs.existsSync(placeholderFile)) {
              fs.unlinkSync(placeholderFile);
            }
            // 清理临时 styles JS 文件
            const stylesJs = path.join(outputDir, "_styles.js");
            if (fs.existsSync(stylesJs)) {
              fs.unlinkSync(stylesJs);
            }
          });
        }
      }
    ],
    optimization: {
      minimize: !isDev,
    },
    stats: {
      colors: true,
      modules: false,
      children: false,
    },
  };
  
  return config;
}

/**
 * 根据环境变量导出配置
 */
module.exports = (env = {}) => {
  const { target, name } = env;
  const configs = [];
  
  // 默认或指定构建 main
  if (!target || target === "main" || target === "all") {
    configs.push(createMainConfig());
  }
  
  // 构建所有 livebooks
  if (target === "livebooks" || target === "all" || !target) {
    const livebooks = scanLivebooks();
    for (const livebook of livebooks) {
      const config = createLivebookConfig(livebook);
      if (config) {
        configs.push(config);
      }
    }
  }
  
  // 构建指定的 livebook
  if (target === "livebook" && name) {
    const livebooks = scanLivebooks();
    const livebook = livebooks.find(l => l.name === name || l.slug === name);
    if (livebook) {
      const config = createLivebookConfig(livebook);
      if (config) {
        configs.push(config);
      }
    } else {
      console.error(`Error: Livebook "${name}" not found`);
      process.exit(1);
    }
  }
  
  // 如果只有一个配置，直接返回；否则返回数组
  return configs.length === 1 ? configs[0] : configs;
};
