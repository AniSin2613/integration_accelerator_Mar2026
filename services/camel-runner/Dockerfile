# Cogniviti Bridge — Camel Runner
# Uses Eclipse Temurin JDK 17 as base; installs Camel JBang for route execution.
# The runner exposes a minimal HTTP API that accepts a route file path and
# executes it via `camel run`. Routes are written by the Node API into a
# shared volume (/app/routes) before triggering execution.
#
# Camel version pinned to 4.8.5 LTS per blueprint §16.2.

FROM eclipse-temurin:17-jdk-alpine

# Install JBang + socat (Alpine-compatible TCP listener)
RUN apk add --no-cache curl bash socat jq \
  && curl -Ls https://sh.jbang.dev | bash -s - app setup \
  && /root/.jbang/bin/jbang app install camel@apache/camel:4.8.5

# Add JBang to PATH
ENV PATH="/root/.jbang/bin:${PATH}"

# Pre-warm: pull Camel JBang dependencies at build time to avoid cold start
RUN camel --version || true

WORKDIR /app

# Minimal socat-based HTTP dispatcher
COPY runner.sh /app/runner.sh
RUN chmod +x /app/runner.sh

# Routes directory — populated at runtime via shared Docker volume
RUN mkdir -p /app/routes

EXPOSE 8080

CMD ["/app/runner.sh"]
