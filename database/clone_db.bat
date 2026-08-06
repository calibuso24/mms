@echo off
setlocal EnableExtensions

REM ==========================================================
REM PostgreSQL 18 Configuration
REM ==========================================================
set "PGHOST=localhost"
set "PGPORT=5432"
set "PGUSER=postgres"

REM Set password here if required
REM Example:
REM set "PGPASSWORD=MyPassword123"
set "PGPASSWORD="

if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" set "PSQL_EXE=C:\Program Files\PostgreSQL\18\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\16\bin\psql.exe" set "PSQL_EXE=C:\Program Files\PostgreSQL\16\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\15\bin\psql.exe" set "PSQL_EXE=C:\Program Files\PostgreSQL\15\bin\psql.exe"
if exist "C:\Program Files\PostgreSQL\14\bin\psql.exe" set "PSQL_EXE=C:\Program Files\PostgreSQL\14\bin\psql.exe"


REM Database to drop
set "TARGET_DB=mms"


REM ==========================================================
REM Validate psql.exe
REM ==========================================================
if not exist "%PSQL_EXE%" (
    echo ERROR: Cannot find PostgreSQL client:
    echo %PSQL_EXE%
    pause
    exit /b 1
)


echo.
echo ============================================
echo PostgreSQL 18 Database Drop Utility
echo ============================================
echo Target Database: %TARGET_DB%
echo.


REM ==========================================================
REM Disable new connections
REM ==========================================================
echo Disabling new connections...

"%PSQL_EXE%" ^
-h "%PGHOST%" ^
-p "%PGPORT%" ^
-U "%PGUSER%" ^
-d postgres ^
-v ON_ERROR_STOP=1 ^
-c "ALTER DATABASE ""%TARGET_DB%"" WITH ALLOW_CONNECTIONS false;"

if errorlevel 1 (
    echo ERROR: Cannot disable connections.
    pause
    exit /b 1
)


REM ==========================================================
REM Terminate existing sessions
REM ==========================================================
echo.
echo Terminating active connections...

"%PSQL_EXE%" ^
-h "%PGHOST%" ^
-p "%PGPORT%" ^
-U "%PGUSER%" ^
-d postgres ^
-v ON_ERROR_STOP=1 ^
-c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='%TARGET_DB%' AND pid <> pg_backend_pid();"

if errorlevel 1 (
    echo ERROR: Cannot terminate connections.
    pause
    exit /b 1
)


REM ==========================================================
REM Drop database
REM ==========================================================
echo.
echo Dropping database %TARGET_DB%...

"%PSQL_EXE%" ^
-h "%PGHOST%" ^
-p "%PGPORT%" ^
-U "%PGUSER%" ^
-d postgres ^
-v ON_ERROR_STOP=1 ^
-c "DROP DATABASE ""%TARGET_DB%"";"

if errorlevel 1 (
    echo ERROR: Cannot drop database.
    pause
    exit /b 1
)


echo.
echo ============================================
echo Database %TARGET_DB% dropped successfully.
echo ============================================

REM ==========================================================
REM CLONING ICPWI
REM ==========================================================
echo.
echo Cloning database %TARGET_DB%...

"%PSQL_EXE%" ^
-h "%PGHOST%" ^
-p "%PGPORT%" ^
-U "%PGUSER%" ^
-d postgres ^
-v ON_ERROR_STOP=1 ^
-c "CREATE DATABASE ""%TARGET_DB%"" WITH TEMPLATE icpwi OWNER postgres;"

"%PSQL_EXE%" ^
-h "%PGHOST%" ^
-p "%PGPORT%" ^
-U "%PGUSER%" ^
-d "%TARGET_DB%" ^
-v ON_ERROR_STOP=1 ^
-f "move_to_source.sql"

if errorlevel 1 (
    echo ERROR: Cannot clone database.
    pause
    exit /b 1
)

echo.
echo ============================================
echo Database %TARGET_DB% cloned successfully.
echo ============================================

pause