# Kubectl diagnostics helper for TrueNAS/ix-app
# Run this on a machine that has kubectl configured (TrueNAS Shell or local kubeconfig).
# Usage: .\kubectl-diagnostics.ps1 -Namespace ix-app -Deployment proman

param(
  [string]$Namespace = 'ix-app',
  [string]$Deployment = 'proman',
  [string]$Container = 'proman'
)

Write-Host "Namespace: $Namespace" -ForegroundColor Cyan
Write-Host "Deployment: $Deployment" -ForegroundColor Cyan
Write-Host "Container: $Container" -ForegroundColor Cyan

Write-Host "\nDeployment image:" -ForegroundColor Yellow
kubectl -n $Namespace get deployment $Deployment -o jsonpath='{.spec.template.spec.containers[0].image}'

Write-Host "\nPods:" -ForegroundColor Yellow
kubectl -n $Namespace get pods -o wide

$pod = kubectl -n $Namespace get pods --no-headers | Select-String 'Running|CrashLoopBackOff|ImagePullBackOff' -NotMatch | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1
if (-not $pod) {
  Write-Host "No running pod found; showing all pods and events" -ForegroundColor Red
  kubectl -n $Namespace get pods
} else {
  Write-Host "\nSelected pod: $pod" -ForegroundColor Green
  Write-Host "\nDescribe pod (events):" -ForegroundColor Yellow
  kubectl -n $Namespace describe pod $pod

  Write-Host "\nLogs (container $Container):" -ForegroundColor Yellow
  kubectl -n $Namespace logs $pod -c $Container --tail=200 || kubectl -n $Namespace logs $pod --tail=200

  Write-Host "\nHealth & version inside pod (if available):" -ForegroundColor Yellow
  kubectl -n $Namespace exec -it $pod -- sh -c "wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || echo HEALTH_FAIL; cat /app/public/version.json || echo NO_VERSION"
}

Write-Host "\nRollout status (last 60s):" -ForegroundColor Yellow
kubectl -n $Namespace rollout status deployment/$Deployment --timeout=60s

Write-Host "\nDone." -ForegroundColor Cyan
