const fs = require('node:fs')
const path = require('node:path')
const rcedit = require('rcedit')

module.exports = async function afterPack(context) {
  if (process.platform !== 'win32' || context.electronPlatformName !== 'win32') {
    return
  }

  const appDir = context.appDir || context.packager?.projectDir || process.cwd()
  const iconPath = path.join(appDir, 'build', 'icons', 'icon.ico')
  if (!fs.existsSync(iconPath)) {
    console.warn('[afterPack] icon.ico not found, skipping exe icon patch')
    return
  }

  const entries = fs.readdirSync(context.appOutDir)
  const appExe = entries.find((name) => name.toLowerCase().endsWith('.exe') && !name.toLowerCase().startsWith('uninstall'))
  if (!appExe) {
    console.warn('[afterPack] app exe not found, skipping exe icon patch')
    return
  }

  const exePath = path.join(context.appOutDir, appExe)
  await rcedit(exePath, {
    icon: iconPath,
  })

  console.log(`[afterPack] applied icon to ${exePath}`)
}
