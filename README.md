# Scapegoat Project Structure

This project is divided into two main parts:
- `backend/`: A Go-based API for scanning and analyzing SBOMs.
- `frontend/`: A React + TypeScript dashboard for visualizing the results.

## Tech Stack
- **Backend:** Go 1.25, Gin, GORM, PostgreSQL, Redis.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, React Router.
- **Infrastructure:** Docker, Docker Compose.

## Getting Started

### Prerequisites
- Docker and Docker Compose (V2)

### Running the application
1. Clone the repository.
2. Run the following command in the root directory:
   ```bash
   docker compose up --build
   ```
3. The frontend will be available at `http://localhost:5173`.
4. ZITADEL will be available at `http://localhost:8080`.
5. The backend API will be available at `http://localhost:8081`.

### Manual Testing
You can test the SBOM upload by uploading any valid CycloneDX, SPDX (JSON), or Syft JSON file through the UI.

### Unit Tests
To run backend tests:
```bash
cd backend
go test ./...
```
