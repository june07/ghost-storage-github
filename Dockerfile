# Note: problems using ghost due to sharp dependency issues
FROM ghost:alpine AS june07

# 1. Install build tools
RUN apk add --no-cache g++ make python3

# 2. Build the adapter into a clean, isolated directory so all dependencies live locally inside it
WORKDIR /tmp/adapter
RUN echo '{"private":true}' > package.json && \
    SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --omit=dev @667/ghost-storage-github sharp

FROM ghost:alpine

# Clean target folder first and copy contents into content.orig (so volume mounts don't wipe it)
RUN rm -rf $GHOST_INSTALL/content.orig/adapters/storage/github && \
    mkdir -p $GHOST_INSTALL/content.orig/adapters/storage/github

# Copy adapter source files
COPY --chown=node:node --from=june07 /tmp/adapter/node_modules/@667/ghost-storage-github/ $GHOST_INSTALL/content.orig/adapters/storage/github/

# Copy dependencies directly into the adapter's node_modules folder
COPY --chown=node:node --from=june07 /tmp/adapter/node_modules/ $GHOST_INSTALL/content.orig/adapters/storage/github/node_modules/