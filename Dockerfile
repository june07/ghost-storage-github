# Note: problems using ghost due to sharp dependency issues
FROM ghost:alpine AS june07

# 1. Install build tools
RUN apk add --no-cache g++ make python3

# 2. Build the adapter into a clean, isolated directory so all dependencies live locally inside it
WORKDIR /tmp/adapter
RUN echo '{"private":true}' > package.json && \
    SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install --omit=dev @667/ghost-storage-github

FROM ghost:alpine

# Copy the entire standalone adapter directory (with its isolated node_modules) straight to Ghost adapters
COPY --chown=node:node --from=june07 /tmp/adapter/node_modules/@667/ghost-storage-github $GHOST_INSTALL/content/adapters/storage/github