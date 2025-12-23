@echo off
cd /d "%~dp0"
title Frontend Face
echo Starting React...
npm run dev -- --host
pause
