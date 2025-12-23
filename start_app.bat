@echo off
cd /d "%~dp0"
echo Launching InfraModeler Systems...
start backend\start_server.bat
start frontend\start_ui.bat
exit

