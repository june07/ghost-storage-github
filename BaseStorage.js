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

        return path.join(`${baseDir || ''}`, year, month)
    }

    generateUnique(file, dir, name, ext, i) {
        let filename,
            append = ''

        if (i) {
            append = '-' + i
        }

        if (ext) {
            filename = name + append + ext
        } else {
            filename = name + append
        }

        return this.exists(file, dir).then((exists) => {
            // if the file exists but the sha is not the same then create a new filename otherwise don't
            if (exists && typeof exists === 'string') {
                throw new Error('File already exists')
            } else if (exists) {
                i = i + 1
                return this.generateUnique(file, dir, name, ext, i)
            } else {
                return path.join(dir, filename)
            }
        })
    }

    getUniqueFileName(file, targetDir) {
        let ext = path.extname(file.name)

        ext = ext === '' ? undefined : ext
        const name = this.getSanitizedFileName(path.basename(file.name, ext))
        return this.generateUnique(file, targetDir, name, ext, 0)
    }

    getSanitizedFileName(fileName) {
        // below only matches ascii characters, @, and .
        // unicode filenames like город.zip would therefore resolve to ----.zip
        return fileName.replace(/[^\w@.]/gi, '-')
    }
}

module.exports = StorageBase
