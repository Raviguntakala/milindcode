# MilindCode Toolkit

Complete toolkit for rebranding OpenCode to MilindCode and publishing to npm.

## Prerequisites

1. **Bun installed** (v1.2.x recommended)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **npm account with organization access**
   ```bash
   npm login
   npm org ls @buildwise-ai  # Verify access
   ```

3. **Fresh OpenCode repository**
   ```bash
   git clone https://github.com/sst/opencode.git
   cd opencode
   bun install
   ```

## Step-by-Step Process

### 1. Rebrand OpenCode to MilindCode

```bash
# Run rebranding script
bun milindcode-toolkit/rebrand.ts
```

This changes all user-facing references:
- CLI command: `opencode` → `milindcode`
- Config directories: `~/.opencode/` → `~/.milindcode/`
- ASCII logos: Shows "MILINDCODE" branding
- Help text: All descriptions updated

### 2. Test the Rebranded Version

```bash
# Build the project
bun dev

# Test in another terminal
./dist/opencode/bin/milindcode --help
```

**Expected output:**
```
█▀▄▀█ ▀█▀ █░░ ▀█▀ █▀▀▄ █▀▀▄ █▀▀ █▀▀█ █▀▀▄ █▀▀
█░▀░█ ░█░ █░░ ░█░ █░░█ █░░█ █░░ █░░█ █░░█ █▀▀
▀░░░▀ ▀▀▀ ▀▀▀ ▀▀▀ ▀░░▀ ▀▀▀░ ▀▀▀ ▀▀▀▀ ▀▀▀░ ▀▀▀

Commands:
  milindcode [project]           start milindcode tui
  milindcode attach <server>     attach to a running milindcode server
  ...
```

### 3. Configure Publishing (Optional)

Edit `milindcode-toolkit/publish-config.json` if needed:

```json
{
  "packagePrefix": "@your-org",
  "repositoryUrl": "https://github.com/your-org/your-repo",
  "packages": [
    {
      "newName": "@your-org/your-package-name",
      "description": "Your custom description"
    }
  ]
}
```

### 4. Publish to npm

```bash
# Publish all packages
bun milindcode-toolkit/publish.ts
```

This will:
- Build all packages with binaries
- Publish platform-specific binary packages
- Publish main packages with proper dependencies
- Auto-increment version numbers

### 5. Test Installation

```bash
# Install your published package
npm install -g @buildwise-ai/milindcode

# Test the command
milindcode --help
```

## What Gets Changed

### ✅ User-Facing Changes (Rebranded)
- **Command name**: `milindcode` instead of `opencode`
- **ASCII logos**: Custom "MILINDCODE" branding
- **Config directories**: `~/.milindcode/` instead of `~/.opencode/`
- **Config files**: `milindcode.json` instead of `opencode.json`
- **Help text**: All command descriptions updated
- **TUI branding**: Status bar shows "milind"

### ⚠️ Internal Code (Unchanged)
- **Package directories**: `packages/opencode/` (for compatibility)
- **Import statements**: All internal references preserved
- **Build system**: Original build process maintained

## Troubleshooting

### Rebranding Issues

**Problem**: Some files not found during rebranding
```bash
❌ packages/opencode/src/cli/ui.ts (file not found)
```

**Solution**: Ensure you're in the OpenCode root directory and all files exist.

### Publishing Issues

**Problem**: Version already exists
```bash
npm error You cannot publish over the previously published versions: 1.0.1
```

**Solution**: The script auto-increments versions. If this fails, manually update the version strategy in config.

**Problem**: Not authenticated
```bash
npm error 401 Unauthorized
```

**Solution**: 
```bash
npm login
npm whoami  # Verify authentication
```

### Installation Issues

**Problem**: Package not found after publishing
```bash
npm error 404 Not Found - GET https://registry.npmjs.org/@buildwise-ai%2fmilindcode
```

**Solution**: Wait 5-10 minutes for npm registry propagation, then try again.

## File Structure

```
milindcode-toolkit/
├── README.md              # This file
├── rebrand.ts            # Rebranding script
├── publish.ts            # Publishing script
└── publish-config.json   # Publishing configuration
```

## Advanced Usage

### Dry Run Rebranding

Test rebranding without making changes:
```bash
DRY_RUN=true bun milindcode-toolkit/rebrand.ts
```

### Custom Branding

To rebrand to a different name, edit the `rebrand.ts` file and replace all instances of "milindcode" with your desired name.

### Version Strategies

In `publish-config.json`:
- `"increment"`: Auto-increment patch version (1.0.0 → 1.0.1)
- `"timestamp"`: Use timestamp versions (1.0.0-2024-01-15T10-30-00)

## Support

If you encounter issues:
1. Check that you're in the OpenCode root directory
2. Ensure Bun and npm are properly installed
3. Verify npm authentication and organization access
4. Wait for npm registry propagation after publishing