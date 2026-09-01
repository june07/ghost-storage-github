# Note: problems using ghost due to sharp dependency issues
FROM ghost:alpine AS june07

# 1. Install build tools
RUN apk add --no-cache g++ make python3

# 2. Build the adapter into a clean, isolated directory so all dependencies live locally inside it
WORKDIR /tmp/adapter
RUN echo '{"private":true}' > package.json && \
    SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --omit=dev @667/ghost-storage-github

FROM ghost:alpine

COPY --chown=node:node --from=june07 $GHOST_INSTALL/current/node_modules $GHOST_INSTALL/node_modules
COPY --chown=node:node --from=june07 $GHOST_INSTALL/current/node_modules/@667/ghost-storage-github $GHOST_INSTALL/current/content/adapters/storage/github