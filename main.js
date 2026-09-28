/* AI 味红绿灯 —— 三级扫描当前笔记
 * 词表移植自 novel-ai-writing-system/src/flavor-metrics/flavor_metrics.py
 * 用法：侧边栏 ribbon 图标，或命令 "AI 味红绿灯: 检测当前笔记"。
 * 🔴 重度(段落命中>=4) 🟡 中度(2-3) 🟣 轻度(1)；点击结果跳到原段落。
 */
const { Plugin, ItemView, Notice, WorkspaceLeaf, PluginSettingTab, Setting } = require("obsidian");

const VIEW_TYPE = "ai-flavor-checker-view";

// ---------- 词表（与 flavor_metrics.py 保持同步，改词表改这里） ----------
const BAN_PATTERNS = [
  "顿时", "立刻", "连忙", "显然", "似乎", "几乎", "可能", "渐渐", "更是", "一定", "或许",
  "略微", "有点", "猛地", "瞬间", "这一刻", "一时之间", "仿佛", "像是", "如同",
  "嘴角勾起", "微微挑眉", "眼中闪过一丝", "心中一凛", "心下了然", "不动声色", "小心翼翼",
  "沉吟片刻", "眼神深邃", "眼神锐利", "深吸一口气", "缓缓地说", "目光扫过", "心中一动",
  "心里隐隐", "隐隐有了猜测", "淡淡", "郑重", "沉重", "不可置信", "不容置疑", "的确",
  "确实", "简直", "甚至", "以及", "充满", "一股", "一抹", "一丝", "意识到", "感觉到",
  "注意到", "浮现", "涌上", "炸开",
];
const EMOTION_TELL = [
  "悲伤", "愤怒", "恐惧", "紧张", "幸福", "痛苦", "绝望", "害怕", "开心", "高兴",
  "难过", "焦虑", "感动", "震撼", "震惊", "温暖", "美好", "可怕", "美丽", "安静",
  "热闹", "凄凉", "悲凉", "心酸", "心疼", "孤单", "寂寞", "激动", "兴奋",
];
const AI_VERB = ["了起来", "了下来", "了下去", "了上去", "了过去"];

const LONG_PATTERNS = BAN_PATTERNS.concat(EMOTION_TELL, AI_VERB).sort((a, b) => b.length - a.length);

/** 扫描一段文本，返回 [{word, kind}] */
function hitsIn(text) {
  const hits = [];
  for (const w of LONG_PATTERNS) {
    const kind = BAN_PATTERNS.includes(w) ? "ban" : EMOTION_TELL.includes(w) ? "tell" : "verb";
    let idx = text.indexOf(w);
    while (idx >= 0) {
      hits.push({ word: w, kind });
      idx = text.indexOf(w, idx + w.length);
    }
  }
  return hits;
}

function levelOf(n) {
  if (n >= 4) return { emoji: "🔴", name: "重度", color: "var(--text-error)" };
  if (n >= 2) return { emoji: "🟡", name: "中度", color: "var(--text-warning)" };
  return { emoji: "🟣", name: "轻度", color: "var(--text-muted)" };
}

const KIND_LABEL = { ban: "句式禁词", tell: "情绪直述", verb: "AI补全动词" };

// ---------- 插件主体 ----------
module.exports = class AiFlavorChecker extends Plugin {
  async onload() {
    this.addRibbonIcon("traffic-cone", "AI 味红绿灯：检测当前笔记", () => this.checkActiveNote());

    this.addCommand({
      id: "check-active-note",
      name: "检测当前笔记",
      callback: () => this.checkActiveNote(),
    });

    this.registerView(VIEW_TYPE, (leaf) => new FlavorView(leaf, this));
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  async checkActiveNote() {
    const view = this.app.workspace.getActiveViewOfType(require("obsidian").MarkdownView);
    if (!view) {
      new Notice("请先打开一篇笔记");
      return;
    }
    const editor = view.editor;
    const text = editor.getValue();
    const paragraphs = [];
    for (let i = 0; i < text.split("\n").length; i++) {
      const line = editor.getLine(i);
      const trimmed = line.trim();
      if (trimmed.length < 10 || trimmed.startsWith("#")) continue;
      const hits = hitsIn(trimmed);
      if (hits.length) paragraphs.push({ line: i, text: trimmed, hits });
    }

    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
    const flavorView = leaf.view;
    flavorView.render(paragraphs, editor, view.file ? view.file.basename : "当前笔记");
  }
};

class FlavorView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "AI 味红绿灯"; }
  getIcon() { return "traffic-cone"; }

  render(paragraphs, editor, title) {
    const { contentEl } = this;
    contentEl.empty();

    const total = paragraphs.reduce((s, p) => s + p.hits.length, 0);
    const header = contentEl.createEl("h4", { text: `AI 味红绿灯 · ${title}` });
    header.style.margin = "0 0 4px 0";
    contentEl.createEl("div", {
      text: `命中 ${total} 处 / ${paragraphs.length} 个段落`,
      cls: "flavor-summary",
    });

    if (!paragraphs.length) {
      contentEl.createEl("div", { text: "✅ 未检出 AI 味词。" });
      return;
    }

    // 重度在前
    paragraphs.sort((a, b) => b.hits.length - a.hits.length);

    for (const p of paragraphs) {
      const lv = levelOf(p.hits.length);
      const item = contentEl.createDiv("flavor-item");
      const head = item.createDiv("flavor-item-head");
      head.createEl("span", { text: `${lv.emoji} 行${p.line + 1} · ${p.hits.length} 处` });
      head.style.cssText = `cursor: pointer; font-weight: 600; color: ${lv.color};`;
      head.addEventListener("click", () => {
        editor.setCursor({ line: p.line, ch: 0 });
        editor.scrollIntoView({ from: { line: p.line, ch: 0 }, to: { line: p.line + 1, ch: 0 } }, true);
        editor.setSelection({ line: p.line, ch: 0 }, { line: p.line, ch: editor.getLine(p.line).length });
      });

      const excerpt = item.createDiv("flavor-excerpt");
      excerpt.setText(p.text.length > 60 ? p.text.slice(0, 60) + "…" : p.text);

      const words = item.createDiv("flavor-words");
      // 去重计数显示
      const counts = {};
      for (const h of p.hits) counts[h.word + "|" + h.kind] = (counts[h.word + "|" + h.kind] || 0) + 1;
      for (const [key, n] of Object.entries(counts)) {
        const [word, kind] = key.split("|");
        const tag = words.createEl("span", { text: n > 1 ? `${word}×${n}` : word });
        tag.title = KIND_LABEL[kind];
        tag.className = "flavor-tag flavor-tag-" + kind;
      }
      words.style.marginTop = "4px";
    }
  }
}
