@echo off
setlocal

echo =====================================
echo Building MMS...
echo =====================================

:: Verify .env.production exists for frontend before building.
:: Without it Vite bakes http://localhost:3001 into the bundle.
if not exist mms-frontend\.env.production (
    echo ERROR: mms-frontend\.env.production is missing.
    echo        The production bundle will point to localhost and login will fail.
    echo        Create mms-frontend\.env.production with: VITE_API_BASE_URL=/api
    exit /b 1
)

call npm --prefix mms-frontend run build
if errorlevel 1 exit /b 1

call npm --prefix mms-backend run build
if errorlevel 1 exit /b 1

pushd reporting-service
call mvn clean package -DskipTests
if errorlevel 1 (
    popd
    exit /b 1
)
popd

echo =====================================
echo Deploying...
echo =====================================

:: Ensure root folders exist
mkdir C:\mms 2>nul
mkdir C:\mms\logs 2>nul
mkdir C:\mms\uploads 2>nul
mkdir C:\mms\scripts 2>nul

:: ----------------------------
:: Nginx config (nginx.exe lives at C:\nginx)
:: ----------------------------

copy scripts\nginx.conf C:\nginx\conf\nginx.conf /Y

:: ----------------------------
:: Frontend
:: ----------------------------

if exist C:\mms\frontend rd /s /q C:\mms\frontend
mkdir C:\mms\frontend

xcopy mms-frontend\dist\* C:\mms\frontend\ /E /I /Y

:: ----------------------------
:: Backend
:: ----------------------------

if exist C:\mms\backend rd /s /q C:\mms\backend
mkdir C:\mms\backend

xcopy mms-backend\dist\* C:\mms\backend\ /E /I /Y

copy mms-backend\package.json C:\mms\backend\
copy mms-backend\package-lock.json C:\mms\backend\

:: Rename .env.production -> .env so dotenv picks it up at runtime
if exist mms-backend\.env.production (
    copy mms-backend\.env.production C:\mms\backend\.env /Y
) else (
    echo WARNING: mms-backend\.env.production not found.
    echo          The backend will start with default development values.
)

pushd C:\mms\backend

call npm install --omit=dev

if errorlevel 1 (
    popd
    exit /b 1
)

popd

:: ----------------------------
:: Reporting
:: ----------------------------

if exist C:\mms\reporting rd /s /q C:\mms\reporting
mkdir C:\mms\reporting
mkdir C:\mms\reporting\reports 2>nul

copy reporting-service\target\*.jar C:\mms\reporting\

:: Copy JRXML report templates - required at runtime by the reporting service
xcopy reporting-service\reports\* C:\mms\reporting\reports\ /E /I /Y

:: ----------------------------
:: Register Windows Services via NSSM
:: Services auto-start on boot and auto-restart on crash
:: ----------------------------

where nssm >nul 2>&1
if errorlevel 1 (
    echo WARNING: nssm.exe not found in PATH. Services will not be registered.
    echo          Download NSSM from https://nssm.cc and place it in C:\Windows\System32
    goto :skip_services
)

:: Stop and remove existing services before re-registering
nssm stop   MMS-Backend   2>nul
nssm stop   MMS-Reporting 2>nul
nssm stop   MMS-Nginx     2>nul

nssm remove MMS-Backend   confirm 2>nul
nssm remove MMS-Reporting confirm 2>nul
nssm remove MMS-Nginx     confirm 2>nul

:: Backend (Node.js / Express)
nssm install MMS-Backend node.exe
nssm set     MMS-Backend AppParameters       "C:\mms\backend\index.js"
nssm set     MMS-Backend AppDirectory        "C:\mms\backend"
nssm set     MMS-Backend AppEnvironmentExtra "NODE_ENV=production"
nssm set     MMS-Backend AppStdout           "C:\mms\logs\backend-stdout.log"
nssm set     MMS-Backend AppStderr           "C:\mms\logs\backend-stderr.log"
nssm set     MMS-Backend AppRotateFiles      1
nssm set     MMS-Backend Start               SERVICE_AUTO_START

:: Reporting service (Java / Javalin)
nssm install MMS-Reporting java.exe
nssm set     MMS-Reporting AppParameters       "-jar C:\mms\reporting\reporting-service-1.0.0.jar"
nssm set     MMS-Reporting AppDirectory        "C:\mms\reporting"
nssm set     MMS-Reporting AppEnvironmentExtra "REPORTS_BASE_DIR=C:\mms\reporting"
nssm set     MMS-Reporting AppStdout           "C:\mms\logs\reporting-stdout.log"
nssm set     MMS-Reporting AppStderr           "C:\mms\logs\reporting-stderr.log"
nssm set     MMS-Reporting AppRotateFiles      1
nssm set     MMS-Reporting Start               SERVICE_AUTO_START

:: Nginx (installed at C:\nginx)
nssm install MMS-Nginx "C:\nginx\nginx.exe"
nssm set     MMS-Nginx AppParameters  "-c C:\nginx\conf\nginx.conf"
nssm set     MMS-Nginx AppDirectory   "C:\nginx"
nssm set     MMS-Nginx AppStdout      "C:\mms\logs\nginx-stdout.log"
nssm set     MMS-Nginx AppStderr      "C:\mms\logs\nginx-stderr.log"
nssm set     MMS-Nginx Start          SERVICE_AUTO_START

nssm start MMS-Reporting
nssm start MMS-Backend
nssm start MMS-Nginx

:skip_services

echo.
echo =====================================
echo Deployment completed successfully.
echo =====================================
echo.
echo Next steps:
echo   1. Edit C:\mms\backend\.env and set DB_PASSWORD, JWT_SECRET, and CORS_ORIGIN
echo   2. Install NSSM from https://nssm.cc into C:\Windows\System32
echo   3. Run publish.bat again -- it will register and start MMS-Backend,
echo      MMS-Reporting, and MMS-Nginx as Windows Services (auto-start on boot)
echo.

pause