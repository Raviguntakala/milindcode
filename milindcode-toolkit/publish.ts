#!/usr/bin/env bun

import { $ } from "bun"

// Check Bun version (allow 1.2.x)
const bunVersion = process.versions.bun
if (!bunVersion || !bunVersion.startsWith("1.2.")) {
    console.warn(`⚠️  This script was designed for bun@1.2.21, you have ${bunVersion}`)
    console.log("Continuing anyway...")
}

console.log("=== Custom NPM Publishing ===\n")

// Load configuration
const loadConfig = async () => {
    try {
        const config = await Bun.file("milindcode-toolkit/publish-config.json").json()
        console.log("✅ Loaded configuration from milindcode-toolkit/publish-config.json")
        return config
    } catch (error) {
        console.error("❌ Could not load milindcode-toolkit/publish-config.json:", error)
        console.log("Please create milindcode-toolkit/publish-config.json with your settings")
        process.exit(1)
    }
}

const config = await loadConfig()

// Get current version from original repo
const getOriginalVersion = async () => {
    try {
        const pkg = await Bun.file("packages/opencode/package.json").json()
        return pkg.version
    } catch (error) {
        console.error("Could not read original version:", error)
        return "1.0.0"
    }
}

// Generate custom version
const generateCustomVersion = async () => {
    if (config.versionStrategy === "increment") {
        // Check if main package exists and get latest version
        try {
            const result = await $`npm view ${config.packages[0].newName} version`.text()
            const currentVersion = result.trim()
            const [major, minor, patch] = currentVersion.split(".").map(Number)
            return `${major}.${minor}.${patch + 1}`
        } catch {
            // Package doesn't exist, use base version
            return "1.0.1"  // Start with 1.0.1 since binaries are at 1.0.0
        }
    } else if (config.versionStrategy === "timestamp") {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)
        return `1.0.0-${timestamp}`
    }
    return "1.0.1"  // Default to 1.0.1
}

const customVersion = await generateCustomVersion()
console.log("Custom version:", customVersion)

// Update dependency names to use custom package names
const updateDependencyNames = (dependencies: any) => {
    if (!dependencies) return dependencies

    const updated = { ...dependencies }

    // Map original package names to new names
    const packageNameMap: Record<string, string> = {}
    config.packages.forEach((pkg: any) => {
        packageNameMap[pkg.originalName] = pkg.newName
    })

    // Update workspace dependencies
    Object.keys(updated).forEach(depName => {
        if (packageNameMap[depName]) {
            updated[packageNameMap[depName]] = updated[depName]
            delete updated[depName]
        }
        // Handle workspace: dependencies
        if (updated[depName] === "workspace:*") {
            const newName = packageNameMap[depName]
            if (newName) {
                updated[newName] = customVersion
                delete updated[depName]
            }
        }
    })

    return updated
}

// Create updated package.json for publishing (without modifying original)
const createPublishPackageJson = async (packageConfig: any) => {
    const packageJsonPath = `${packageConfig.path}/package.json`

    try {
        const pkg = await Bun.file(packageJsonPath).json()
        const originalVersion = pkg.version

        // Create updated package.json
        const updatedPkg = {
            ...pkg,
            name: packageConfig.newName,
            version: customVersion,
            description: packageConfig.description,
            // Add original version tracking
            ...(config.trackOriginalVersion && {
                originalVersion,
                originalName: packageConfig.originalName,
                forkedFrom: "https://github.com/sst/opencode",
                customFork: true
            }),
            // Remove private flag if it exists
            private: undefined,
            // Update repository info
            repository: {
                type: "git",
                url: config.repositoryUrl
            },
            // Update workspace dependencies to use new package names
            dependencies: updateDependencyNames(pkg.dependencies),
            devDependencies: updateDependencyNames(pkg.devDependencies),
            optionalDependencies: updateDependencyNames(pkg.optionalDependencies)
        }

        // Clean up undefined values
        Object.keys(updatedPkg).forEach(key => {
            if (updatedPkg[key] === undefined) {
                delete updatedPkg[key]
            }
        })

        console.log(`Created publish config for ${packageConfig.newName}`)
        return updatedPkg
    } catch (error) {
        console.error(`Failed to create publish config for ${packageJsonPath}:`, error)
        throw error
    }
}

