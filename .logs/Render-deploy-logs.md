2026-08-29T15:35:02.440979544Z #27 [runtime  9/12] COPY --from=frontend-builder /app/frontend/.next/static /app/frontend/.next/static
2026-08-29T15:35:02.440981343Z #27 DONE 0.0s
2026-08-29T15:35:02.440982828Z 
2026-08-29T15:35:02.440984522Z #28 [runtime 10/12] COPY --from=frontend-builder /app/frontend/public /app/frontend/public
2026-08-29T15:35:02.440985892Z #28 DONE 0.0s
2026-08-29T15:35:02.440987128Z 
2026-08-29T15:35:02.440988715Z #29 [runtime 11/12] COPY scripts/container-entrypoint.sh /app/scripts/container-entrypoint.sh
2026-08-29T15:35:02.554013015Z #29 DONE 0.0s
2026-08-29T15:35:02.55402828Z 
2026-08-29T15:35:02.554030485Z #30 [runtime 12/12] RUN chmod +x /app/scripts/container-entrypoint.sh
2026-08-29T15:35:02.554031924Z #30 DONE 0.1s
2026-08-29T15:35:02.705323112Z 
2026-08-29T15:35:02.705333511Z #31 exporting to image
2026-08-29T15:35:02.705335062Z #31 exporting layers
2026-08-29T15:35:03.684968875Z #31 exporting layers 1.1s done
2026-08-29T15:35:03.83880073Z #31 pushing layers
2026-08-29T15:35:07.522341134Z #31 pushing layers 3.8s done
2026-08-29T15:35:07.683395306Z #31 DONE 5.1s
2026-08-29T15:35:07.683404319Z 
2026-08-29T15:35:07.68340616Z #32 exporting cache to registry
2026-08-29T15:35:07.683408256Z #32 preparing build cache for export
2026-08-29T15:35:27.280494984Z #32 sending cache export
2026-08-29T15:35:35.235520958Z #32 sending cache export 8.0s done
2026-08-29T15:35:35.235550481Z #32 DONE 31.5s
2026-08-29T15:35:36.090918958Z ==> Deploying...
2026-08-29T15:35:36.202122304Z ==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
2026-08-29T15:35:42.604777259Z Starting backend on 127.0.0.1:8000...
2026-08-29T15:35:42.605130479Z Waiting for backend to be ready...
2026-08-29T15:36:06.397159821Z INFO:     Started server process [8]
2026-08-29T15:36:06.397193432Z INFO:     Waiting for application startup.
2026-08-29T15:36:06.397198322Z INFO:     Application startup complete.
2026-08-29T15:36:06.491972994Z INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
2026-08-29T15:36:07.293503101Z INFO:     127.0.0.1:55838 - "HEAD / HTTP/1.1" 405 Method Not Allowed
2026-08-29T15:36:08.89928887Z INFO:     127.0.0.1:40398 - "GET /health HTTP/1.1" 200 OK
2026-08-29T15:36:09.001180425Z Backend is ready.
2026-08-29T15:36:09.001222796Z Starting frontend on port 3000...
2026-08-29T15:36:09.001610626Z Both services started. Monitoring processes...
2026-08-29T15:36:10.629133903Z   ▲ Next.js 14.2.35
2026-08-29T15:36:10.629486502Z   - Local:        http://localhost:3000
2026-08-29T15:36:10.629503023Z   - Network:      http://0.0.0.0:3000
2026-08-29T15:36:10.629629596Z 
2026-08-29T15:36:10.629697218Z  ✓ Starting...
2026-08-29T15:36:11.005333503Z  ✓ Ready in 499ms
2026-08-29T15:36:13.100864681Z  ⚠ metadataBase property in metadata export is not set for resolving social open graph or twitter images, using "http://localhost:3000". See https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase
2026-08-29T15:36:42.314528522Z ==> Continuing to scan for open port 8000 (from PORT environment variable)...
2026-08-29T15:37:43.226095504Z ==> Continuing to scan for open port 8000 (from PORT environment variable)...
2026-08-29T15:38:44.012684068Z ==> Continuing to scan for open port 8000 (from PORT environment variable)...
2026-08-29T15:39:44.864171126Z ==> Continuing to scan for open port 8000 (from PORT environment variable)...
2026-08-29T15:40:45.741611842Z ==> Continuing to scan for open port 8000 (from PORT environment variable)...
2026-08-29T15:41:21.25979641Z ==> Port scan timeout reached, failed to detect open port 8000 from PORT environment variable. Bind your service to port 8000 or update the PORT environment variable to the correct port.