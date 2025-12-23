@echo off
cd /d "%~dp0"
title Backend Brain
echo Starting Python...
py -3.12 -m uvicorn main:app --reload --host 0.0.0.0
pause
