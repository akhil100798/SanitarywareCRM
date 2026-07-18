FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY pom.xml ./
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-jammy AS runtime
RUN apt-get update \
    && apt-get install --no-install-recommends -y curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system crm \
    && useradd --system --gid crm --home-dir /app crm

WORKDIR /app
COPY --from=build --chown=crm:crm /workspace/target/*.jar app.jar

USER crm
ENV SPRING_PROFILES_ACTIVE=prod \
    SERVER_PORT=8081

EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl --fail --silent http://localhost:8081/api/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
