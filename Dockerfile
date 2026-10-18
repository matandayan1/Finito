FROM python:3.12-slim
WORKDIR /app
COPY server.py ./
COPY workforce*.py ./
COPY private/base44-exports ./private/base44-exports
COPY original-apps/finito/dist ./original-apps/finito/dist
COPY original-apps/academy/dist ./original-apps/academy/dist
COPY original-apps/hostlink/dist ./original-apps/hostlink/dist
EXPOSE 10000
CMD ["python", "server.py"]
