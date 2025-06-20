const path = require('path')

class StorageBase {
    constructor() {
        Object.defineProperty(this, 'requiredFns', {
            value: ['exists', 'save', 'serve', 'delete', 'read'],
            writable: false
        })
    }

    getTargetDir(baseDir) {
        const date = new Date()
        const month = `${date.getMonth() + 1}`.padStart(2, '0')
        const year = `${date.getFullYear()}`

        return path.posix.join(`${baseDir || ''}`, year, month)
    }

    async generateUnique(file, dir, i) {
        function getIndexedName(originalName, index) {
            const parsed = path.parse(originalName)
            // parsed.name = e.g. "a" or "a-1"
            // parsed.ext  = ".jpg"

            // Strip any trailing -<digits> from the basename
            const base = parsed.name.replace(/-\d+$/, '')

            // Only add a suffix when index > 0
            const suffix = index > 0 ? `-${index}` : ''

            return `${base}${suffix}${parsed.ext}`
        }

        file.originalName = file.name
        file.name = getIndexedName(file.name, i)

        const exists = await this.exists(file, dir)

        // if the file exists but the sha is not the same then create a new filename otherwise don't
        if (exists && typeof exists === 'object') {
            return exists
        } else if (exists) {
            i = i + 1
            return await this.generateUnique(file, dir, i)
        } else {
            return path.posix.join(dir, file.name)
        }
    }

    async getUniqueFileName(file, targetDir) {
        const sanitizedName = this.getSanitizedFileName(file.name, file.ext === '' ? undefined : file.ext)
        const uniqueName = await this.generateUnique({ ...file, name: sanitizedName }, targetDir, 0)

        return uniqueName
    }

    getSanitizedFileName(fileName, fileExt) {
        const basename = path.basename(fileName, fileExt)
        // below only matches ascii characters, @, and .
        // unicode filenames like город.zip would therefore resolve to ----.zip
        return `${basename.replace(/[^\w@.]/gi, '-')}${fileExt}`
    }
}

module.exports = StorageBase
