@echo off
REM
REM Nemotron Docker Setup Script for Windows
REM Builds and runs the Nemotron service with Docker Desktop
REM

setlocal enabledelayedexpansion

if "%1" == "" (
    echo.
    echo Usage: nemotron.bat [command]
    echo.
    echo Commands:
    echo   build         - Build the Docker image
    echo   up            - Start the service (docker-compose)
    echo   down          - Stop the service
    echo   logs          - View container logs
    echo   health        - Check service health
    echo   test          - Run a test generation
    echo   clean         - Remove image and containers
    echo   setup         - First-time setup (check Docker, build, start^)
    echo.
    goto end
)

if not exist "docker-compose.nemotron.yml" (
    echo Error: docker-compose.nemotron.yml not found in current directory
    goto end
)

if "%1" == "setup" (
    echo [*] Checking Docker installation...
    docker --version >nul 2>&1
    if errorlevel 1 (
        echo [!] Docker not found. Please install Docker Desktop for Windows
        echo     https://www.docker.com/products/docker-desktop
        goto end
    )
    
    echo [+] Docker found
    echo [*] Building image...
    call %0 build
    
    echo [*] Starting service...
    call %0 up
    
    echo [*] Waiting for service to be healthy...
    timeout /t 5 /nobreak
    
    call %0 health
    goto end
)

if "%1" == "build" (
    echo [*] Building Nemotron Docker image...
    docker build -f Dockerfile.nemotron -t mossy-nemotron:latest .
    if errorlevel 1 (
        echo [!] Build failed
        goto end
    )
    echo [+] Build complete
    goto end
)

if "%1" == "up" (
    echo [*] Starting Nemotron service...
    docker-compose -f docker-compose.nemotron.yml up -d
    if errorlevel 1 (
        echo [!] Failed to start service
        goto end
    )
    echo [+] Service started. Check health with: nemotron.bat health
    goto end
)

if "%1" == "down" (
    echo [*] Stopping Nemotron service...
    docker-compose -f docker-compose.nemotron.yml down
    echo [+] Service stopped
    goto end
)

if "%1" == "logs" (
    echo [*] Showing container logs (Ctrl+C to exit)...
    docker-compose -f docker-compose.nemotron.yml logs -f
    goto end
)

if "%1" == "health" (
    echo [*] Checking Nemotron service health...
    for /f "tokens=*" %%A in ('curl -s http://localhost:5000/health 2^>nul') do (
        echo Response: %%A
    )
    if errorlevel 1 (
        echo [!] Service is not responding. Make sure it's running with: nemotron.bat up
    )
    goto end
)

if "%1" == "test" (
    echo [*] Testing text generation...
    echo.
    curl -X POST http://localhost:5000/nemotron ^
      -H "Content-Type: application/json" ^
      -d "{\"prompt\": \"Explain quantum computing in simple terms.\", \"max_tokens\": 50}"
    echo.
    echo.
    echo [+] Test complete
    goto end
)

if "%1" == "clean" (
    echo [*] Cleaning up...
    docker-compose -f docker-compose.nemotron.yml down
    docker rmi mossy-nemotron:latest
    echo [+] Cleanup complete
    goto end
)

echo [!] Unknown command: %1
goto end

:end
endlocal
