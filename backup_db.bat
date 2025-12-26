@echo off
setlocal

:: ----------------------------------------------------------------
:: SteriTrack PostgreSQL Backup Script
:: ----------------------------------------------------------------

:: Load environment variables from .env file if possible, else use defaults
:: For simplicity in this batch file, we set defaults matching the project
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=postgres
set DB_NAME=steritrack
set BACKUP_DIR=backups

:: Create backup directory if it doesn't exist
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Generate Timestamp for filename (YYYYMMDD_HHMMSS)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

set FILENAME=%BACKUP_DIR%\steritrack_backup_%TIMESTAMP%.sql

echo ==========================================
echo Starting Backup for %DB_NAME%
echo Host: %DB_HOST%
echo User: %DB_USER%
echo File: %FILENAME%
echo ==========================================

:: CHECK FOR PG_DUMP
where pg_dump >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] 'pg_dump' command not found!
    echo.
    echo Please make sure PostgreSQL is installed and 'bin' folder is in your PATH.
    echo Example: C:\Program Files\PostgreSQL\16\bin
    echo.
    pause
    exit /b 1
)

:: Run pg_dump
:: -F p (Plain text SQL script) --no-owner --no-privileges (Cleaner restore)
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% --no-owner --no-privileges -F p -f "%FILENAME%" "%DB_NAME%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Backup created successfully!
    echo Location: %FILENAME%
) else (
    echo.
    echo [ERROR] Backup failed. Check credentials or connection.
    echo Hint: You may need to set PGPASSWORD environment variable or use .pgpass
)

endlocal
pause