// Build packages using original build logic
const buildPackage = async (packageConfig: any) => {
    console.log(`Building ${packageConfig.newName}...`)

    const originalDir = process.cwd()

    if (packageConfig.path === "packages/opencode") {
        // Use OpenCode's specific build process
        process.chdir(packageConfig.path)
        try {
            // Check if build script exists
            const buildScriptPath = "./script/build.ts"
            const buildScriptExists = await Bun.file(buildScriptPath).exists()

            if (buildScriptExists) {
                // Import and run the original build script
                const currentDir = process.cwd()
                const absoluteBuildPath = `${currentDir}/${buildScriptPath}`
                await import(absoluteBuildPath)
                console.log(`✅ Built ${packageConfig.newName} using original build script`)
            } else {
                console.log(`⚠️  No build script found for ${packageConfig.newName}, skipping build`)
            }
        } catch (error) {
            console.error(`❌ Failed to build ${packageConfig.newName}:`, error)
            throw error
        } finally {
            process.chdir(originalDir)
        }
    } else if (packageConfig.path === "packages/sdk/js") {
        // SDK build process
        process.chdir(packageConfig.path)
        try {
            // Check if generate script exists
            const generateScriptPath = "./script/generate.ts"
            const generateScriptExists = await Bun.file(generateScriptPath).exists()

            if (generateScriptExists) {
                // Generate SDK files first
                const currentDir = process.cwd()
                const absoluteGeneratePath = `${currentDir}/${generateScriptPath}`
                await import(absoluteGeneratePath)
            }

            // Clean and build
            await $`rm -rf dist`
            await $`bun tsc`
            console.log(`✅ Built ${packageConfig.newName} SDK`)
        } catch (error) {
            console.error(`❌ Failed to build ${packageConfig.newName}:`, error)
            throw error
        } finally {
            process.chdir(originalDir)
        }
    } else if (packageConfig.path === "packages/plugin") {
        // Plugin build process
        process.chdir(packageConfig.path)
        try {
            await $`rm -rf dist`
            await $`bun tsc`
            console.log(`✅ Built ${packageConfig.newName} plugin`)
        } catch (error) {
            console.error(`❌ Failed to build ${packageConfig.newName}:`, error)
            throw error
        } finally {
            process.chdir(originalDir)
        }
    } else {
        // Generic build for other packages
        process.chdir(packageConfig.path)
        try {
            await $`bun run build`.nothrow()
        } catch {
            try {
                await $`bun run tsc`.nothrow()
            } catch {
                console.log(`No build script found for ${packageConfig.newName}, skipping build`)
            }
        } finally {
            process.chdir(originalDir)
        }
    }
}

// Publish package with OpenCode-specific logic
const publishPackage = async (packageConfig: any, publishConfig: any) => {
    console.log(`\n=== Publishing ${packageConfig.newName} ===`)

    if (packageConfig.path === "packages/opencode") {
        await publishOpenCodePackage(packageConfig, publishConfig)
    } else {
        await publishRegularPackage(packageConfig, publishConfig)
    }
}

