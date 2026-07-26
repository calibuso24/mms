@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "SCRIPT_DIR=%~dp0"
set "DB_HOST=localhost"
set "DB_PORT=5432"
set "DB_NAME=mms"
set "DB_USER=postgres"
set "DB_PASSWORD="
set "PSQL_EXE="
set "PG_ISREADY_EXE="

if not "%~1"=="" set "DB_NAME=%~1"
if not "%~2"=="" set "DB_USER=%~2"
if not "%~3"=="" set "DB_HOST=%~3"
if not "%~4"=="" set "DB_PORT=%~4"

for /f "delims=" %%I in ('where psql 2^>nul') do (
    set "PSQL_EXE=%%~fI"
    goto :found_psql
)

if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" set "PSQL_EXE=C:\Program Files\PostgreSQL\18\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set "PSQL_EXE=C:\Program Files\PostgreSQL\16\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set "PSQL_EXE=C:\Program Files\PostgreSQL\15\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" set "PSQL_EXE=C:\Program Files\PostgreSQL\14\bin\psql.exe"

:found_psql
if not defined PSQL_EXE (
    echo PostgreSQL client "psql" was not found.
    echo Install PostgreSQL or add the bin folder to PATH and try again.
    exit /b 1
)

for /f "delims=" %%I in ('where pg_isready 2^>nul') do (
    set "PG_ISREADY_EXE=%%~fI"
    goto :found_pg_isready
)

if exist "C:\Program Files\PostgreSQL\18\bin\pg_isready.exe" set "PG_ISREADY_EXE=C:\Program Files\PostgreSQL\18\bin\pg_isready.exe"
if exist "C:\Program Files\PostgreSQL\16\bin\pg_isready.exe" set "PG_ISREADY_EXE=C:\Program Files\PostgreSQL\16\bin\pg_isready.exe"
if exist "C:\Program Files\PostgreSQL\15\bin\pg_isready.exe" set "PG_ISREADY_EXE=C:\Program Files\PostgreSQL\15\bin\pg_isready.exe"
if exist "C:\Program Files\PostgreSQL\14\bin\pg_isready.exe" set "PG_ISREADY_EXE=C:\Program Files\PostgreSQL\14\bin\pg_isready.exe"

:found_pg_isready
if not defined PG_ISREADY_EXE set "PG_ISREADY_EXE=%PSQL_EXE%"

if "%DB_PASSWORD%"=="" (
    if defined PGPASSWORD set "DB_PASSWORD=%PGPASSWORD%"
)

set "PGPASSWORD=%DB_PASSWORD%"

echo Deploying SQL files from %SCRIPT_DIR%
echo Database: %DB_NAME% @ %DB_HOST%:%DB_PORT% as %DB_USER%

echo Checking PostgreSQL connection...
"%PG_ISREADY_EXE%" -h "%DB_HOST%" -p "%DB_PORT%" >nul 2>&1
if errorlevel 1 (
    echo PostgreSQL is not accepting connections at %DB_HOST%:%DB_PORT%.
    echo Start the PostgreSQL service or verify the host and port.
    exit /b 1
)

echo Connection OK.

set "DB_EXISTS="
for /f "delims=" %%I in ('"%PSQL_EXE%" -v ON_ERROR_STOP=1 -w -h "%DB_HOST%" -p "%DB_PORT%" -U "%DB_USER%" -d postgres -At -c "SELECT 1 FROM pg_database WHERE datname = ''%DB_NAME%''" 2^>nul') do set "DB_EXISTS=%%I"
if not defined DB_EXISTS (
    echo Creating database %DB_NAME%...
    "%PSQL_EXE%" -v ON_ERROR_STOP=1 -w -h "%DB_HOST%" -p "%DB_PORT%" -U "%DB_USER%" -d postgres -c "CREATE DATABASE \"%DB_NAME%\";" >nul 2>&1
    if errorlevel 1 (
        echo Failed to create database %DB_NAME%.
        echo Check that the PostgreSQL user "%DB_USER%" can create databases.
        exit /b 1
    )
)

for /f "delims=" %%F in ('dir /b /s /o:n "%SCRIPT_DIR%migrations\*.sql" 2^>nul') do (
    echo Applying %%~fF
    "%PSQL_EXE%" -v ON_ERROR_STOP=1 -w -h "%DB_HOST%" -p "%DB_PORT%" -U "%DB_USER%" -d "%DB_NAME%" -f "%%~fF"
    if errorlevel 1 (
        echo Failed while applying %%~fF
        exit /b 1
    )
)

for /f "delims=" %%F in ('dir /b /s /o:n "%SCRIPT_DIR%seeds\*.sql" 2^>nul') do (
    echo Applying %%~fF
    "%PSQL_EXE%" -v ON_ERROR_STOP=1 -w -h "%DB_HOST%" -p "%DB_PORT%" -U "%DB_USER%" -d "%DB_NAME%" -f "%%~fF"
    if errorlevel 1 (
        echo Failed while applying %%~fF
        exit /b 1
    )
)

echo Deployment completed.
endlocal
