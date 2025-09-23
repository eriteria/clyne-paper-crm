# Restart backend
fly scale count 2 --app clyne-paper-crm-backend

# Restart frontend  
fly scale count 2 --app clyne-paper-crm-frontend

# Restart database
fly machine start 683d594ad3d708 --app clyne-paper-crm-db