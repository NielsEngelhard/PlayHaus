output "reserved_ip" {
  description = "The address to point DNS at. Survives a droplet rebuild."
  value       = digitalocean_reserved_ip.playhaus.ip_address
}

output "droplet_ipv4" {
  description = "The droplet's own address. Useful for ssh before the reserved IP is attached, and for telling the two apart when debugging."
  value       = digitalocean_droplet.playhaus.ipv4_address
}

output "ssh_command" {
  description = "How to get onto the box."
  value       = "ssh deploy@${digitalocean_reserved_ip.playhaus.ip_address}"
}

output "github_secrets" {
  description = "What to paste into Settings -> Secrets and variables -> Actions."
  value       = <<-EOT
    Secret   DEPLOY_HOST      ${digitalocean_reserved_ip.playhaus.ip_address}
    Secret   DEPLOY_SSH_KEY   <contents of the private key whose public half is ci_ssh_public_key>
    Variable PUBLIC_ORIGIN    https://${var.domain}
  EOT
}

# Printed rather than created: the nameservers for this domain stay at the registrar, so
# Terraform has no way to write these itself.
output "dns_records" {
  description = "The A records to create at your registrar."
  value       = <<-EOT

    Create these at your DNS provider for ${var.domain}, then wait for them to resolve
    before the first deploy -- Caddy's certificate request fails while the name does not
    yet point here, and Let's Encrypt rate-limits repeated failures.

      TYPE  NAME   VALUE                                              TTL
      A     @      ${digitalocean_reserved_ip.playhaus.ip_address}    300
      A     www    ${digitalocean_reserved_ip.playhaus.ip_address}    300
      A     stats  ${digitalocean_reserved_ip.playhaus.ip_address}    300

    `stats` serves the Beszel dashboard. Caddy asks for its certificate the moment the
    site block loads, so create the record before the deploy that ships it -- not after.

    Check with:  dig +short ${var.domain}
  EOT
}
