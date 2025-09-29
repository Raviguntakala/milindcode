#!/usr/bin/env bun
/**
 * Script to rename user-facing opencode references to milindcode
 * This script only changes user-visible elements, not internal code
 */

import path from "path"

const DRY_RUN = process.env["DRY_RUN"] === "true"

interface RenameRule {
    description: string
    files: string[]
    search: string | RegExp
    replace: string
    isRegex?: boolean
}

const renameRules: RenameRule[] = [
    // === USER-FACING VISUAL CHANGES ONLY ===

    // 1. Global config directory name (user sees ~/.config/milindcode/)
    {
        description: "Global config directory app name",
        files: ["packages/opencode/src/global/index.ts"],
        search: 'const app = "opencode"',
        replace: 'const app = "milindcode"'
    },

    // 2. Install script directory (user sees ~/.milindcode/bin)
    {
        description: "Install script directory",
        files: ["install"],
        search: "INSTALL_DIR=$HOME/.opencode/bin",
        replace: "INSTALL_DIR=$HOME/.milindcode/bin"
    },

    // 3. Config file search patterns (user sees milindcode.json)
    {
        description: "Config file search patterns",
        files: ["packages/opencode/src/config/config.ts"],
        search: '["opencode.jsonc", "opencode.json"]',
        replace: '["milindcode.jsonc", "milindcode.json"]'
    },

    // 4. Global config file names (user sees ~/.config/milindcode/milindcode.json)
    {
        description: "Global config file names",
        files: ["packages/opencode/src/config/config.ts"],
        search: /path\.join\(Global\.Path\.config, "opencode\.json(c?)"\)/g,
        replace: 'path.join(Global.Path.config, "milindcode.json$1")',
        isRegex: true
    },

    // 5. Project .opencode folder references (user sees .milindcode/ folders)
    {
        description: "Project .milindcode folder references",
        files: ["packages/opencode/src/config/config.ts"],
        search: '[".opencode"]',
        replace: '[".milindcode"]'
    },

    // 6. Install directory check (user sees .milindcode/bin)
    {
        description: "Install directory check in installation detection",
        files: ["packages/opencode/src/installation/index.ts"],
        search: 'path.join(".opencode", "bin")',
        replace: 'path.join(".milindcode", "bin")'
    },

    // 7. TUI theme directory references (user sees .milindcode/ folders)
    {
        description: "TUI theme directory references",
        files: [
            "packages/tui/internal/theme/loader.go",
            "packages/tui/internal/theme/loader_test.go"
        ],
        search: /\.opencode/g,
        replace: ".milindcode",
        isRegex: true
    },

    // === VISUAL BRANDING CHANGES ===

    // 8. CLI script name (user sees "milindcode" in help)
    {
        description: "CLI script name",
        files: ["packages/opencode/src/index.ts"],
        search: '.scriptName("opencode")',
        replace: '.scriptName("milindcode")'
    },

    // 9. Main display logo in CLI UI (user sees MILINDCODE logo)
    {
        description: "Main display logo in CLI UI",
        files: ["packages/opencode/src/cli/ui.ts"],
        search: `  const LOGO = [
    [\`█▀▀█ █▀▀█ █▀▀ █▀▀▄ \`, \`█▀▀ █▀▀█ █▀▀▄ █▀▀\`],
    [\`█░░█ █░░█ █▀▀ █░░█ \`, \`█░░ █░░█ █░░█ █▀▀\`],
    [\`▀▀▀▀ █▀▀▀ ▀▀▀ ▀  ▀ \`, \`▀▀▀ ▀▀▀▀ ▀▀▀  ▀▀▀\`],
  ]`,
        replace: `  const LOGO = [
    [\`█▀▄▀█ ▀█▀ █░░ ▀█▀ █▀▀▄ █▀▀▄ \`, \`█▀▀ █▀▀█ █▀▀▄ █▀▀\`],
    [\`█░▀░█ ░█░ █░░ ░█░ █░░█ █░░█ \`, \`█░░ █░░█ █░░█ █▀▀\`],
    [\`▀░░░▀ ▀▀▀ ▀▀▀ ▀▀▀ ▀░░▀ ▀▀▀░ \`, \`▀▀▀ ▀▀▀▀ ▀▀▀░ ▀▀▀\`],
  ]`
    },

    // 10. TUI status bar branding (user sees "milind" in status bar)
    {
        description: "TUI status bar branding",
        files: ["packages/tui/internal/components/status/status.go"],
        search: 'open := base("open")',
        replace: 'open := base("milind")'
    },

    // 11. TUI home screen logo (user sees MILINDCODE logo in TUI)
    {
        description: "TUI home screen logo",
        files: ["packages/tui/internal/tui/tui.go"],
        search: `	open := \`
                    
█▀▀█ █▀▀█ █▀▀█ █▀▀▄ 
█░░█ █░░█ █▀▀▀ █░░█ 
▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀  ▀ \``,
        replace: `	open := \`
                    
█▀▄▀█ ▀█▀ █░░ ▀█▀ █▀▀▄ █▀▀▄ 
█░▀░█ ░█░ █░░ ░█░ █░░█ █░░█ 
▀░░░▀ ▀▀▀ ▀▀▀ ▀▀▀ ▀░░▀ ▀▀▀░ \``,
    },

    // 12. Help text for project path (user sees this in --help)
    {
        description: "Help text for project path",
        files: ["packages/opencode/src/cli/cmd/tui.ts"],
        search: 'describe: "path to start opencode in"',
        replace: 'describe: "path to start milindcode in"'
    },

    // 13. TUI command description (user sees this in --help)
    {
        description: "TUI command description",
        files: ["packages/opencode/src/cli/cmd/tui.ts"],
        search: 'describe: "start opencode tui"',
        replace: 'describe: "start milindcode tui"'
    },

    // 14. Attach command description (user sees this in --help)
    {
        description: "Attach command description",
        files: ["packages/opencode/src/cli/cmd/attach.ts"],
        search: 'describe: "attach to a running opencode server"',
        replace: 'describe: "attach to a running milindcode server"'
    },

    // 15. Run command description (user sees this in --help)
    {
        description: "Run command description",
        files: ["packages/opencode/src/cli/cmd/run.ts"],
        search: 'describe: "run opencode with a message"',
        replace: 'describe: "run milindcode with a message"'
    },

    // 16. Upgrade command description (user sees this in --help)
    {
        description: "Upgrade command description",
        files: ["packages/opencode/src/cli/cmd/upgrade.ts"],
        search: 'describe: "upgrade opencode to the latest or a specific version"',
        replace: 'describe: "upgrade milindcode to the latest or a specific version"'
    },

    // 17. Serve command description (user sees this in --help)
    {
        description: "Serve command description",
        files: ["packages/opencode/src/cli/cmd/serve.ts"],
        search: 'describe: "starts a headless opencode server"',
        replace: 'describe: "starts a headless milindcode server"'
    },

    // 18. Postinstall script binary name (user sees milindcode command)
    {
        description: "Postinstall script binary name",
        files: ["packages/opencode/script/postinstall.mjs"],
        search: 'const binScript = path.join(__dirname, "bin", "opencode")',
        replace: 'const binScript = path.join(__dirname, "bin", "milindcode")'
    },

    // 18b. Postinstall script binary lookup (looks for correct binary name)
    {
        description: "Postinstall script binary lookup",
        files: ["packages/opencode/script/postinstall.mjs"],
        search: 'const binary = platform === "windows" ? "opencode.exe" : "opencode"',
        replace: 'const binary = platform === "windows" ? "milindcode.exe" : "milindcode"'
    },

    // 19. Postinstall script package name pattern (uses buildwise-ai prefix)
    {
        description: "Postinstall script package name pattern",
        files: ["packages/opencode/script/postinstall.mjs"],
        search: 'const packageName = `buildwise-ai-milindcode-${platform}-${arch}`',
        replace: 'const packageName = `@buildwise-ai/milindcode-${platform}-${arch}`',
    },

    // 20. Postinstall script rebuild command (user sees buildwise-ai-milindcode in error messages)
    {
        description: "Postinstall script rebuild command",
        files: ["packages/opencode/script/postinstall.mjs"],
        search: 'const cmd = `npm rebuild buildwise-ai-milindcode --ignore-scripts${isGlobal ? " -g" : ""}`',
        replace: 'const cmd = `npm rebuild @buildwise-ai/milindcode --ignore-scripts${isGlobal ? " -g" : ""}`',
    },

    // 21. Postinstall script error message (user sees buildwise-ai-milindcode in error messages)
    {
        description: "Postinstall script error message",
        files: ["packages/opencode/script/postinstall.mjs"],
        search: 'console.error("npm rebuild failed. You may need to manually run: npm rebuild buildwise-ai-milindcode --ignore-scripts")',
        replace: 'console.error("npm rebuild failed. You may need to manually run: npm rebuild @buildwise-ai/milindcode --ignore-scripts")'
    },

    // 22. Replace opencode with milindcode in prompt files
    {
        description: "Prompt files - replace opencode with milindcode",
        files: [
            "packages/opencode/src/session/prompt/anthropic_spoof.txt",
            "packages/opencode/src/session/prompt/anthropic.txt", 
            "packages/opencode/src/session/prompt/beast.txt",
            "packages/opencode/src/session/prompt/codex.txt",
            "packages/opencode/src/session/prompt/qwen.txt",
            "packages/opencode/src/session/prompt/gemini.txt",
            "packages/opencode/src/session/prompt/copilot-gpt-5.txt"
        ],
        search: /opencode/g,
        replace: "milindcode",
        isRegex: true
    },

    // 23. Fix bin command in package.json (user sees milindcode command)
    {
        description: "Fix bin command in package.json",
        files: ["packages/opencode/package.json"],
        search: '"opencode": "./bin/opencode"',
        replace: '"milindcode": "./bin/milindcode"'
    },

    // 24. Fix error message in Unix binary wrapper (user sees this error)
    {
        description: "Fix error message in Unix binary wrapper",
        files: ["packages/opencode/bin/opencode"],
        search: 'printf "It seems that your package manager failed to install the right version of the opencode CLI for your platform. You can try manually installing the \\"%s\\" package\\n" "$name" >&2',
        replace: 'printf "It seems that your package manager failed to install the right version of the milindcode CLI for your platform. You can try manually installing the \\"%s\\" package\\n" "$name" >&2'
    },

    // 25. Fix error message in Windows binary wrapper (user sees this error)
    {
        description: "Fix error message in Windows binary wrapper",
        files: ["packages/opencode/bin/opencode.cmd"],
        search: 'echo It seems that your package manager failed to install the right version of the opencode CLI for your platform. You can try manually installing the "%name%" package >&2',
        replace: 'echo It seems that your package manager failed to install the right version of the milindcode CLI for your platform. You can try manually installing the "%name%" package >&2'
    },

    // 26. Fix Windows package name pattern (critical for Windows installation)
    {
        description: "Fix Windows package name pattern",
        files: ["packages/opencode/bin/opencode.cmd"],
        search: 'set "name=opencode-!platform!-!arch!"',
        replace: 'set "name=@buildwise-ai/milindcode-!platform!-!arch!"'
    },

    // 27. Fix Windows binary name (critical for Windows installation)
    {
        description: "Fix Windows binary name",
        files: ["packages/opencode/bin/opencode.cmd"],
        search: 'set "binary=opencode.exe"',
        replace: 'set "binary=milindcode.exe"'
    },

    // 28. Fix Unix package name pattern (critical for Unix installation)
    {
        description: "Fix Unix package name pattern",
        files: ["packages/opencode/bin/opencode"],
        search: 'name="opencode-${platform}-${arch}"',
        replace: 'name="@buildwise-ai/milindcode-${platform}-${arch}"'
    },

    // 29. Fix Unix binary name (critical for Unix installation)
    {
        description: "Fix Unix binary name",
        files: ["packages/opencode/bin/opencode"],
        search: 'binary="opencode"',
        replace: 'binary="milindcode"'
    },

    // 30. Fix Unix binary name for Windows (critical for cross-platform)
    {
        description: "Fix Unix binary name for Windows",
        files: ["packages/opencode/bin/opencode"],
        search: '[ "$platform" = "win32" ] && binary="opencode.exe"',
        replace: '[ "$platform" = "win32" ] && binary="milindcode.exe"'
    },

    // 31. Add Windows platform mapping (maps win32 to windows for package names)
    {
        description: "Add Windows platform mapping",
        files: ["packages/opencode/bin/opencode"],
        search: 'name="@buildwise-ai/milindcode-${platform}-${arch}"',
        replace: 'pkg_platform="${platform}"\n    [ "$platform" = "win32" ] && pkg_platform="windows"\n    name="@buildwise-ai/milindcode-${pkg_platform}-${arch}"'
    }
]

