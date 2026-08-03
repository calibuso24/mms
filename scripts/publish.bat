@echo off
echo =====================================
echo Building MMS...
echo =====================================

call npm --prefix mms-frontend run build
if errorlevel 1 exit /b 1

call npm --prefix mms-backend run build
if errorlevel 1 exit /b 1

cd reporting-service
call mvn clean package
if errorlevel 1 exit /b 1
cd ..

echo =====================================
echo Deploying...
echo =====================================

:: Frontend
if exist C:\mms\frontend rd /s /q C:\mms\frontend
mkdir C:\mms\frontend
xcopy mms-frontend\dist\* C:\mms\frontend\ /E /I /Y

:: Backend
if exist C:\mms\backend rd /s /q C:\mms\backend
mkdir C:\mms\backend
xcopy mms-backend\dist\* C:\mms\backend\ /E /I /Y
copy mms-backend\package*.json C:\mms\backend\

:: Reporting
mkdir C:\mms\reporting 2>nul
copy reporting-service\target\*.jar C:\mms\reporting\

echo.
echo Deployment completed.
pause
