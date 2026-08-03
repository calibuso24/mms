@echo off
setlocal

echo =====================================
echo Building MMS...
echo =====================================

call npm --prefix mms-frontend run build
if errorlevel 1 exit /b 1

call npm --prefix mms-backend run build
if errorlevel 1 exit /b 1

pushd reporting-service
call mvn clean package
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

:: Copy .env if it exists
if exist mms-backend\.env.production (
    copy mms-backend\.env.production C:\mms\backend\.env
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

copy reporting-service\target\*.jar C:\mms\reporting\

echo.
echo =====================================
echo Deployment completed successfully.
echo =====================================

pause