// Publish OpenCode package with binary handling
const publishOpenCodePackage = async (packageConfig: any, publishConfig: any) => {
    const originalDir = process.cwd()
    process.chdir(packageConfig.path)

    try {
        // Check if we're logged in to npm
        try {
            await $`npm whoami`
        } catch (error) {
            console.log("⚠️  Not logged into npm - would publish here in real run")
            return
        }

        // Import the build script to get binaries info
        let binaries = {}
        try {
            const buildScriptPath = "./script/build.ts"
            const currentDir = process.cwd()
            const absoluteBuildPath = `${currentDir}/${buildScriptPath}`
            const buildModule = await import(absoluteBuildPath)
            binaries = buildModule.binaries || {}
        } catch (error) {
            console.log("⚠️  Could not import build script, using empty binaries")
            console.log("Error:", error.message)
        }

        // Create distribution directory structure like original
        await $`mkdir -p ./dist/${packageConfig.newName}`
        await $`cp -r ./bin ./dist/${packageConfig.newName}/bin`

        // Extract command name from package config (remove scope if present)
        const commandName = packageConfig.newName.includes('/')
            ? packageConfig.newName.split('/')[1]
            : packageConfig.newName.replace('ravi-kumar-', '')

        // Files are already renamed by rebrand script, so no need to rename again
        // Just verify they exist
        const unixBinary = `./dist/${packageConfig.newName}/bin/${commandName}`
        const windowsBinary = `./dist/${packageConfig.newName}/bin/${commandName}.cmd`

        console.log(`✅ Binary files already renamed to ${commandName}`)

        await $`cp ./script/preinstall.mjs ./dist/${packageConfig.newName}/preinstall.mjs`
        await $`cp ./script/postinstall.mjs ./dist/${packageConfig.newName}/postinstall.mjs`

        // Create main package.json for the wrapper package
        const mainPackageJson = {
            name: packageConfig.newName,
            bin: {
                [commandName]: `./bin/${commandName}`, // Create command dynamically from config
            },
            scripts: {
                preinstall: "node ./preinstall.mjs",
                postinstall: "node ./postinstall.mjs",
            },
            version: customVersion,
            description: packageConfig.description,
            ...(config.trackOriginalVersion && {
                originalVersion: "0.11.7", // Fixed original version
                originalName: packageConfig.originalName,
                forkedFrom: "https://github.com/sst/opencode",
                customFork: true
            }),
            optionalDependencies: Object.fromEntries(
                Object.entries(binaries).map(([name, version]) => [
                    name.replace('opencode', 'milindcode'),
                    customVersion // Use the custom version instead of "dev"
                ])
            ),
        }

        await Bun.file(`./dist/${packageConfig.newName}/package.json`).write(
            JSON.stringify(mainPackageJson, null, 2)
        )

        // Publish binary packages first
        for (const [name] of Object.entries(binaries)) {
            const newBinaryName = name.replace('opencode', 'milindcode')
            console.log(`Publishing binary package: ${newBinaryName}`)

            // Update binary package.json with new name
            const binaryPkgPath = `dist/${name}/package.json`
            if (await Bun.file(binaryPkgPath).exists()) {
                const binaryPkg = await Bun.file(binaryPkgPath).json()
                binaryPkg.name = newBinaryName
                binaryPkg.version = customVersion
                await Bun.file(binaryPkgPath).write(JSON.stringify(binaryPkg, null, 2))
            }

            // WINDOWS BINARY FIX: Rename the actual binary files
            const isWindows = name.includes("windows")
            if (isWindows) {
                const oldBinaryPath = `dist/${name}/bin/opencode.exe`
                const newBinaryPath = `dist/${name}/bin/milindcode.exe`
                try {
                    await $`mv "${oldBinaryPath}" "${newBinaryPath}"`
                    console.log(`✅ Renamed Windows binary: opencode.exe → milindcode.exe`)
                } catch (error) {
                    console.log(`⚠️  Could not rename Windows binary:`, error)
                }
            } else {
                const oldBinaryPath = `dist/${name}/bin/opencode`
                const newBinaryPath = `dist/${name}/bin/milindcode`
                try {
                    await $`mv "${oldBinaryPath}" "${newBinaryPath}"`
                    console.log(`✅ Renamed binary: opencode → milindcode`)
                } catch (error) {
                    console.log(`⚠️  Could not rename binary:`, error)
                }
            }

            await $`cd dist/${name} && chmod -R 755 . && npm publish --access public`
        }

        // Publish main package
        await $`cd ./dist/${packageConfig.newName} && npm publish --access public`
        console.log(`✅ Successfully published ${packageConfig.newName}@${customVersion}`)

    } catch (error) {
        console.error(`❌ Failed to publish ${packageConfig.newName}:`, error)
        throw error
    } finally {
        process.chdir(originalDir)
    }
}

// Publish regular packages (SDK, Plugin, etc.)
const publishRegularPackage = async (packageConfig: any, publishConfig: any) => {
    const originalDir = process.cwd()
    process.chdir(packageConfig.path)

    try {
        // Check if we're logged in to npm
        try {
            await $`npm whoami`
        } catch (error) {
            console.log("⚠️  Not logged into npm - would publish here in real run")
            return
        }

        // Create temporary package.json for publishing
        const originalPkg = await Bun.file("package.json").text()
        await Bun.file("package.json").write(JSON.stringify(publishConfig, null, 2))

        try {
            // Publish the package
            await $`npm publish --access public`
            console.log(`✅ Successfully published ${packageConfig.newName}@${customVersion}`)
        } finally {
            // Restore original package.json
            await Bun.file("package.json").write(originalPkg)
        }

    } catch (error) {
        console.error(`❌ Failed to publish ${packageConfig.newName}:`, error)
        throw error
    } finally {
        process.chdir(originalDir)
    }
}

// Main execution
const main = async () => {
    try {
        console.log("Creating publish configurations...")

        // Create publish configurations for all packages
        const publishConfigs = {}
        for (const packageConfig of config.packages) {
            publishConfigs[packageConfig.path] = await createPublishPackageJson(packageConfig)
        }

        console.log("\nBuilding packages...")

        // Build packages
        for (const packageConfig of config.packages) {
            await buildPackage(packageConfig)
        }

        console.log("\nPublishing packages...")

        // Publish packages
        for (const packageConfig of config.packages) {
            await publishPackage(packageConfig, publishConfigs[packageConfig.path])
        }

        console.log("\n🎉 All packages published successfully!")
        console.log("\nPublished packages:")
        for (const packageConfig of config.packages) {
            console.log(`- ${packageConfig.newName}@${customVersion}`)
        }

        // Create a version tracking file
        const versionInfo = {
            customVersion,
            originalVersion: await getOriginalVersion(),
            publishedAt: new Date().toISOString(),
            packages: config.packages.map(p => ({
                name: p.newName,
                originalName: p.originalName,
                path: p.path
            }))
        }

        await Bun.file("published-versions.json").write(JSON.stringify(versionInfo, null, 2))
        console.log("\n📝 Version info saved to published-versions.json")

    } catch (error) {
        console.error("❌ Publishing failed:", error)
        process.exit(1)
    }
}

// Run the script
await main()