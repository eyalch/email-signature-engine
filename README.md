# Email Signature Engine

## Usage

### Prerequisites

- Docker
- Docker Compose

### Running the application

1. Clone the repository
2. Run `docker compose up`
3. Access the application at http://localhost:8080

## Development

### Prerequisites

- Node.js (version specified in `.node-version`)

### Running the application

1. Clone the repository
2. Run `npm install`
3. Copy the `.env.example` file to `.env` and fill in the necessary values (most, if not all, values can be left as is)
4. Run `npm run build:previews` to generate the initial previews
5. Run `npm run dev`
6. Access the application at http://localhost:3000
