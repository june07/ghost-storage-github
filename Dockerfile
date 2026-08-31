# Note: problems using ghost due to sharp dependency issues
FROM ghost:alpine AS june07

WORKDIR $GHOST_INSTALL/current

# 1. Use correct apk syntax
# 2. Run directly (Ghost images run as root during build anyway)
# 3. Use yarn/npm cleanly
RUN apk add --no-cache g++ make python3 && \
    pnpm config set store-dir /var/lib/ghost/.pnpm-store/v11 && \
    SHARP_IGNORE_GLOBAL_LIBVIPS=1 pnpm add @667/ghost-storage-github

FROM ghost:alpine

COPY --chown=node:node --from=june07 $GHOST_INSTALL/current/node_modules $GHOST_INSTALL/node_modules
COPY --chown=node:node --from=june07 $GHOST_INSTALL/current/node_modules/@667/ghost-storage-github $GHOST_INSTALL/content.orig/adapters/storage/github