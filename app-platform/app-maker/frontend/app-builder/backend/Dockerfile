# Backend - Django
FROM python:3.10 AS backend
WORKDIR /app
COPY app-maker/backend /app/backend
RUN pip install -r /app/backend/requirements.txt

# Frontend - React
FROM node:18 AS frontend
WORKDIR /app
COPY app-maker/frontend/app-builder /app/frontend
RUN npm install
RUN npm run build
CMD ["bash"]
