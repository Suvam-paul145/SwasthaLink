# Contributing to SwasthaLink

Thank you for your interest in contributing to **SwasthaLink**.

## How to contribute

- **Backend (FastAPI / Python)**
  - Backend code lives in the `backend/` directory.
  - Before you start, create a virtual environment and install dependencies:
    - Activate your venv.
    - Run `pip install -r backend/requirements.txt`.
  - See `backend/LIBRARY.md` for an overview of the main Python libraries used.

- **Frontend (React / Vite)**
  - Frontend code lives in the `src/` directory.
  - Install Node.js dependencies with your package manager, then run the Vite dev server as documented in `README.md`.

## Coding guidelines

- Aim to keep functions small and focused.
- Prefer descriptive variable and function names over comments.
- When adding a new external dependency, include a short note in:
  - `backend/LIBRARY.md` for backend libraries.
  - `COMPONENTS_GUIDE.md` or `README.md` for significant frontend additions.

## Git workflow

- Create a feature branch from `main`.
- Make your changes with clear commit messages.
- Keep commits logically grouped and easy to review.

## Reporting issues

If you find a bug or have an idea for an improvement:

- Clearly describe the problem or feature request.
- Include steps to reproduce if it’s a bug.
- Mention whether it affects the backend, frontend, or both.

This document is intentionally short so new contributors can get started quickly. Feel free to extend it as the project grows.