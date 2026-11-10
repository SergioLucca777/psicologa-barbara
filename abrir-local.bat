@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PORT=8080

echo.
echo  Landing Barbara Martini - servidor local na porta %PORT%
echo  Para parar: feche esta janela ou pressione Ctrl+C
echo.

where py >nul 2>&1
if %errorlevel%==0 (
  start "" cmd /c "timeout /t 2 >nul & start http://localhost:%PORT%/"
  py -m http.server %PORT%
  goto :fim
)

where python >nul 2>&1
if %errorlevel%==0 (
  start "" cmd /c "timeout /t 2 >nul & start http://localhost:%PORT%/"
  python -m http.server %PORT%
  goto :fim
)

echo  Python nao encontrado.
echo.
echo  Opcao 1 - instalar Python (python.org, marcar "Add python.exe to PATH") e rodar de novo.
echo  Opcao 2 - no VS Code: instalar a extensao "Live Server", clicar com o botao direito
echo             em index.html e escolher "Open with Live Server".
echo.
pause

:fim
