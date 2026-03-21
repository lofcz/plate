@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File scripts\sync-upstream.ps1