async function applyRenameRule(rule: RenameRule) {
    console.log(`\n📝 ${rule.description}`)

    for (const filePath of rule.files) {
        const fullPath = path.resolve(filePath)

        try {
            const content = await Bun.file(fullPath).text()
            let newContent: string

            if (rule.isRegex && rule.search instanceof RegExp) {
                newContent = content.replace(rule.search, rule.replace)
            } else {
                newContent = content.replaceAll(rule.search as string, rule.replace)
            }

            if (content !== newContent) {
                console.log(`  ✅ ${filePath}`)
                if (!DRY_RUN) {
                    await Bun.write(fullPath, newContent)
                }
            } else {
                console.log(`  ⏭️  ${filePath} (no changes needed)`)
            }
        } catch (error) {
            console.log(`  ❌ ${filePath} (file not found or error: ${error})`)
        }
    }
}

async function renameBinaryFiles() {
    console.log(`\n📝 Renaming binary wrapper files`)
    
    const filesToRename = [
        {
            from: "packages/opencode/bin/opencode",
            to: "packages/opencode/bin/milindcode"
        },
        {
            from: "packages/opencode/bin/opencode.cmd", 
            to: "packages/opencode/bin/milindcode.cmd"
        }
    ]
    
    for (const {from, to} of filesToRename) {
        try {
            const fromPath = path.resolve(from)
            const toPath = path.resolve(to)
            
            if (await Bun.file(fromPath).exists()) {
                if (!DRY_RUN) {
                    const content = await Bun.file(fromPath).text()
                    await Bun.write(toPath, content)
                    await Bun.file(fromPath).unlink()
                }
                console.log(`  ✅ ${from} → ${to}`)
            } else {
                console.log(`  ⏭️  ${from} (file not found, may already be renamed)`)
            }
        } catch (error) {
            console.log(`  ❌ Failed to rename ${from}: ${error}`)
        }
    }
}

