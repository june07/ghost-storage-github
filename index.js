const https = require('https')
const { readFile } = require('fs').promises
const { createHash } = require('crypto')
const path = require('path')
const BaseAdapter = require('./BaseStorage')
const sharp = require('sharp')

const {
    GHOST_STORAGE_GITHUB_TOKEN,
    GHOST_STORAGE_GITHUB_OWNER,
    GHOST_STORAGE_GITHUB_REPO,
    GHOST_STORAGE_GITHUB_BRANCH,
    GHOST_STORAGE_GITHUB_DESTINATION,
    GHOST_STORAGE_GITHUB_ORIGIN,
    GHOST_STORAGE_GITHUB_IMAGE_FORMAT,
    GHOST_STORAGE_GITHUB_ETAG_CACHE_SIZE
} = process.env

class GithubPagesStorage extends BaseAdapter {
    constructor(config) {
        super()

        const {
            token,
            owner,
            repo,
            branch,
            destination,
            origin,
            imageFormat,
            etagCacheSize
        } = config

        this.etags = {}
        // Required config
        this.owner = GHOST_STORAGE_GITHUB_OWNER || owner
        this.repo = GHOST_STORAGE_GITHUB_REPO || repo
        this.branch = GHOST_STORAGE_GITHUB_BRANCH || branch || 'main'
        this.origin = GHOST_STORAGE_GITHUB_ORIGIN || origin
        this.imageFormat = GHOST_STORAGE_GITHUB_IMAGE_FORMAT || imageFormat
        this.etagCacheSize = GHOST_STORAGE_GITHUB_ETAG_CACHE_SIZE || etagCacheSize || 10000
        this.committer = {
            name: 'June07',
            email: 'support@june07.com'
        }

        // Optional config
        this.destination = GHOST_STORAGE_GITHUB_DESTINATION || destination || '/'

            ; (async () => {
                const { retry } = await import('@octokit/plugin-retry')
                const { throttling } = await import('@octokit/plugin-throttling')
                const { Octokit } = await import('@octokit/rest')

                const ExtendedOctokit = Octokit.plugin(retry, throttling)

                const octokit = new ExtendedOctokit({
                    auth: GHOST_STORAGE_GITHUB_TOKEN || token,
                    throttle: {
                        onRateLimit: (retryAfter, options) => {
                            octokit.log.warn(
                                `Request quota exhausted for request ${options.method} ${options.url}`,
                            )

                            // Retry twice after hitting a rate limit error, then give up
                            if (options.request.retryCount <= 2) {
                                console.log(`Retrying after ${retryAfter} seconds!`)
                                return true
                            }
                        },
                        onSecondaryRateLimit: (_retryAfter, options, octokit) => {
                            // does not retry, only logs a warning
                            octokit.log.warn(
                                `Secondary quota detected for request ${options.method} ${options.url}`,
                            )
                        },
                    }
                })
                this.octokit = octokit
            })()
    }
    octokitGetContent({ method, targetDir, filename }) {
        return this.octokit.repos.getContent({
            method,
            owner: this.owner,
            repo: this.repo,
            ref: this.branch,
            path: path.posix.join(targetDir || this.getTargetDir(), filename)
        })
    }
    async convertImage(file) {
        const buffer = await readFile(file.path)

        if (!this.imageFormat) {
            return { buffer: buffer.toString('base64') }
        }
        const { fileTypeFromBuffer } = await import('file-type')
        const filetype = await fileTypeFromBuffer(buffer)

        if (!filetype?.mime || !/image/.test(filetype.mime)) {
            // return non image files as-is
            return { buffer: buffer.toString('base64') }
        }
        if (/image/.test(filetype.mime) && filetype.mime.match(/image\/(.*)/)[1] !== this.imageFormat) {
            const originalExt = file.ext
            const newExt = `.${this.imageFormat}`

            try {
                const newBuffer = await sharp(buffer, { animated: true, limitInputPixels: false }).toFormat(this.imageFormat).toBuffer()

                return {
                    buffer: newBuffer.toString('base64'),
                    mimetype: `image/${this.imageFormat}`,
                    encoding: 'base64',
                    size: newBuffer.length,
                    originalExt,
                    ext: newExt,
                    name: file.name.replace(new RegExp(`${originalExt}$`), newExt)
                }
            } catch (err) {
                console.error('Failed to convert image', err)
                return { buffer: buffer.toString('base64') }
            }
        }

        return { buffer: buffer.toString('base64') }
    }
    checkSizeAndEvict() {
        const keys = Object.keys(this.etags)

        if (keys.length > this.etagCacheSize) {
            // Sort keys by timestamp
            keys.sort((a, b) => this.etags[a].timestamp - this.etags[b].timestamp)

            // Remove the oldest entries until the size is within the limit
            while (keys.length > this.etagCacheSize) {
                const oldestKey = keys.shift()
                delete this.etags[oldestKey]
            }
        }
    }
    async exists(file, targetDir) {
        const sha = createHash('sha1').update(file.buffer).digest('hex')

        try {
            const { headers } = await this.octokitGetContent({ method: 'HEAD', targetDir, filename: file.name })

            // if the etag is there then we can bypass the full request and just return true
            if (this.etags[sha] === headers.etag) {
                return sha
            }

            const response = await this.octokitGetContent({ targetDir, filename: file.name })
            const base64Response = Buffer.from(response.data.content, 'base64').toString('base64')
            const shaResponse = createHash('sha1').update(base64Response).digest('hex')
            this.etags[sha] = {
                timestamp: Date.now(),
                etag: headers.etag
            }
            this.checkSizeAndEvict()

            if (shaResponse === sha) {
                return {
                    sha,
                    path: response.data.path,
                    downloadUrl: response.data.download_url }
            }
            return true
        } catch (e) {
            if (e.status === 404) {
                return false
            }
            throw e
        }
    }
    async save(file, targetDir) {
        const converted = await this.convertImage(file)
        const filepath = await this.getUniqueFileName({ ...file, ...converted }, targetDir || this.getTargetDir())

        if (typeof filepath !== 'string') {
            const { path, downloadUrl } = filepath
            
            return this.origin ? `${this.origin}/${path}` : downloadUrl
        }
        const filename = filepath.split('/').pop()

        try {
            const response = await this.octokit.repos.createOrUpdateFileContents({
                owner: this.owner,
                repo: this.repo,
                path: filepath,
                message: `https://june07.com ${filename}`,
                content: converted.buffer,
                branch: this.branch,
                committer: this.committer,
            })

            const { download_url: downloadUrl, path } = response.data.content

            return this.origin ? `${this.origin}/${path}` : downloadUrl
        } catch (e) {
            throw e
        }
    }
    serve() {
        return (req, res, next) => next
    }
    delete() {
        // https://forum.ghost.org/t/when-is-the-delete-method-in-storage-adapters-called/7495
        return Promise.reject('Not implemented')
    }
    async read(options) {
        return new Promise((resolve, reject) => {
            const req = https.get(options.path, res => {
                const data = []
                res.on('data', chunk => {
                    data.push(chunk)
                })
                res.on('end', () => {
                    resolve(Buffer.concat(data))
                })
            })
            req.on('error', reject)
        })
    }
}

module.exports = GithubPagesStorage