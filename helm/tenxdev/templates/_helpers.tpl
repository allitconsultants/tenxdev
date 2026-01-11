{{/*
Expand the name of the chart.
*/}}
{{- define "tenxdev.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "tenxdev.fullname" -}}
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
{{- define "tenxdev.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "tenxdev.labels" -}}
helm.sh/chart: {{ include "tenxdev.chart" . }}
{{ include "tenxdev.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "tenxdev.selectorLabels" -}}
app.kubernetes.io/name: {{ include "tenxdev.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "tenxdev.frontend.labels" -}}
{{ include "tenxdev.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "tenxdev.frontend.selectorLabels" -}}
{{ include "tenxdev.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Backend labels
*/}}
{{- define "tenxdev.backend.labels" -}}
{{ include "tenxdev.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "tenxdev.backend.selectorLabels" -}}
{{ include "tenxdev.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "tenxdev.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "tenxdev.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Documents service labels
*/}}
{{- define "tenxdev.documents.labels" -}}
{{ include "tenxdev.labels" . }}
app.kubernetes.io/component: documents
{{- end }}

{{/*
Documents service selector labels
*/}}
{{- define "tenxdev.documents.selectorLabels" -}}
{{ include "tenxdev.selectorLabels" . }}
app.kubernetes.io/component: documents
{{- end }}

{{/*
Notifications service labels
*/}}
{{- define "tenxdev.notifications.labels" -}}
{{ include "tenxdev.labels" . }}
app.kubernetes.io/component: notifications
{{- end }}

{{/*
Notifications service selector labels
*/}}
{{- define "tenxdev.notifications.selectorLabels" -}}
{{ include "tenxdev.selectorLabels" . }}
app.kubernetes.io/component: notifications
{{- end }}

{{/*
Portal labels
*/}}
{{- define "tenxdev.portal.labels" -}}
{{ include "tenxdev.labels" . }}
app.kubernetes.io/component: portal
{{- end }}

{{/*
Portal selector labels
*/}}
{{- define "tenxdev.portal.selectorLabels" -}}
{{ include "tenxdev.selectorLabels" . }}
app.kubernetes.io/component: portal
{{- end }}