async function main() {
    console.log("🔄 Renaming user-facing opencode references to milindcode...")

    if (DRY_RUN) {
        console.log("🔍 DRY RUN MODE - No files will be modified")
    }

    for (const rule of renameRules) {
        await applyRenameRule(rule)
    }

    // Rename binary wrapper files
    await renameBinaryFiles()

    console.log("\n✨ Visual rebranding complete!")
    console.log("\n📋 Summary of USER-FACING changes:")
    console.log("   • Global config directory: ~/.config/opencode/ → ~/.config/milindcode/")
    console.log("   • Install directory: ~/.opencode/bin → ~/.milindcode/bin")
    console.log("   • Project folders: .opencode/ → .milindcode/")
    console.log("   • Config files: opencode.json → milindcode.json")
    console.log("   • Config files: opencode.jsonc → milindcode.jsonc")
    console.log("   • CLI script name: opencode → milindcode")
    console.log("   • ASCII logos updated to show 'MILINDCODE' branding")
    console.log("   • TUI status bar shows 'milind' instead of 'open'")

    if (DRY_RUN) {
        console.log("\n🚀 To apply changes, run: bun milindcode-toolkit/rebrand.ts")
    } else {
        console.log("\n🎯 Next steps:")
        console.log("   1. Test the changes: bun dev")
        console.log("   2. Publish packages: bun milindcode-toolkit/publish.ts")
    }
}

// Run the script
if (import.meta.main) {
    await main()
}