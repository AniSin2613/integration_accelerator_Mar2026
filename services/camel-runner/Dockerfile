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
      && /root/.jbang/bin/jbang trust add https://github.com/apache/ \
      && /root/.jbang/bin/jbang app install --fresh --name camel camel@apache/camel \
      && ln -sf /root/.jbang/bin/jbang /usr/local/bin/jbang \
      && ln -sf /root/.jbang/bin/camel /usr/local/bin/camel \
      && /usr/local/bin/camel --version \
      && echo '- route:' > /tmp/_warmup.yaml \
      && echo '    from:' >> /tmp/_warmup.yaml \
      && echo '      uri: "timer:warmup?repeatCount=1"' >> /tmp/_warmup.yaml \
      && echo '      steps:' >> /tmp/_warmup.yaml \
      && echo '        - log: "cache-warmup"' >> /tmp/_warmup.yaml \
      && timeout 60 /usr/local/bin/camel run /tmp/_warmup.yaml --max-messages=1 2>&1 || true \
      && rm -f /tmp/_warmup.yaml; \
    fi

# Ensure JBang and Camel are reachable from non-login shells.
ENV PATH="/root/.jbang/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

WORKDIR /app

# Minimal socat-based HTTP dispatcher
COPY runner.sh /app/runner.sh
RUN chmod +x /app/runner.sh

# Routes directory — populated at runtime via shared Docker volume
RUN mkdir -p /app/routes

EXPOSE 8080

CMD ["/app/runner.sh"]
