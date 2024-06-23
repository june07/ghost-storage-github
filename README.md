# Ghost Storage GitHub

This project is a custom storage adapter for [Ghost](https://ghost.org/) that allows you to use GitHub (a completely free solution) as a storage backend.

## Inspiration

This project was inspired by [ifvictr/ghost-storage-github](https://github.com/ifvictr/ghost-storage-github). However, due to that project appearing to be abandoned ([last update](https://github.com/ifvictr/ghost-storage-github/commit/fffdedf5b03191b95c01877d1dfad38bdc8616f8) by the author 3 years ago) and no other solutions existing for using GitHub as a storage backend, this project was completely rewritten.

## Features

- **GitHub as Storage Backend**: Seamlessly integrate Ghost with GitHub to store your content.
- **Image Transcoding**: Supports automatic image transcoding, optimizing images for different use cases, particularly quicker images being served for your blog (images are transcoded to webp by default)

## Configuration

Example Docker Swarm/Compose partial config:
```
    environment:
      storage__active: github
      storage__github__token: <your GitHub Personal Access Token here>
      storage__github__owner: <your GitHub user here>
      storage__github__repo: <your GitHub repo here>
      GHOST_STORAGE_GITHUB_TOKEN: <your GitHub Personal Access Token here>
      GHOST_STORAGE_GITHUB_OWNER: <your GitHub user here>
      GHOST_STORAGE_GITHUB_REPO: <your GitHub repo here>
    volumes:
      - type: bind
        source: content
        target: /var/lib/ghost/content
    command: ["/var/lib/ghost/content/copy-storage-adapter.sh", "docker-entrypoint.sh", "node", "current/index.js"]
```
Note that either the GHOST_STORAGE_GITHUB_ or storage__github__ way of configuring this storage plugin works, while the former overrides the latter.

As well, the plugin code is found in the docker image's content directory so if you also mount that image (thus making the contents unavailable otherwise) the copy-storage-adapter.sh script does exactly that.

Here's a comprehensive list of configurations:

| **Name**          | **Required?** | **Description**                                                                                                                                                                        | **Environment variable (prefixed with `GHOST_STORAGE_GITHUB_`)** |
|-------------------|---------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------|
|`token`| yes|GitHub Personal access token https://github.com/settings/tokens|`GHOST_STORAGE_GITHUB_TOKEN `|
| `owner`           | yes           | Username of the user/organization the repo is under                                                                                                                                    | `GHOST_STORAGE_GITHUB_OWNER`                                                  |
| `repo`            | yes           | Name of the repo                                                                                                                                                                       | `GHOST_STORAGE_GITHUB_REPO`                                                   |
| `branch`          | no            | Branch to push assets to. Defaults to `main`                                                                                                                                         | `GHOST_STORAGE_GITHUB_BRANCH`                                                 |
| `destination`     | no            | Directory to push assets to. Defaults to `/`                                                                                                                                           | `GHOST_STORAGE_GITHUB_DESTINATION`                                            |
| `origin`         | no            | URL Origin of newly saved images. Uses raw.githubusercontent.com by default                                                                                                              | `GHOST_STORAGE_GITHUB_ORIGIN`                                               |
| `useRelativeUrls` | no            | Whether or not to return relative URLs (i.e. under `/content/images`) instead of absolute URLs. Might be of use to people who generate and serve a static version of their Ghost blog. | `USE_RELATIVE_URLS`            |
|`imageFormat`|no|image format to transcode images to. Uses the sharp npm package under the hood https://www.npmjs.com/package/sharp so the same formats are available (i.e. jpeg, png, webp, gif, jp2, tiff, avif, heif, jxl, raw)|`GHOST_STORAGE_GITHUB_IMAGE_FORMAT  `|
|`etagCacheSize`|no|GitHub Personal access token https://github.com/settings/tokens|`GHOST_STORAGE_GITHUB_ETAG_CACHE_SIZE  `|


## Usage

Once configured, Ghost will use your specified GitHub repository to store images. 

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
