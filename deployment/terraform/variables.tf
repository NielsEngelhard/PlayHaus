variable "do_token" {
  description = "DigitalOcean personal access token with read and write scope. Create one at https://cloud.digitalocean.com/account/api/tokens."
  type        = string
  sensitive   = true
}

variable "domain" {
  description = "The domain the site is served on, without a scheme or a trailing slash. Used for the DNS instructions in the outputs and written into the droplet's .env for Caddy."
  type        = string
  default     = "playhaus.site"
}

variable "acme_email" {
  description = "Address Let's Encrypt sends certificate expiry warnings to. Without one the ACME account is anonymous and a renewal that stops working is silent."
  type        = string
}

variable "region" {
  description = "DigitalOcean region slug. ams3 is Amsterdam, which is where the players are."
  type        = string
  default     = "ams3"
}

variable "droplet_size" {
  description = "Droplet size slug. s-1vcpu-1gb is the $6/month box: 1 vCPU, 1 GB RAM, 25 GB SSD. The web bundle is built on a GitHub runner rather than here, so this only ever has to run three small containers."
  type        = string
  default     = "s-1vcpu-1gb"
}

variable "admin_ssh_public_key" {
  description = "Your own SSH public key, verbatim (the contents of ~/.ssh/id_ed25519.pub). Registered with DigitalOcean so root stays reachable as break-glass, and added to the deploy user."
  type        = string
}

variable "ci_ssh_public_key" {
  description = "The public half of a keypair used only by GitHub Actions (ssh-keygen -t ed25519 -C playhaus-ci -f ~/.ssh/playhaus_ci). Kept separate from your own key so revoking CI access does not mean rotating yours."
  type        = string
}

variable "ssh_allowed_cidrs" {
  description = "Who may reach port 22. Left open by default because GitHub Actions runners have no fixed egress range, and narrowing it would mean the deploy could no longer connect. Password auth is disabled on the droplet, so this is key-only either way."
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

variable "enable_backups" {
  description = "DigitalOcean's weekly whole-droplet backups, billed at 20% of the droplet (about $1.20/month). Off by choice. The SQLite database lives on this droplet's disk and there is no other copy of it, so this is the single line that changes that."
  type        = bool
  default     = false
}
