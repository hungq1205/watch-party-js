# API gateway
start cmd.exe /K "cd api-gateway && node app.js"

# User service
start cmd.exe /K "cd user-service && node app.js"

# Message service
start cmd.exe /K "cd message-service && node app.js"

# Movie service
start cmd.exe /K "cd movie-service && node app.js"

# Frontend
start cmd.exe /K "cd frontend && npm run dev"