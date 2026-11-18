# CareCircle deployment to Google Cloud Run

These commands assume you already have a Google Cloud project and billing enabled.

## 1) Set variables

```bash
export PROJECT_ID="your-gcp-project-id"
export REGION="us-central1"
export SERVICE_NAME="carecircle"
export IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/carecircle/${SERVICE_NAME}"
```

## 2) Create the Artifact Registry repository

```bash
gcloud services enable artifactregistry.googleapis.com run.googleapis.com cloudbuild.googleapis.com

gcloud artifacts repositories create carecircle \
  --repository-format=docker \
  --location=${REGION} \
  --description="CareCircle container images"
```

## 3) Build and push the app container

```bash
gcloud builds submit \
  --tag ${IMAGE}:$(git rev-parse --short HEAD) \
  .
```

## 4) Deploy to Cloud Run

```bash
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE}:$(git rev-parse --short HEAD) \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 5 \
  --set-env-vars NODE_ENV=production,PORT=8080,APP_URL=https://$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)' 2>/dev/null || echo "${SERVICE_NAME}-${REGION}.a.run.app"),CLIENT_ORIGIN=https://$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)' 2>/dev/null || echo "${SERVICE_NAME}-${REGION}.a.run.app"),GOOGLE_CLOUD_PROJECT=${PROJECT_ID},ENABLE_CRON=false \
  --set-secrets JWT_SECRET=carecircle-jwt-secret:latest,INTERNAL_SCHEDULER_SECRET=carecircle-scheduler-secret:latest,GEMINI_API_KEY=carecircle-gemini-key:latest,SMTP_HOST=carecircle-smtp-host:latest,SMTP_USER=carecircle-smtp-user:latest,SMTP_PASS=carecircle-smtp-pass:latest
```

## 5) Verify

```bash
gcloud run services describe ${SERVICE_NAME} --region ${REGION}
```

Then confirm the app is live:

```bash
curl https://$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(status.url)' | sed 's#https://##')/healthz
```

Also check `/readyz` to verify Firestore connectivity. Do not treat `/healthz` alone as proof that persistent storage is ready.

## Reminder scheduling limitation

Keep `ENABLE_CRON=false` on Cloud Run. Cloud Run may run multiple instances, and the current in-process cron has no distributed lease, so enabling it can duplicate reminders. The authenticated endpoint is `POST /api/internal/run-reminders`; its `X-Scheduler-Secret` must be protected and supplied by a separately configured scheduler. Before enabling production reminders, verify scheduler authentication, single-run/duplicate prevention, retry behavior, timezone handling, recipient addresses, and actual SMTP delivery. The current repository does not establish those guarantees.

## Local Docker smoke test

```bash
docker build -t carecircle:local .
docker run --rm -p 8080:8080 --env-file .env.example -e NODE_ENV=development carecircle:local
```
