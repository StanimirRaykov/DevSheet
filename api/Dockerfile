# DevSheet API. Build from the api/ folder:  docker build -t devsheet-api api
# The same image runs the server (default) and the one-shot database step (`--migrate`).

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
# Restore first, from the project files only, so the NuGet layer is cached until a dependency changes.
COPY src/DevSheet.Domain/DevSheet.Domain.csproj src/DevSheet.Domain/
COPY src/DevSheet.Application/DevSheet.Application.csproj src/DevSheet.Application/
COPY src/DevSheet.Infrastructure/DevSheet.Infrastructure.csproj src/DevSheet.Infrastructure/
COPY src/DevSheet.Api/DevSheet.Api.csproj src/DevSheet.Api/
RUN dotnet restore src/DevSheet.Api/DevSheet.Api.csproj
COPY src/ src/
RUN dotnet publish src/DevSheet.Api/DevSheet.Api.csproj -c Release --no-restore -o /app /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
# curl is only for the container health check (GET /health).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app .
# Data Protection keys live here; mount a volume on it so logins survive restarts.
RUN mkdir /keys && chown app:app /keys
ENV ASPNETCORE_HTTP_PORTS=8080 \
    DataProtection__KeysPath=/keys
USER app
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
    CMD curl -fsS http://localhost:8080/health || exit 1
ENTRYPOINT ["dotnet", "DevSheet.Api.dll"]
