@echo off
echo ========================================
echo    Firebase Admin User Creator
echo ========================================
echo.
echo This will create an admin user with:
echo Email: admin@admin.com
echo Password: Admin@123456
echo.
echo Press any key to continue...
pause > nul

echo.
echo Opening admin creator in your browser...
echo.

start create-admin.html

echo.
echo ========================================
echo INSTRUCTIONS:
echo ========================================
echo 1. A browser window should open
echo 2. Click the "Create Admin User" button
echo 3. Wait for the success message
echo 4. Use these credentials to login:
echo.
echo    Email: admin@admin.com
echo    Password: Admin@123456
echo.
echo ========================================
echo.
echo If the browser didn't open, manually open:
echo create-admin.html
echo.
pause
