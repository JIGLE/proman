{{/*
Expand the name of the chart.
*/}}
{{- define "proman.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "proman.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "proman.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "proman.labels" -}}
helm.sh/chart: {{ include "proman.chart" . }}
{{ include "proman.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "proman.selectorLabels" -}}
app.kubernetes.io/name: {{ include "proman.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "proman.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "proman.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Render the structured env block used by both init and main containers.
Emits DATABASE_URL and NEXTAUTH_URL as literal values, and
NEXTAUTH_SECRET / INIT_SECRET from the auto-generated K8s Secret.
Any extra entries in .Values.env are appended at the end.
*/}}
{{- define "proman.env" -}}
- name: DATABASE_URL
  value: {{ .Values.app.databaseUrl | quote }}
- name: NEXTAUTH_URL
  value: {{ .Values.app.nextauthUrl | quote }}
- name: NEXTAUTH_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "proman.fullname" . }}-secrets
      key: NEXTAUTH_SECRET
- name: INIT_SECRET
  valueFrom:
    secretKeyRef:
      name: {{ include "proman.fullname" . }}-secrets
      key: INIT_SECRET
{{- with .Values.env }}
{{ toYaml . }}
{{- end }}
{{- end }}