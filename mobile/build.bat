@echo off
echo Running Cordova commands...

cd /d %~dp0
call cordova platform rm android
call cordova platform add android
call cordova build android

echo Commands executed successfully.
pause
