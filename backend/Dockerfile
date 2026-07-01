# Build stage
FROM maven:3.8.5-openjdk-17-slim AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests

# Run stage
FROM openjdk:17-slim
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Deployed environments will inject the PORT variable dynamically
EXPOSE 8081

ENTRYPOINT ["java", "-jar", "-Dserver.port=${PORT:8081}", "app.jar"]
