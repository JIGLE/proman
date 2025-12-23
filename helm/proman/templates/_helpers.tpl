{{- define "proman.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "proman.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
