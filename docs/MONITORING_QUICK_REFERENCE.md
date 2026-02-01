# Monitoring Quick Reference

**For Operations Teams**

## Health Check Endpoints

### Check if Application is Healthy
```bash
curl https://proman.example/api/health
```
**Expected**: HTTP 200, `"status": "ok"`  
**Unhealthy**: HTTP 503

### Check Database Performance
```bash
curl https://proman.example/api/health/db
```
**Watch**: `query_latency_ms` should be < 100ms  
**Alert if**: latency > 500ms or status != "healthy"

### Check Email Service Configuration
```bash
curl https://proman.example/api/health/email
```
**Expected**: `"configured": true`  
**Alert if**: `"configured": false`

### Get Prometheus Metrics
```bash
# Prometheus format (for scraping)
curl https://proman.example/api/metrics

# JSON format (for debugging)
curl -H "Accept: application/json" https://proman.example/api/metrics
```

---

## Quick Troubleshooting

### Issue: Health Check Returns 503

**Check**:
1. Is the database file accessible?
2. Are database connections exhausted?
3. Check logs: `journalctl -u proman -n 50`

**Action**:
- Restart application: `systemctl restart proman`
- If persists, check disk space: `df -h`

### Issue: High Database Latency

**Check**:
```bash
curl https://proman.example/api/health/db | jq '.database.metrics.query_latency_ms'
```

**Thresholds**:
- Normal: < 50ms
- Warning: 100-500ms
- Critical: > 500ms

**Action**:
- Check VACUUM status (SQLite maintenance)
- Review slow query logs
- Check disk I/O: `iostat -x 1 10`

### Issue: Email Not Configured

**Check**:
```bash
curl https://proman.example/api/health/email | jq '.configured'
```

**Action**:
- Verify `SENDGRID_API_KEY` environment variable set
- Verify `FROM_EMAIL` environment variable set
- Restart application to reload config

---

## Alert Response Procedures

### P1 - Critical (Immediate Response)

**Alert**: "Health check failing for 5+ minutes"
1. Check endpoint manually: `curl https://proman.example/api/health`
2. Review logs for errors
3. Restart service if needed
4. Page on-call engineer if restart fails

**Alert**: "Database connection failed"
1. Check database file permissions
2. Check disk space
3. Review connection pool exhaustion
4. Restart if needed

### P2 - High (Response within 1 hour)

**Alert**: "Email service not configured"
1. Verify environment variables
2. Restart application
3. Test email sending: check `/api/email/logs`

**Alert**: "High database latency (>500ms)"
1. Check for long-running queries
2. Run VACUUM if needed
3. Monitor for improvement

### P3 - Medium (Response within 4 hours)

**Alert**: "Error rate elevated (>5%)"
1. Review error logs
2. Check for pattern (specific endpoint/feature)
3. Create bug ticket

### P4 - Low (Response within 24 hours)

**Alert**: "Metrics collection gap"
1. Check Prometheus scraping status
2. Verify network connectivity
3. Review firewall rules

---

## Monitoring Tool URLs

- **Uptime Monitor**: https://uptimerobot.com/dashboard
- **Prometheus**: https://prometheus.example:9090
- **Grafana Dashboards**: https://grafana.example/d/proman
- **Sentry Errors**: https://sentry.io/organizations/your-org/issues/
- **Logs**: https://logtail.com/team/proman

---

## Emergency Contacts

- **On-Call Rotation**: PagerDuty schedule
- **Slack Channel**: #proman-alerts
- **Email**: ops-team@example.com

---

## Common Commands

### Check Application Status
```bash
systemctl status proman
```

### View Recent Logs
```bash
journalctl -u proman -f
```

### Restart Application
```bash
systemctl restart proman
```

### Check Metrics
```bash
# Current uptime
curl -s https://proman.example/api/metrics | grep process_uptime

# HTTP request count
curl -s https://proman.example/api/metrics | grep http_requests_total

# Email success rate
curl -s https://proman.example/api/metrics | grep email_
```

### Test Database Connection
```bash
sqlite3 /var/lib/proman/proman.db "SELECT COUNT(*) FROM Property;"
```

---

## Maintenance Tasks

### Daily
- ✅ Review alert history
- ✅ Check uptime percentage

### Weekly
- ✅ Review error trends in Sentry
- ✅ Check database size growth
- ✅ Verify backup restoration (test)

### Monthly
- ✅ Review and tune alert thresholds
- ✅ Update runbooks based on incidents
- ✅ SQLite VACUUM (if not automated)

---

**Last Updated**: February 2026  
**Documentation**: See [MONITORING_SETUP.md](./MONITORING_SETUP.md) for complete guide
