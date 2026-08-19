FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt requirements-dev.txt ./
RUN pip install -r requirements.txt -r requirements-dev.txt

COPY . .
CMD ["python", "app.py"]
