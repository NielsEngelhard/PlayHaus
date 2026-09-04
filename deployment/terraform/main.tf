# The whole of the PlayHaus infrastructure: one droplet, one address that outlives it, and
# a firewall. Everything above that -- the containers, the certificate, the database -- is
# created on the box itself by cloud-init and by the two GitHub Actions workflows.

# Registered with DigitalOcean rather than only written into cloud-init, because DO injects
# it into root's authorized_keys. That is the break-glass path: if the deploy user or its
# shell is ever broken, root is still reachable.
resource "digitalocean_ssh_key" "admin" {
  name       = "playhaus-admin"
  public_key = var.admin_ssh_public_key
}

resource "digitalocean_droplet" "playhaus" {
  name   = "playhaus"
  image  = "ubuntu-24-04-x64"
  size   = var.droplet_size
  region = var.region

  ssh_keys = [digitalocean_ssh_key.admin.fingerprint]

  # Free metrics and alerting in the DO console. On a box with one gigabyte of RAM the
  # memory graph is the first thing worth looking at when something is wrong.
  monitoring = true
  backups    = var.enable_backups

  user_data = templatefile("${path.module}/cloud-init.yaml.tftpl", {
    admin_ssh_public_key = var.admin_ssh_public_key
    ci_ssh_public_key    = var.ci_ssh_public_key
    domain               = var.domain
    acme_email           = var.acme_email
  })

  tags = ["playhaus", "prod"]

  # Plain Ubuntu with cloud-init rather than the Marketplace "docker-*" image on purpose:
  # the marketplace slug moves with each Ubuntu release, and a stale one surfaces as a
  # confusing plan-time failure. Installing Docker ourselves is pinned to nothing.
  lifecycle {
    # cloud-init runs once, on first boot, and never again. Terraform cannot know that,
    # so an edit to the template -- or a new Ubuntu image under the same slug -- would
    # show up as a replacement. Replacing this droplet destroys its disk, and the disk is
    # where the entire SQLite database lives. Changes to the template are therefore
    # applied by hand over ssh, or by deliberately tainting the droplet once the data has
    # been moved somewhere.
    ignore_changes = [user_data, image]
  }
}

# The address the DNS A records point at. Free while it is attached to a droplet, and it
# is what makes a rebuild possible without touching the registrar -- which matters here,
# because the records for playhaus.site are maintained by hand rather than by Terraform.
resource "digitalocean_reserved_ip" "playhaus" {
  region = var.region
}

resource "digitalocean_reserved_ip_assignment" "playhaus" {
  ip_address = digitalocean_reserved_ip.playhaus.ip_address
  droplet_id = digitalocean_droplet.playhaus.id
}

resource "digitalocean_firewall" "playhaus" {
  name        = "playhaus"
  droplet_ids = [digitalocean_droplet.playhaus.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.ssh_allowed_cidrs
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # HTTP/3, which Caddy serves and modern browsers try first. A missing UDP rule does not
  # break anything visibly -- the browser falls back to TCP -- it just quietly costs a
  # round trip on every first connection.
  inbound_rule {
    protocol         = "udp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Unrestricted outbound: apt, get.docker.com, ghcr.io and Let's Encrypt. A DigitalOcean
  # firewall with no outbound rules blocks everything, which would strand the box after
  # its first reboot.
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# Cosmetic, but it keeps the droplet and its address together in the DO console instead of
# loose in the default project alongside everything else the account ever holds.
resource "digitalocean_project" "playhaus" {
  name        = "PlayHaus"
  description = "PlayHaus web app and API"
  purpose     = "Web Application"
  environment = "Production"

  resources = [
    digitalocean_droplet.playhaus.urn,
    digitalocean_reserved_ip.playhaus.urn,
  ]
}
