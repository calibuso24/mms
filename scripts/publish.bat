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
:: Nginx
:: ----------------------------

mkdir C:\mms\nginx 2>nul
mkdir C:\mms\nginx\conf 2>nul
mkdir C:\mms\nginx\logs 2>nul
mkdir C:\mms\nginx\temp 2>nul

copy scripts\nginx.conf C:\mms\nginx\conf\nginx.conf /Y

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
:: Startup scripts
:: ----------------------------

(
echo @echo off
echo cd /d C:\mms\backend
echo node dist/index.js
) > C:\mms\scripts\start-backend.bat

(
echo @echo off
echo set REPORTS_BASE_DIR=C:\mms\reporting\reports
echo set REPORT_DB_HOST=localhost
echo set REPORT_DB_PORT=5432
echo set REPORT_DB_NAME=mms
echo set REPORT_DB_USER=postgres
echo set REPORT_DB_PASSWORD=
echo java -jar C:\mms\reporting\*.jar
) > C:\mms\scripts\start-reporting.bat

echo.
echo =====================================
echo Deployment completed successfully.
echo =====================================
echo.
echo Next steps:
echo   1. Edit C:\mms\backend\.env and set DB_PASSWORD and CORS_ORIGIN
echo   2. Edit C:\mms\scripts\start-reporting.bat and set REPORT_DB_PASSWORD
echo   3. Copy nginx.exe and its bundled folders into C:\mms\nginx\
echo   4. Run: C:\mms\nginx\nginx.exe -c C:\mms\nginx\conf\nginx.conf
echo   5. Run: C:\mms\scripts\start-backend.bat
echo   6. Run: C:\mms\scripts\start-reporting.bat
echo.

pause