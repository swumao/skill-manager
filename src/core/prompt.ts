import { createInterface } from "node:readline";

export function closePrompt(): void {
  // no-op with per-call interfaces
}

export function ask(question: string, defaultVal?: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    const hint = defaultVal ? ` (${defaultVal})` : "";
    rl.question(`${question}${hint}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultVal || "");
    });
  });
}

export async function confirm(question: string, defaultVal: boolean = true): Promise<boolean> {
  const hint = defaultVal ? "[Y/n]" : "[y/N]";
  const answer = await ask(`${question} ${hint}`, defaultVal ? "y" : "n");
  return answer.toLowerCase().startsWith("y");
}

export async function select(
  title: string,
  items: { name: string; value: string }[],
  defaultVal?: string
): Promise<string> {
  console.log(`\n${title}`);
  for (let i = 0; i < items.length; i++) {
    const hint = items[i].value === defaultVal ? " (default)" : "";
    console.log(`  ${i + 1}. ${items[i].name}${hint}`);
  }
  const defaultIdx = defaultVal
    ? String(items.findIndex((i) => i.value === defaultVal) + 1)
    : "1";
  const answer = await ask("输入序号选择", defaultIdx);
  const idx = parseInt(answer, 10);
  if (idx >= 1 && idx <= items.length) {
    return items[idx - 1].value;
  }
  return items[0].value;
}

export async function multiSelect(
  title: string,
  items: { name: string; checked?: boolean }[]
): Promise<string[]> {
  console.log(`\n${title}`);
  const selected = new Set(items.filter((i) => i.checked).map((i) => i.name));

  for (let i = 0; i < items.length; i++) {
    const mark = selected.has(items[i].name) ? "*" : " ";
    console.log(`  ${i + 1}. [${mark}] ${items[i].name}`);
  }

  const defaultStr = [...selected].join(",");
  const answer = await ask(
    `输入序号选择（逗号分隔多个，留空确认）`,
    defaultStr
  );

  if (answer && answer !== defaultStr) {
    selected.clear();
    const indices = answer.split(",").map((s) => parseInt(s.trim(), 10));
    for (const idx of indices) {
      if (idx >= 1 && idx <= items.length) {
        selected.add(items[idx - 1].name);
      }
    }
  }

  return [...selected];
}
