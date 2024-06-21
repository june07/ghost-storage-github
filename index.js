const https = require('https')
const { readFile } = require('fs').promises
const { createHash } = require('crypto')
const path = require('path')
const BaseAdapter = require('./BaseStorage')

const {
    GHOST_STORAGE_GITHUB_TOKEN,
    GHOST_STORAGE_GITHUB_OWNER,
    GHOST_STORAGE_GITHUB_REPO,
    GHOST_STORAGE_GITHUB_BRANCH,
    GHOST_STORAGE_GITHUB_DESTINATION,
    GHOST_STORAGE_GITHUB_ORIGIN
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
        } = config

        this.etags = {}
        // Required config
        this.owner = GHOST_STORAGE_GITHUB_OWNER || owner
        this.repo = GHOST_STORAGE_GITHUB_REPO || repo
        this.branch = GHOST_STORAGE_GITHUB_BRANCH || branch || 'main'
        this.origin = GHOST_STORAGE_GITHUB_ORIGIN || origin
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
            path: path.join(targetDir || this.getTargetDir(), filename)
        })
    }
    async exists(file, targetDir) {
        const sha = createHash('sha1').update(file.base64).digest('hex')

        try {
            const { headers } = await this.octokitGetContent({ method: 'HEAD', targetDir, filename: file.name })

            // if the etag is there then we can bypass the full request and just return true
            if (this.etags[sha] === headers.etag) {
                return sha
            }

            const response = await this.octokitGetContent({ targetDir, filename: file.name })
            const base64Response = Buffer.from(response.data.content, 'base64').toString('base64')
            const shaResponse = createHash('sha1').update(base64Response).digest('hex')
            this.etags[sha] = headers.etag

            if (shaResponse === sha) {
                return true
            }
            return false
        } catch (e) {
            if (e.status === 404) {
                return false
            }
            throw e
        }
    }
    async save(file, targetDir) {
        const base64 = await readFile(file.path, 'base64')
        const filepath = await this.getUniqueFileName({ ...file, base64 }, targetDir || this.getTargetDir())
        const filename = filepath.split('/').pop()

        try {
            const response = await this.octokit.repos.createOrUpdateFileContents({
                owner: this.owner,
                repo: this.repo,
                path: filepath,
                message: `https://june07.com ${filename}`,
                content: base64,
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