import { Command } from "commander";
import { doUpdate } from "../core/updater.js";
import pc from "picocolors";

export function registerUpdateCommand(program: Command): void {
  program
    .command("update")
    .description("检查并升级 skill-manager 到最新版本")
    .action(async () => {
      try {
        await doUpdate();
      } catch (e) {
        console.error(pc.red("✗"), (e as Error).message);
        process.exit(1);
      }
    });
}
