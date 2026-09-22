# Alerting. Nothing here runs on the droplet: DigitalOcean measures it from the outside
# (the uptime check) and from the metrics agent the droplet resource already installs.
#
# Two different questions are being asked, and they need different instruments:
#
#   * The alert policies below watch the box. They answer "is it about to fall over".
#   * The uptime check watches the site from elsewhere on the internet. It answers "is it
#     serving", which the deploy pipeline never establishes -- `docker compose up -d`
#     returns when a container is created, so a binary that panics a minute later ships
#     green. See deployment/README.md, "A deploy is not verified."
#
# Both are account-level resources with no project association in the API, so unlike the
# droplet they cannot be added to digitalocean_project.playhaus. They will sit outside the
# PlayHaus project in the console. That is expected, not a misconfiguration.

# Memory first: on a 1 GB box it is what actually runs out. The 2 GB swapfile turns the
# first overshoot into a slow minute rather than an outage, which is exactly why this wants
# to be an alert -- swapping is survivable and invisible, and the next one might not be.
resource "digitalocean_monitor_alert" "memory" {
  description = "PlayHaus droplet memory above 90% for 10 minutes"
  type        = "v1/insights/droplet/memory_utilization_percent"
  compare     = "GreaterThan"
  value       = 90
  window      = "10m"
  enabled     = true
  entities    = [digitalocean_droplet.playhaus.id]

  alerts {
    email = [var.alert_email]
  }
}

# A single vCPU pegs during a deploy, an image pull and the nightly prune, all of which are
# fine. Half an hour of it is not, hence the long window rather than a higher threshold.
#
# Note the metric name. There is no v1/insights/droplet/cpu_utilization_percent -- that
# spelling exists only for load balancers, and using it here is a plan-time error.
resource "digitalocean_monitor_alert" "cpu" {
  description = "PlayHaus droplet CPU above 80% for 30 minutes"
  type        = "v1/insights/droplet/cpu"
  compare     = "GreaterThan"
  value       = 80
  window      = "30m"
  enabled     = true
  entities    = [digitalocean_droplet.playhaus.id]

  alerts {
    email = [var.alert_email]
  }
}

# 25 GB, and the only thing holding it back is /etc/cron.daily/docker-prune. If that ever
# stops working the symptom is a deploy failing on `docker compose pull` for no obvious
# reason, which is a miserable thing to debug from the error message alone.
resource "digitalocean_monitor_alert" "disk" {
  description = "PlayHaus droplet disk above 80%"
  type        = "v1/insights/droplet/disk_utilization_percent"
  compare     = "GreaterThan"
  value       = 80
  window      = "5m"
  enabled     = true
  entities    = [digitalocean_droplet.playhaus.id]

  alerts {
    email = [var.alert_email]
  }
}

# The health route rather than the front page, deliberately.
#
# `/` is served by nginx off its own disk with no upstream involved, so it keeps answering
# 200 with the api container stopped -- that asymmetry is the whole of the 502 triage in
# the runbook. /api/v1/health goes caddy -> app -> api and proves all three. It is also the
# one route with no token in front of it, which is what it was built for.
resource "digitalocean_uptime_check" "playhaus" {
  name    = "playhaus-health"
  target  = "https://${var.domain}/api/v1/health"
  type    = "https"
  regions = ["eu_west", "us_east"]
  enabled = true
}

# down_global, so both regions have to agree before this fires. `down` on a single probe
# from one region is a good way to be woken up by someone else's routing problem.
resource "digitalocean_uptime_alert" "down" {
  check_id = digitalocean_uptime_check.playhaus.id
  name     = "playhaus-down"
  type     = "down_global"
  period   = "2m"

  notifications {
    email = [var.alert_email]
  }
}

# Caddy renews about 30 days out and says nothing when it succeeds. This is the backstop
# for renewal having quietly stopped -- the failure mode the ACME account email is also
# meant to catch, from the other side.
#
# The threshold is days remaining. The provider documents it only as "dependent on the
# alert type", so confirm the unit in the console after the first apply.
resource "digitalocean_uptime_alert" "ssl_expiry" {
  check_id   = digitalocean_uptime_check.playhaus.id
  name       = "playhaus-ssl-expiry"
  type       = "ssl_expiry"
  threshold  = 14
  comparison = "less_than"

  notifications {
    email = [var.alert_email]
  }
}
