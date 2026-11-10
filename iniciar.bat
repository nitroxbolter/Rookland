@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 24 ou superior.
  pause
  exit /b 1
)
echo Verificando servicos anteriores do RookLand...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$targets = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 3001, 8080 } | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($processId in $targets) { $process = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $processId) -ErrorAction SilentlyContinue; if ($process.CommandLine -match 'server[\/]dist[\/]index\.mjs|scripts[\/]serve-web\.mjs|scripts[\/]run\.mjs|vite(?:\.js)?\s+--config\s+web[\/]vite\.config\.ts') { Write-Host ('Encerrando servico RookLand PID ' + $processId); Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue } }; Start-Sleep -Seconds 1; $busy = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 3001, 8080 }; if ($busy) { Write-Host 'Nao foi possivel liberar as portas 3001 e 8080. Feche o programa que esta usando essas portas.'; exit 2 }"
if errorlevel 1 goto :erro
if not exist node_modules\mysql2\package.json (
  call npm ci
  if errorlevel 1 goto :erro
)
call npm run build
if errorlevel 1 goto :erro
echo Acesse http://127.0.0.1:8080 no navegador.
call npm start
pause
exit /b
:erro
echo Falha ao preparar o jogo. Consulte o erro acima.
pause
exit /b 1
