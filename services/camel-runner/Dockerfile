# Cogniviti Bridge — Camel Runner
# Lightweight runner for connection testing and route execution.
# For connection tests, only bash + curl + socat + jq are needed.
# JBang + Camel are installed when a JDK is present for route execution.
#
# Camel version pinned to 4.8.5 LTS per blueprint §16.2.

FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache curl bash socat jq

# Optionally install JDK + JBang for camel run (route execution)
RUN apk add --no-cache openjdk17-jdk 2>/dev/null || true
RUN if command -v java >/dev/null 2>&1; then \
      curl -Ls https://sh.jbang.dev | bash -s - app setup \
      && /root/.jbang/bin/jbang app install camel@apache/camel:4.8.5 \
      && camel --version || true; \
    fi

# Add JBang to PATH (no-op if not installed)
ENV PATH="/root/.jbang/bin:${PATH}"

WORKDIR /app

# Minimal socat-based HTTP dispatcher
COPY runner.sh /app/runner.sh
RUN chmod +x /app/runner.sh

# Routes directory — populated at runtime via shared Docker volume
RUN mkdir -p /app/routes

EXPOSE 8080

CMD ["/app/runner.sh"]
