@echo off
mode con: cols=120 lines=40
title ╔═══ HyperVoid Quantum Control Center v8.0.0 ═══╗
color 0B
cls

:ascii_art
echo ╔════════════════════════════════════════════════════════════════════════════════════════════════════════╗
echo ║  ██╗  ██╗██╗   ██╗██████╗ ███████╗██████╗ ██╗   ██╗ ██████╗ ██╗██████╗                              ║
echo ║  ██║  ██║╚██╗ ██╔╝██╔══██╗██╔════╝██╔══██╗██║   ██║██╔═══██╗██║██╔══██╗                             ║
echo ║  ███████║ ╚████╔╝ ██████╔╝█████╗  ██████╔╝██║   ██║██║   ██║██║██║  ██║                             ║
echo ║  ██╔══██║  ╚██╔╝  ██╔═══╝ ██╔══╝  ██╔══██╗╚██╗ ██╔╝██║   ██║██║██║  ██║                             ║
echo ║  ██║  ██║   ██║   ██║     ███████╗██║  ██║ ╚████╔╝ ╚██████╔╝██║██████╔╝                             ║
echo ║  ╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚══════╝╚═╝  ╚═╝  ╚═══╝   ╚═════╝ ╚═╝╚═════╝                              ║
echo ║                                                                                                        ║
echo ║                        ▄▄▄     Quantum Messaging System v8.0.0    ▄▄▄                                 ║
echo ║                      ▄█████▄   "Where Reality Meets Quantum"    ▄█████▄                               ║
echo ║                     ████████                                   ████████                                ║
echo ╚════════════════════════════════════════════════════════════════════════════════════════════════════════╝

:cleanup
echo.
echo [■■■■] Initializing Quantum Core...
echo [####] Purging Temporal Anomalies...
netsh int ip reset >nul 2>&1
netsh winsock reset >nul 2>&1

echo [⚡⚡⚡⚡] Collapsing Wave Functions...
taskkill /F /IM python.exe >nul 2>&1

echo [%%%%] Stabilizing Quantum Foam...
timeout /t 3 >nul

:menu
echo.
echo ╔═══════════════════════════════════════════╗
echo ║           QUANTUM CONTROL PANEL           ║
echo ╠═══════════════════════════════════════════╣
echo ║ [1] ⚛ Initialize Quantum Core            ║
echo ║ [2] ⚡ Open Reality Viewport              ║
echo ║ [3] ☢ Spawn Quantum Entity               ║
echo ║ [4] ⚔ Deploy Entity Swarm                ║
echo ║ [5] ⚪ Return to Base Reality             ║
echo ╚═══════════════════════════════════════════╝
echo.

set /p choice="Enter Command (1-5): "

if "%choice%"=="1" (
    call :cleanup
    echo.
    echo [☢☢☢] Initializing Quantum Core...
    start "HyperVoid Server" cmd /k "python server_v6.py"
    timeout /t 2 >nul
    echo [⚡⚡⚡] Stabilizing Visual Matrix...
    start "HyperVoid Visualizer" cmd /k "python quantum_vis_server.py"
    timeout /t 2 >nul
    echo [■■■] Opening Viewport...
    start "" "http://localhost:8770"
    goto menu
)
if "%choice%"=="2" (
    echo [⚡] Opening Viewport...
    start "" "http://localhost:8770"
    goto menu
)
if "%choice%"=="3" (
    echo.
    set /p name="Entity Designation (ENTER for random): "
    set /p duration="Temporal Duration (ENTER for infinite): "
    if "%name%"=="" (
        if "%duration%"=="" (
            echo [☢] Spawning Random Entity...
            start "HyperVoid Client" cmd /k "python client_v6.py"
        ) else (
            echo [☢] Spawning Temporal Entity...
            start "HyperVoid Client" cmd /k "python client_v6.py --duration %duration%"
        )
    ) else (
        if "%duration%"=="" (
            echo [☢] Spawning Named Entity...
            start "HyperVoid Client" cmd /k "python client_v6.py --name %name%"
        ) else (
            echo [☢] Spawning Named Temporal Entity...
            start "HyperVoid Client" cmd /k "python client_v6.py --name %name% --duration %duration%"
        )
    )
    goto menu
)
if "%choice%"=="4" (
    echo.
    set /p count="Swarm Size: "
    set /p duration="Swarm Duration (seconds): "
    
    set /a delay=20/%count%
    if %delay% LSS 1 set delay=1
    
    echo.
    echo [⚔] Initializing Quantum Swarm Protocol...
    echo [⚔] Deploying %count% entities with %delay%ms quantum separation...
    echo.
    
    for /l %%i in (1,1,%count%) do (
        echo [⚔] Entity %%i of %count% materialized...
        start "HyperVoid Test Client %%i" cmd /k "python client_v6.py --name Entity_%%i --duration %duration%"
        timeout /t %delay% >nul
    )
    goto menu
)
if "%choice%"=="5" (
    echo.
    echo [####] Initiating Reality Collapse...
    call :cleanup
    echo [####] Return to Base Reality Complete.
    timeout /t 2 >nul
    exit
)

goto menu