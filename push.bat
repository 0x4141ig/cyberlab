@echo off
title CEH Walkthrough - Push to GitHub
cd /d "%~dp0"
echo ====================================================
echo   CEH v13 Lab Platform - Push Changes to GitHub
echo ====================================================
echo.
git status --short
echo.
set /p msg="Enter commit message (Press Enter for 'Update CEH Labs'): "
if "%msg%"=="" set msg=Update CEH Labs
echo.
echo [1/3] Staging files...
git add .
echo [2/3] Committing changes...
git commit -m "%msg%"
echo [3/3] Pushing to GitHub (origin/main)...
git push -u origin main
echo.
echo ====================================================
echo   All changes pushed to https://github.com/0x4141ig/cyberlab
echo ====================================================
echo.
pause
